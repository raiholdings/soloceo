import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { CreateVentureDto, UpdateVentureDto } from "./ventures.dto";
import { VenturesService } from "./ventures.service";

@ApiTags("ventures")
@ApiBearerAuth()
@Controller("ventures")
export class VenturesController {
  constructor(private readonly venturesService: VenturesService) {}

  @Post()
  @ApiOperation({ summary: "Tạo venture (status DRAFT)" })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateVentureDto) {
    return this.venturesService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "Danh sách venture của Org" })
  list(@CurrentUser() user: RequestUser) {
    return this.venturesService.list(user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết venture" })
  get(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.venturesService.getOwned(user, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật venture" })
  update(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVentureDto,
  ) {
    return this.venturesService.update(user, id, dto);
  }

  @Get(":id/revenue")
  @ApiOperation({ summary: "Tổng hợp doanh thu: mtd, ttm, chart 12 tháng" })
  revenue(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.venturesService.revenue(user, id);
  }
}
