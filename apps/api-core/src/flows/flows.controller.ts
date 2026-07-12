import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsArray, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

class FlowDto {
  @IsString() @MaxLength(120) name!: string;
  @IsObject() graphJson!: { nodes: FlowNode[]; edges: unknown[] };
}
type FlowNode = {
  id: string;
  type: "start" | "agent_task" | "human_approval" | "form" | "note" | "end";
  title: string;
  config?: { prompt?: string; label?: string; ventureId?: string };
};

/**
 * N2 FlowGram — lưu & chạy QUY TRÌNH tái dùng của CEO (scope theo org_id).
 * Chạy thật: node agent_task → tạo thread DeerFlow (đội AI làm, CEO xem live);
 * node human_approval → tạo ApprovalRequest (hiện ở trang Phê duyệt). HITL không bị bỏ qua.
 */
@ApiTags("flows")
@ApiBearerAuth()
@Controller("flows")
export class FlowsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách quy trình của org" })
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.flow.findMany({
      where: { orgId: user.orgId! },
      orderBy: { updatedAt: "desc" },
    });
  }

  @Get(":id")
  async get(@CurrentUser() user: RequestUser, @Param("id", ParseUUIDPipe) id: string) {
    const f = await this.prisma.flow.findFirst({ where: { id, orgId: user.orgId! } });
    if (!f) throw new Error("Không tìm thấy quy trình");
    return f;
  }

  @Post()
  @ApiOperation({ summary: "Tạo quy trình" })
  create(@CurrentUser() user: RequestUser, @Body() dto: FlowDto) {
    return this.prisma.flow.create({
      data: { orgId: user.orgId!, name: dto.name, graphJson: dto.graphJson as object },
    });
  }

  @Put(":id")
  async update(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: FlowDto,
  ) {
    await this.get(user, id); // xác thực sở hữu
    return this.prisma.flow.update({
      where: { id },
      data: { name: dto.name, graphJson: dto.graphJson as object },
    });
  }

  @Delete(":id")
  async remove(@CurrentUser() user: RequestUser, @Param("id", ParseUUIDPipe) id: string) {
    await this.get(user, id);
    await this.prisma.flow.delete({ where: { id } });
    return { deleted: true };
  }

  @Post(":id/run")
  @ApiOperation({ summary: "Chạy quy trình: agent_task→DeerFlow, human_approval→ApprovalRequest" })
  async run(@CurrentUser() user: RequestUser, @Param("id", ParseUUIDPipe) id: string) {
    const flow = await this.get(user, id);
    const graph = flow.graphJson as unknown as { nodes: FlowNode[] };
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];

    const gwBase = process.env.DEERFLOW_PUBLIC_BASE ?? "https://soloceo.vn";
    const gwToken = process.env.DEERFLOW_INTERNAL_TOKEN;

    const result: { nodeId: string; type: string; outcome: string; ref?: string }[] = [];

    for (const n of nodes) {
      if (n.type === "agent_task") {
        // Tạo thread + run trên DeerFlow — đội AI thực thi, CEO xem live
        let ref = "";
        try {
          if (gwToken) {
            const t = await fetch(`${gwBase}/api/threads`, {
              method: "POST",
              headers: { "X-DeerFlow-Internal-Token": gwToken, "Content-Type": "application/json" },
              body: JSON.stringify({ metadata: { owner: user.orgId, title: `Quy trình: ${n.title}` } }),
            });
            const td = (await t.json()) as { thread_id?: string };
            const threadId = td.thread_id;
            if (threadId) {
              await fetch(`${gwBase}/api/threads/${threadId}/runs/stream`, {
                method: "POST",
                headers: { "X-DeerFlow-Internal-Token": gwToken, "Content-Type": "application/json" },
                body: JSON.stringify({
                  input: { messages: [{ type: "human", content: n.config?.prompt || n.title }] },
                  stream_mode: ["values"],
                }),
              }).catch(() => null);
              ref = threadId;
            }
          }
          result.push({ nodeId: n.id, type: n.type, outcome: ref ? "đã giao đội AI" : "bỏ qua (thiếu gateway)", ref });
        } catch (e) {
          result.push({ nodeId: n.id, type: n.type, outcome: `lỗi: ${(e as Error).message}` });
        }
      } else if (n.type === "human_approval") {
        // Tạo ApprovalRequest tier 2 → hiện ở trang Phê duyệt (HITL)
        const ap = await this.prisma.approvalRequest.create({
          data: {
            orgId: user.orgId!,
            actionType: "flow_approval",
            payloadJson: { flowId: id, flowName: flow.name, step: n.title } as object,
            tier: 2,
            status: "PENDING",
          },
        });
        result.push({ nodeId: n.id, type: n.type, outcome: "đã tạo yêu cầu phê duyệt", ref: ap.id });
      } else {
        result.push({ nodeId: n.id, type: n.type, outcome: "ghi chú/biểu mẫu (không thực thi)" });
      }
    }
    return { flowId: id, ran: result.length, steps: result };
  }
}
