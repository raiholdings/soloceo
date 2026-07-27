import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminOnly, CurrentUser, Public } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { NenTangService } from "./nen-tang.service";

/** Công khai — cho soloceo.vn/giai-phap/nen-tang */
@ApiTags("nen-tang")
@Controller("nen-tang")
export class NenTangPublicController {
  constructor(private readonly nt: NenTangService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Danh sách nền tảng đã có bài (không kèm HTML)" })
  list() {
    return this.nt.danhSachCongKhai();
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Một bài giới thiệu nền tảng (kèm HTML)" })
  one(@Param("slug") slug: string) {
    return this.nt.motBai(slug);
  }
}

@ApiTags("admin")
@AdminOnly()
@Controller("admin/eco/nen-tang")
export class NenTangAdminController {
  constructor(
    private readonly nt: NenTangService,
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
  @ApiOperation({ summary: "Danh sách nền tảng (mọi trạng thái)" })
  list(@Query("status") status?: string) {
    return this.nt.danhSachAdmin(status);
  }

  @Post("dong-bo")
  @ApiOperation({ summary: "Nạp danh mục nền tảng vào bảng bài viết" })
  async dongBo(@CurrentUser() user: RequestUser) {
    const r = await this.nt.dongBoDanhMuc();
    await this.ghi(user, "nen-tang.dong-bo", undefined, r);
    return r;
  }

  @Post("sinh-lo")
  @ApiOperation({ summary: "Viết bài theo lô cho các nền tảng chưa có nội dung" })
  async sinhLo(@CurrentUser() user: RequestUser, @Body() dto: { so_luong?: number }) {
    const r = await this.nt.sinhTheoLo(Number(dto?.so_luong) || 5);
    await this.ghi(user, "nen-tang.sinh-lo", undefined, { da_viet: r.da_viet, con_lai: r.con_lai });
    return r;
  }

  @Post(":slug/sinh")
  @ApiOperation({ summary: "Viết lại bài cho một nền tảng" })
  async sinh(@CurrentUser() user: RequestUser, @Param("slug") slug: string) {
    const r = await this.nt.sinhBai(slug);
    await this.ghi(user, "nen-tang.sinh", slug, r);
    return r;
  }
}
