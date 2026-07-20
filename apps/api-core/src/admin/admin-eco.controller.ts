import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { AdminOnly, CurrentUser, Public } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AdminEcosystemService } from "./admin-eco.service";

class ChangePlanDto {
  @IsIn(["STARTER", "GROWTH", "SCALE"])
  plan!: "STARTER" | "GROWTH" | "SCALE";
}
class ExtendDto {
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;
}
class NewsCreateDto {
  @IsString() @MinLength(3) title!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() authorName?: string;
}
class NewsUpdateDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() category?: string;
}
class PublishDto {
  @IsBoolean() publish!: boolean;
}
class AgentToggleDto {
  @IsBoolean() enabled!: boolean;
}

@ApiTags("admin-ecosystem")
@ApiBearerAuth()
@AdminOnly()
@Controller("admin/eco")
export class AdminEcosystemController {
  constructor(
    private readonly eco: AdminEcosystemService,
    private readonly prisma: PrismaService,
  ) {}

  private audit(user: RequestUser, action: string, targetId?: string, meta?: object) {
    return this.prisma.adminAction.create({
      data: { adminUser: user.userId, action, targetId, meta: meta as never },
    });
  }

  // Sức khoẻ nền tảng
  @Get("health")
  @ApiOperation({ summary: "Sức khoẻ toàn bộ nền tảng (HTTP probe)" })
  health() {
    return this.eco.health();
  }

  // Hạ tầng & Coolify
  @Get("infra")
  @ApiOperation({ summary: "Hạ tầng: servers + resources từ Coolify" })
  infra() {
    return this.eco.infra();
  }

  // Chi phí & ngân sách AI
  @Get("ai-budget")
  @ApiOperation({ summary: "Chi phí + ngân sách AI theo org (biên lãi)" })
  aiBudget() {
    return this.eco.aiBudget();
  }

  // Người dùng & gói cước
  @Get("users")
  @ApiOperation({ summary: "Danh sách org/CEO + gói + doanh thu 30 ngày" })
  users() {
    return this.eco.users();
  }

  @Patch("users/:orgId/plan")
  @ApiOperation({ summary: "Đổi gói cước của org" })
  async changePlan(
    @CurrentUser() user: RequestUser,
    @Param("orgId") orgId: string,
    @Body() dto: ChangePlanDto,
  ) {
    const org = await this.eco.changePlan(orgId, dto.plan);
    await this.audit(user, "org.change_plan", orgId, { plan: dto.plan });
    return org;
  }

  @Post("users/:orgId/extend")
  @ApiOperation({ summary: "Gia hạn subscription thêm N ngày" })
  async extend(
    @CurrentUser() user: RequestUser,
    @Param("orgId") orgId: string,
    @Body() dto: ExtendDto,
  ) {
    const sub = await this.eco.extendSubscription(orgId, dto.days);
    await this.audit(user, "org.extend", orgId, { days: dto.days });
    return sub;
  }

  // Tin tức
  @Get("news")
  @ApiOperation({ summary: "Danh sách tin (admin, mọi trạng thái)" })
  newsList(@Query("status") status?: string) {
    return this.eco.newsList(status);
  }

  @Post("news")
  @ApiOperation({ summary: "Tạo tin (DRAFT)" })
  async newsCreate(@CurrentUser() user: RequestUser, @Body() dto: NewsCreateDto) {
    const news = await this.eco.newsCreate(dto);
    await this.audit(user, "news.create", news.id, { title: dto.title });
    return news;
  }

  @Patch("news/:id")
  @ApiOperation({ summary: "Sửa tin" })
  newsUpdate(@Param("id") id: string, @Body() dto: NewsUpdateDto) {
    return this.eco.newsUpdate(id, dto);
  }

  @Post("news/:id/publish")
  @ApiOperation({ summary: "Đăng / gỡ đăng tin" })
  async newsPublish(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: PublishDto,
  ) {
    const news = await this.eco.newsPublish(id, dto.publish);
    await this.audit(user, dto.publish ? "news.publish" : "news.unpublish", id);
    return news;
  }

  @Delete("news/:id")
  @ApiOperation({ summary: "Xoá tin" })
  async newsDelete(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.eco.newsDelete(id);
    await this.audit(user, "news.delete", id);
    return { deleted: true };
  }

  // Cây viết AI
  @Post("news/ai-generate")
  @ApiOperation({ summary: "Sinh 1 bài SEO bằng AI và đăng ngay" })
  async aiGenerate(
    @CurrentUser() user: RequestUser,
    @Body() dto: { topic?: string; publish?: boolean },
  ) {
    const r = await this.eco.newsAiGenerate(dto ?? {});
    await this.audit(user, "news.ai_generate", r.id, { topic: r.topic });
    return r;
  }

  @Get("news/ai-stats")
  @ApiOperation({ summary: "Thống kê cây viết AI" })
  aiStats() {
    return this.eco.newsAiStats();
  }

  // Tài liệu (đồng bộ /en/docs)
  @Get("docs")
  @ApiOperation({ summary: "Danh sách tài liệu (/en/docs)" })
  docs() {
    return this.eco.docsIndex();
  }

  // Project Builder — tạo dự án từ ý tưởng
  @Post("projects/generate")
  @ApiOperation({ summary: "Sinh mẫu dự án từ ý tưởng (AI tổng hợp khối)" })
  async projectGenerate(
    @CurrentUser() user: RequestUser,
    @Body() dto: { idea: string; goal?: string },
  ) {
    if (!dto?.idea || dto.idea.trim().length < 5)
      throw new BadRequestException("Cần nhập ý tưởng (>=5 ký tự)");
    const p = await this.eco.projectGenerate(dto.idea, dto.goal);
    await this.audit(user, "project.generate", p.id, { name: p.name });
    return p;
  }

  @Get("projects")
  @ApiOperation({ summary: "Danh sách mẫu dự án" })
  projects(@Query("status") status?: string) {
    return this.eco.projectList(status);
  }

  @Patch("projects/:id")
  @ApiOperation({ summary: "Sửa mẫu dự án (giá, mô tả, demoUrl…)" })
  projectUpdate(@Param("id") id: string, @Body() dto: Record<string, unknown>) {
    return this.eco.projectUpdate(id, dto as never);
  }

  @Post("projects/:id/publish")
  @ApiOperation({ summary: "Đăng/gỡ mẫu dự án lên marketplace" })
  async projectPublish(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: PublishDto,
  ) {
    const p = await this.eco.projectPublish(id, dto.publish);
    await this.audit(user, dto.publish ? "project.publish" : "project.unpublish", id);
    return p;
  }

  @Delete("projects/:id")
  @ApiOperation({ summary: "Xoá mẫu dự án" })
  async projectDelete(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.eco.projectDelete(id);
    await this.audit(user, "project.delete", id);
    return { deleted: true };
  }

  // Trợ lý AI
  @Get("agents")
  @ApiOperation({ summary: "Danh sách trợ lý AI (proxy DeerFlow)" })
  agents() {
    return this.eco.agents();
  }

  @Patch("agents/:name")
  @ApiOperation({ summary: "Bật/tắt một trợ lý AI" })
  async toggleAgent(
    @CurrentUser() user: RequestUser,
    @Param("name") name: string,
    @Body() dto: AgentToggleDto,
  ) {
    const r = await this.eco.setAgentEnabled(name, dto.enabled);
    await this.audit(user, "agent.toggle", name, { enabled: dto.enabled });
    return r;
  }
}

/** Đọc tin công khai cho website — không cần đăng nhập */
@ApiTags("news")
@Controller("news")
export class NewsPublicController {
  constructor(private readonly eco: AdminEcosystemService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Tin đã đăng (public)" })
  list(@Query("category") category?: string) {
    return this.eco.newsPublicList(category);
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Chi tiết một tin (public)" })
  one(@Param("slug") slug: string) {
    return this.eco.newsPublicOne(slug);
  }
}

/** Public — mẫu dự án cho marketplace.soloceo.vn + Sàn M&A */
@ApiTags("marketplace")
@Controller("marketplace/project-templates")
export class MarketplaceProjectsController {
  constructor(private readonly eco: AdminEcosystemService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Mẫu dự án đã đăng (public)" })
  list() {
    return this.eco.projectPublicList();
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Chi tiết mẫu dự án (public)" })
  one(@Param("slug") slug: string) {
    return this.eco.projectPublicOne(slug);
  }
}

/**
 * Trang HTML công khai cho SEO — nginx của DeerFlow proxy
 * soloceo.vn/tin-tuc → /v1/news-page (index) và soloceo.vn/tin-tuc/:slug.
 */
@ApiTags("news")
@Controller("news-page")
export class NewsPageController {
  constructor(private readonly eco: AdminEcosystemService) {}

  @Public()
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "public, max-age=300")
  async index() {
    return this.eco.newsPageIndex();
  }

  @Public()
  @Get(":slug")
  @Header("Cache-Control", "public, max-age=300")
  async detail(@Param("slug") slug: string, @Res() res: Response) {
    const html = await this.eco.newsPageDetail(slug);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (!html) {
      res
        .status(404)
        .send(
          '<!doctype html><meta charset="utf-8"><title>Không tìm thấy</title><body style="font-family:sans-serif;text-align:center;padding:80px"><h1>404</h1><p>Bài viết không tồn tại. <a href="https://soloceo.vn/tin-tuc">Về Tin tức</a></p>',
        );
      return;
    }
    res.status(200).send(html);
  }
}
