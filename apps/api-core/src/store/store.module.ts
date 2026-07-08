import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ProvisionQueueService } from "./provision-queue.service";
import { StoreController } from "./store.controller";
import { StoreService } from "./store.service";

@Module({
  imports: [AiModule],
  controllers: [StoreController],
  providers: [StoreService, ProvisionQueueService],
  exports: [StoreService, ProvisionQueueService],
})
export class StoreModule {}
