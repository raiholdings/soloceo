import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import { CreateOrgDto, UpdateOrgDto } from "./orgs.dto";

@Injectable()
export class OrgsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(user: RequestUser, dto: CreateOrgDto) {
    const existing = await this.prisma.org.findFirst({
      where: { ownerUserId: user.userId },
    });
    if (existing) {
      throw new ConflictException("Bạn đã có Org — mỗi Solo CEO một Org");
    }
    const org = await this.prisma.org.create({
      data: {
        name: dto.name,
        ownerUserId: user.userId,
        plan: "STARTER",
      },
    });
    // Kích hoạt Org → tạo LiteLLM virtual key với budget theo gói (Phần 8.2).
    // Lỗi gateway không chặn việc tạo Org — key sẽ được tạo lại khi cần.
    await this.aiService.ensureVirtualKey(org.id).catch(() => {});
    return org;
  }

  async me(user: RequestUser) {
    if (!user.orgId) {
      throw new NotFoundException("Chưa có Org — hãy tạo Org trước");
    }
    return this.prisma.org.findUniqueOrThrow({
      where: { id: user.orgId },
      include: {
        ventures: { orderBy: { createdAt: "asc" } },
        subscriptions: {
          where: { status: "active" },
          orderBy: { currentPeriodEnd: "desc" },
          take: 1,
        },
      },
    });
  }

  async update(user: RequestUser, dto: UpdateOrgDto) {
    if (!user.orgId) {
      throw new NotFoundException("Chưa có Org");
    }
    return this.prisma.org.update({
      where: { id: user.orgId },
      data: { ...(dto.name ? { name: dto.name } : {}) },
    });
  }
}
