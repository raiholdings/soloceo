import { Module } from "@nestjs/common";
import { DirectoryController } from "./directory.controller";
import { ReceptionService } from "./reception.service";

@Module({
  controllers: [DirectoryController],
  providers: [ReceptionService],
})
export class DirectoryModule {}
