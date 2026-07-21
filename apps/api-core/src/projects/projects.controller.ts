import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { ProjectsService } from "./projects.service";

class CreateProjectDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(8000) instructions?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsObject() links?: Record<string, unknown>;
}
class UpdateProjectDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(8000) instructions?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsObject() links?: Record<string, unknown>;
}
class AddThreadDto {
  @IsString() threadId!: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
}

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  private org(user?: RequestUser): string {
    if (!user?.orgId) throw new ForbiddenException("Tài khoản chưa gắn với tổ chức nào");
    return user.orgId;
  }

  @Get()
  @ApiOperation({ summary: "Danh sách dự án của CEO" })
  list(@CurrentUser() user: RequestUser) {
    return this.svc.list(this.org(user));
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết dự án (kèm cuộc trò chuyện)" })
  one(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.svc.one(this.org(user), id);
  }

  @Post()
  @ApiOperation({ summary: "Tạo dự án" })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProjectDto) {
    return this.svc.create(this.org(user), dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Sửa dự án" })
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.svc.update(this.org(user), id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xoá dự án" })
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.svc.remove(this.org(user), id);
  }

  @Post(":id/threads")
  @ApiOperation({ summary: "Gắn một cuộc trò chuyện vào dự án" })
  addThread(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: AddThreadDto,
  ) {
    return this.svc.addThread(this.org(user), id, dto.threadId, dto.title);
  }
}
