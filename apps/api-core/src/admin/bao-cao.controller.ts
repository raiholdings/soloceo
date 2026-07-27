import {
  Body, Controller, Delete, Get, Param, Post, Query, Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly, CurrentUser, Public } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { BaoCaoService } from "./bao-cao.service";

/** Công khai — cho soloceo.vn/bao-cao. */
@ApiTags("bao-cao")
@Controller("bao-cao")
export class BaoCaoPublicController {
  constructor(private readonly bc: BaoCaoService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Danh sách báo cáo đã xuất bản" })
  list() {
    return this.bc.danhSachCongKhai();
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Một báo cáo (kèm HTML đầy đủ)" })
  one(@Param("slug") slug: string) {
    return this.bc.motBaoCao(slug);
  }
}

/** Trang HTML thuần cho SEO và để đọc rời — không cần JavaScript. */
@ApiTags("bao-cao")
@Controller("bao-cao-page")
export class BaoCaoPageController {
  constructor(private readonly bc: BaoCaoService) {}

  @Public()
  @Get(":slug")
  async trang(@Param("slug") slug: string, @Res() res: Response) {
    const r = await this.bc.motBaoCao(slug);
    // Bọc trong khung tối thiểu. Báo cáo tự chứa CSS nên không cần gì thêm.
    res.type("html").send(`<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${r.title.replace(/</g, "&lt;")} — SoloCEO</title>
<meta name="description" content="${(r.summary ?? "").replace(/"/g, "&quot;").slice(0, 200)}">
<meta property="og:title" content="${r.title.replace(/"/g, "&quot;")}">
<meta property="og:description" content="${(r.summary ?? "").replace(/"/g, "&quot;").slice(0, 200)}">
${r.coverUrl ? `<meta property="og:image" content="${r.coverUrl}">` : ""}
<style>body{background:#0b0b0c;margin:0;padding:32px 0}</style>
</head><body>${r.html}</body></html>`);
  }
}

/** Quản trị — nằm dưới /v1/admin/eco để dùng chung guard token với các trang admin khác. */
@ApiTags("admin")
@AdminOnly()
@Controller("admin/eco/bao-cao")
export class BaoCaoAdminController {
  constructor(
    private readonly bc: BaoCaoService,
    private readonly prisma: PrismaService,
  ) {}

  private async ghi(user: RequestUser, action: string, targetId?: string, meta?: unknown) {
    try {
      await this.prisma.adminAction.create({
        data: {
          adminUser: user?.userId ?? "admin",
          action, targetId: targetId ?? null, meta: (meta ?? {}) as never,
        },
      });
    } catch { /* nhật ký lỗi không được chặn nghiệp vụ */ }
  }

  @Get()
  @ApiOperation({ summary: "Danh sách báo cáo (mọi trạng thái)" })
  list(@Query("status") status?: string) {
    return this.bc.danhSachAdmin(status);
  }

  @Post("sinh")
  @ApiOperation({ summary: "Đội AI sinh một báo cáo mới (ra bản NHÁP)" })
  async sinh(@CurrentUser() user: RequestUser, @Body() dto: { chu_de?: string }) {
    const r = await this.bc.sinhBaoCao(dto?.chu_de);
    await this.ghi(user, "bao-cao.sinh", (r as { id?: string }).id, { chu_de: dto?.chu_de });
    return r;
  }

  @Post("nhap")
  @ApiOperation({ summary: "Nhập một báo cáo HTML có sẵn" })
  async nhap(
    @CurrentUser() user: RequestUser,
    @Body() dto: { title: string; html: string } & Record<string, unknown>,
  ) {
    const r = await this.bc.nhap(dto as never);
    await this.ghi(user, "bao-cao.nhap", r.id, { title: r.title });
    return { id: r.id, slug: r.slug, status: r.status };
  }

  @Post(":id/dang")
  @ApiOperation({ summary: "Xuất bản / gỡ xuống nháp" })
  async dang(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: { publish: boolean },
  ) {
    const r = await this.bc.dangTrangThai(id, dto?.publish !== false);
    await this.ghi(user, dto?.publish !== false ? "bao-cao.xuat-ban" : "bao-cao.go-xuong", id);
    return { id: r.id, status: r.status };
  }

  @Post(":id/facebook")
  @ApiOperation({ summary: "Đăng báo cáo lên trang Facebook" })
  async facebook(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    const r = await this.bc.dangFacebook(id);
    await this.ghi(user, "bao-cao.facebook", id, r);
    return r;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xoá báo cáo" })
  async xoa(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.bc.xoa(id);
    await this.ghi(user, "bao-cao.xoa", id);
    return { id, da_xoa: true };
  }
}
