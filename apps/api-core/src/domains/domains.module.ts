import { Module } from "@nestjs/common";
import {
  AdminDomainsController,
  DomainsController,
} from "./domains.controller";
import { DomainsService } from "./domains.service";
import { NhanHoaClient } from "./nhanhoa.client";

@Module({
  controllers: [DomainsController, AdminDomainsController],
  providers: [DomainsService, NhanHoaClient],
  exports: [DomainsService],
})
export class DomainsModule {}
