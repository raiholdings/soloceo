import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface ProjectInput {
  name?: string;
  description?: string;
  instructions?: string;
  color?: string;
  links?: Record<string, unknown>;
}

/** Dự án của CEO — folder nhẹ gom chat + ngữ cảnh, scope theo org. */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.project.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { threads: true } } },
    });
  }

  async one(orgId: string, id: string) {
    const p = await this.prisma.project.findUnique({
      where: { id },
      include: { threads: { orderBy: { createdAt: "desc" }, take: 200 } },
    });
    if (!p || p.orgId !== orgId) throw new NotFoundException("Không tìm thấy dự án");
    return p;
  }

  create(orgId: string, dto: ProjectInput) {
    return this.prisma.project.create({
      data: {
        orgId,
        name: (dto.name ?? "Dự án mới").slice(0, 120),
        description: dto.description ?? null,
        instructions: dto.instructions ?? null,
        color: dto.color ?? null,
        links: (dto.links ?? {}) as never,
      },
    });
  }

  async update(orgId: string, id: string, dto: ProjectInput) {
    await this.one(orgId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.slice(0, 120) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.links !== undefined ? { links: dto.links as never } : {}),
      },
    });
  }

  async remove(orgId: string, id: string) {
    await this.one(orgId, id);
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  async addThread(orgId: string, id: string, threadId: string, title?: string) {
    await this.one(orgId, id);
    return this.prisma.projectThread.upsert({
      where: { projectId_threadId: { projectId: id, threadId } },
      update: { title: title ?? undefined },
      create: { projectId: id, threadId, title: title ?? null },
    });
  }
}
