import { Module } from "@nestjs/common";
import { StoreModule } from "../store/store.module";
import { AdminController } from "./admin.controller";
import {
  AdminEcosystemController,
  NewsPageController,
  NewsPublicController,
} from "./admin-eco.controller";
import { AdminEcosystemService } from "./admin-eco.service";

@Module({
  imports: [StoreModule],
  controllers: [
    AdminController,
    AdminEcosystemController,
    NewsPublicController,
    NewsPageController,
  ],
  providers: [AdminEcosystemService],
})
export class AdminModule {}
