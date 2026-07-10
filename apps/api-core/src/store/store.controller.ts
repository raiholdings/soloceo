import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import type { Response } from "express";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StoreService } from "./store.service";

class InstallDto {
  @IsString()
  @IsNotEmpty()
  catalogAppKey!: string;
}

@ApiTags("store")
@ApiBearerAuth()
@Controller()
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("store/apps")
  @ApiOperation({ summary: "Catalog App Store (đánh dấu quyền theo gói)" })
  listApps(@CurrentUser() user: RequestUser) {
    return this.storeService.listApps(user);
  }

  @Post("ventures/:id/installs")
  @ApiOperation({ summary: "Cài app cho venture → QUEUED" })
  install(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) ventureId: string,
    @Body() dto: InstallDto,
  ) {
    return this.storeService.install(user, ventureId, dto.catalogAppKey);
  }

  @Get("ventures/:id/installs")
  @ApiOperation({ summary: "Danh sách app đã cài của venture" })
  listInstalls(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) ventureId: string,
  ) {
    return this.storeService.listInstalls(user, ventureId);
  }

  /**
   * @deprecated v2 cleanup (R0 §C3) — cụm OpenClaw/OS Shell đã chuyển sang
   * openclawos.vn. Endpoint giữ lại nhưng KHÔNG dùng trong luồng core v2
   * (caller duy nhất là web-platform — đã gỡ khỏi build ở C5). Sẽ được thay
   * bằng luồng DeerFlow workspace ở PHA 3. Không xoá để tránh gãy client cũ.
   */
  @Get("ventures/:id/openclaw-access")
  @ApiOperation({
    summary: "[DEPRECATED] URL + token Control UI OpenClaw (đã chuyển openclawos.vn)",
    deprecated: true,
  })
  openclawAccess(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) ventureId: string,
  ) {
    return this.storeService.getOpenclawAccess(user, ventureId);
  }

  @Post("ventures/:id/launch")
  @ApiOperation({
    summary: "Khởi chạy doanh nghiệp: DRAFT → PROVISIONING, cài app mặc định",
  })
  launch(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) ventureId: string,
  ) {
    return this.storeService.launch(user, ventureId);
  }

  @Delete("installs/:installId")
  @ApiOperation({ summary: "Gỡ app (2 bước: gọi lần 2 với ?confirm=true)" })
  remove(
    @CurrentUser() user: RequestUser,
    @Param("installId", ParseUUIDPipe) installId: string,
    @Query("confirm") confirm?: string,
  ) {
    return this.storeService.removeInstall(user, installId, confirm === "true");
  }

  @Get("installs/:installId/logs")
  @ApiOperation({ summary: "Log build/deploy từ Coolify" })
  logs(
    @CurrentUser() user: RequestUser,
    @Param("installId", ParseUUIDPipe) installId: string,
  ) {
    return this.storeService.getLogs(user, installId);
  }

  @Get("ventures/:id/provision-events")
  @ApiOperation({
    summary: "SSE tiến trình provisioning (dùng ?access_token= cho EventSource)",
  })
  async provisionEvents(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) ventureId: string,
    @Res() res: Response,
  ) {
    // xác thực quyền sở hữu trước khi mở stream
    await this.storeService.listInstalls(user, ventureId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let closed = false;
    res.on("close", () => {
      closed = true;
    });

    const poll = async () => {
      const [venture, installs] = await Promise.all([
        this.prisma.venture.findUnique({
          where: { id: ventureId },
          select: { status: true },
        }),
        this.prisma.appInstall.findMany({
          where: { ventureId, status: { not: "REMOVED" } },
          include: { catalogApp: { select: { key: true, name: true } } },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      const payload = {
        ventureStatus: venture?.status,
        installs: installs.map((i) => ({
          id: i.id,
          key: i.catalogApp.key,
          name: i.catalogApp.name,
          status: i.status,
          url: i.url,
        })),
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      const pending = installs.some((i) =>
        ["QUEUED", "DEPLOYING"].includes(i.status),
      );
      return venture?.status !== "PROVISIONING" && !pending;
    };

    // stream đến khi mọi install ở trạng thái cuối (tối đa 12 phút)
    const deadline = Date.now() + 12 * 60 * 1000;
    while (!closed && Date.now() < deadline) {
      const done = await poll().catch(() => true);
      if (done) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (!closed) {
      await poll().catch(() => {});
      res.write("event: end\ndata: {}\n\n");
      res.end();
    }
  }
}
