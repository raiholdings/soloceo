import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { CurrentUser, Public } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsUUID()
  ventureId?: string;
}

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

@ApiTags("community")
@ApiBearerAuth()
@Controller("posts")
export class CommunityController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Feed cộng đồng (public)" })
  async feed(@Query("cursor") cursor?: string) {
    return this.prisma.post.findMany({
      take: 20,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        org: { select: { name: true } },
        comments: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: { org: { select: { name: true } } },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  @Post()
  @ApiOperation({ summary: "Đăng bài" })
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreatePostDto) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    return this.prisma.post.create({
      data: {
        orgId: user.orgId,
        ventureId: dto.ventureId,
        content: dto.content,
      },
      include: { org: { select: { name: true } } },
    });
  }

  @Post(":id/comments")
  @ApiOperation({ summary: "Bình luận" })
  async comment(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    return this.prisma.comment.create({
      data: { postId, orgId: user.orgId, content: dto.content },
      include: { org: { select: { name: true } } },
    });
  }

  @Post(":id/like")
  @ApiOperation({ summary: "Thích / bỏ thích (toggle)" })
  async like(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) postId: string,
  ) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const existing = await this.prisma.like.findUnique({
      where: { postId_orgId: { postId, orgId: user.orgId } },
    });
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await this.prisma.like.create({ data: { postId, orgId: user.orgId } });
    return { liked: true };
  }
}
