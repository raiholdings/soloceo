import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { LiteLLMClient } from "./litellm.client";

@Module({
  controllers: [AiController],
  providers: [AiService, LiteLLMClient],
  exports: [AiService],
})
export class AiModule {}
