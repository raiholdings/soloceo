import { Module } from "@nestjs/common";
import { ProvisionQueueService } from "./provision-queue.service";
import { StoreController } from "./store.controller";
import { StoreService } from "./store.service";

@Module({
  controllers: [StoreController],
  providers: [StoreService, ProvisionQueueService],
  exports: [StoreService, ProvisionQueueService],
})
export class StoreModule {}
