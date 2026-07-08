import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Public } from "../auth/decorators";
import { PrismaService } from "../prisma/prisma.service";
import { ReceptionService } from "./reception.service";

class ReceptionMsgDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content!: string;
}

class ReceptionChatDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReceptionMsgDto)
  messages!: ReceptionMsgDto[];
}

// Danh bạ public (Phần 6.6): venture LIVE + badge revenueVerified.
// Hồ sơ public theo slug dùng cho trang /v/[slug] của web-community —
// chỉ lộ thông tin công khai, không lộ số liệu doanh thu chi tiết.
@ApiTags("directory")
@Controller("directory")
export class DirectoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reception: ReceptionService,
  ) {}

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

  @Public()
  // Lễ tân công khai — siết 8 lượt/phút/IP để chống lạm dụng model
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  @Post("ventures/:slug/reception")
  @ApiOperation({
    summary: "Chat với trợ lý tiếp khách của doanh nghiệp (public, an toàn)",
  })
  async receptionChat(
    @Param("slug") slug: string,
    @Body() dto: ReceptionChatDto,
  ) {
    return this.reception.chat(slug, dto.messages);
  }
}
