import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AdminOnly, CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { DomainsService } from "./domains.service";

class ContactDto {
  @IsString()
  @IsNotEmpty()
  realname!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;
}

class CreateOrderDto {
  @IsOptional()
  @IsUUID()
  ventureId?: string;

  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsString()
  @IsNotEmpty()
  ext!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  years?: number;

  @IsObject()
  @ValidateNested()
  @Type(() => ContactDto)
  contact!: ContactDto;
}

@ApiTags("domains")
@ApiBearerAuth()
@Controller("domains")
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get("search")
  @ApiOperation({ summary: "Tìm tên miền: check các đuôi phổ biến + giá bán" })
  search(@CurrentUser() user: RequestUser, @Query("q") q: string) {
    return this.domains.search(user, q ?? "");
  }

  @Post("orders")
  @ApiOperation({
    summary: "Đặt mua tên miền (chờ admin duyệt — human-in-the-loop)",
  })
  createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.domains.createOrder(user, dto);
  }

  @Get("orders")
  @ApiOperation({ summary: "Danh sách đơn tên miền của org" })
  listOrders(@CurrentUser() user: RequestUser) {
    return this.domains.listOrders(user);
  }
}

@ApiTags("admin")
@ApiBearerAuth()
@AdminOnly()
@Controller("admin/domains")
export class AdminDomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get("pending")
  @ApiOperation({ summary: "Đơn tên miền chờ duyệt + số dư đại lý" })
  pending() {
    return this.domains.adminListPending();
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Duyệt đơn → gọi Nhân Hòa đăng ký (trừ số dư)" })
  approve(@Param("id", ParseUUIDPipe) id: string) {
    return this.domains.adminApprove(id);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Từ chối đơn" })
  reject(@Param("id", ParseUUIDPipe) id: string) {
    return this.domains.adminReject(id);
  }
}
