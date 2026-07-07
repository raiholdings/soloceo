import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { CreateOrgDto, UpdateOrgDto } from "./orgs.dto";
import { OrgsService } from "./orgs.service";

@ApiTags("orgs")
@ApiBearerAuth()
@Controller("orgs")
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Post()
  @ApiOperation({ summary: "Tạo Org sau khi đăng ký (plan=STARTER)" })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrgDto) {
    return this.orgsService.create(user, dto);
  }

  @Get("me")
  @ApiOperation({ summary: "Org của tôi (kèm ventures + subscription hiện tại)" })
  me(@CurrentUser() user: RequestUser) {
    return this.orgsService.me(user);
  }

  @Patch("me")
  @ApiOperation({ summary: "Cập nhật Org của tôi" })
  update(@CurrentUser() user: RequestUser, @Body() dto: UpdateOrgDto) {
    return this.orgsService.update(user, dto);
  }
}
