import { Module } from "@nestjs/common";
import { VenturesModule } from "../ventures/ventures.module";
import { StoreModule } from "../store/store.module";
import { DomainsModule } from "../domains/domains.module";
import { NhanHoaClient } from "../domains/nhanhoa.client";
import { ConciergeController } from "./concierge.controller";
import { ConciergeService } from "./concierge.service";

@Module({
  imports: [VenturesModule, StoreModule, DomainsModule],
  controllers: [ConciergeController],
  providers: [ConciergeService, NhanHoaClient],
})
export class ConciergeModule {}
