import { Module } from "@nestjs/common";
import { StoreModule } from "../store/store.module";
import { AdminController } from "./admin.controller";
import {
  AdminEcosystemController,
  MarketplaceProjectsController,
  NewsPageController,
  NewsPublicController,
} from "./admin-eco.controller";
import { AdminEcosystemService } from "./admin-eco.service";
import {
  BaoCaoAdminController,
  BaoCaoPageController,
  BaoCaoPublicController,
} from "./bao-cao.controller";
import { BaoCaoService } from "./bao-cao.service";
import {
  NenTangAdminController,
  NenTangPublicController,
} from "./nen-tang.controller";
import { NenTangService } from "./nen-tang.service";

@Module({
  imports: [StoreModule],
  controllers: [
    AdminController,
    AdminEcosystemController,
    NewsPublicController,
    NewsPageController,
    MarketplaceProjectsController,
    BaoCaoPublicController,
    BaoCaoPageController,
    BaoCaoAdminController,
    NenTangPublicController,
    NenTangAdminController,
  ],
  providers: [AdminEcosystemService, BaoCaoService, NenTangService],
})
export class AdminModule {}
