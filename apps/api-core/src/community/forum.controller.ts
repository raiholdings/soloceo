import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { WowonderService } from "../auth/wowonder.service";

class PostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;
}

class CommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;
}

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(60) first_name?: string;
  @IsOptional() @IsString() @MaxLength(60) last_name?: string;
  @IsOptional() @IsString() @MaxLength(500) about?: string;
  @IsOptional() @IsString() @MaxLength(120) website?: string;
  @IsOptional() @IsString() @MaxLength(120) address?: string;
}

// Proxy cộng đồng WoWonder (my.soloceo.vn) — feed/post/comment/like/profile
// hiển thị & thao tác thẳng trên soloceo.vn, không chuyển hướng.
@ApiTags("community-forum")
@ApiBearerAuth()
@Controller("community")
export class ForumController {
  constructor(private readonly wowonder: WowonderService) {}

  private orgId(user: RequestUser): string {
    if (!user.orgId) throw new ForbiddenException("Chưa có tài khoản cộng đồng");
    return user.orgId;
  }

  @Get("feed")
  @ApiOperation({ summary: "NewsFeed cộng đồng" })
  feed(
    @CurrentUser() user: RequestUser,
    @Query("after") after?: string,
  ) {
    return this.wowonder.getFeed(this.orgId(user), 20, Number(after) || 0);
  }

  @Post("posts")
  @ApiOperation({ summary: "Đăng bài lên cộng đồng" })
  createPost(@CurrentUser() user: RequestUser, @Body() dto: PostDto) {
    return this.wowonder.createPost(this.orgId(user), dto.text);
  }

  @Get("posts/:id/comments")
  @ApiOperation({ summary: "Bình luận của bài" })
  comments(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.wowonder.getComments(this.orgId(user), id);
  }

  @Post("posts/:id/comments")
  @ApiOperation({ summary: "Viết bình luận" })
  comment(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: CommentDto,
  ) {
    return this.wowonder.createComment(this.orgId(user), id, dto.text);
  }

  @Post("posts/:id/like")
  @ApiOperation({ summary: "Thích bài" })
  like(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.wowonder.reactPost(this.orgId(user), id);
  }

  @Post("profile")
  @ApiOperation({ summary: "Cập nhật hồ sơ trên cộng đồng" })
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (typeof v === "string" && v.length > 0) fields[k] = v;
    }
    return this.wowonder.updateProfile(this.orgId(user), fields);
  }
}
