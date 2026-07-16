import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ProvisionQueueService } from "./provision-queue.service";
import { StoreController } from "./store.controller";
import { StoreInternalController } from "./store-internal.controller";
import { StoreService } from "./store.service";

@Module({
  imports: [AiModule],
  controllers: [StoreController, StoreInternalController],
  providers: [StoreService, ProvisionQueueService],
  exports: [StoreService, ProvisionQueueService],
})
export class StoreModule {}
