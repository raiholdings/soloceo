import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators";
import { PrismaService } from "../prisma/prisma.service";

// Danh bạ public (Phần 6.6): venture LIVE + badge revenueVerified.
// Hồ sơ public theo slug dùng cho trang /v/[slug] của web-community —
// chỉ lộ thông tin công khai, không lộ số liệu doanh thu chi tiết.
@ApiTags("directory")
@Controller("directory")
export class DirectoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get("ventures")
  @ApiOperation({ summary: "Danh bạ venture public (LIVE + badge xác thực)" })
  async list() {
    return this.prisma.venture.findMany({
      where: { status: { in: ["LIVE", "LISTED"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        description: true,
        logoUrl: true,
        status: true,
        revenueVerified: true,
        createdAt: true,
      },
    });
  }

  @Public()
  @Get("ventures/:slug")
  @ApiOperation({ summary: "Hồ sơ venture public theo slug" })
  async bySlug(@Param("slug") slug: string) {
    const venture = await this.prisma.venture.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        description: true,
        logoUrl: true,
        status: true,
        revenueVerified: true,
        createdAt: true,
        org: { select: { name: true } },
      },
    });
    if (!venture) {
      throw new NotFoundException("Không tìm thấy venture");
    }
    return venture;
  }
}
