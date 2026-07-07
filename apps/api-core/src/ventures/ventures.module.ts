import { Module } from "@nestjs/common";
import { VenturesController } from "./ventures.controller";
import { VenturesService } from "./ventures.service";

@Module({
  controllers: [VenturesController],
  providers: [VenturesService],
  exports: [VenturesService],
})
export class VenturesModule {}
