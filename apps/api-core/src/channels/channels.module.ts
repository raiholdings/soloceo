import { Module } from "@nestjs/common";
import { ZaloService } from "./zalo.service";
import { ZaloController } from "./zalo.controller";

/** Kênh nhắn tin (Zalo OA) → DeerFlow — SoloCEO OS v2 (research/R7). */
@Module({
  controllers: [ZaloController],
  providers: [ZaloService],
  exports: [ZaloService],
})
export class ChannelsModule {}
