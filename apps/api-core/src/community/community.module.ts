import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CommunityController } from "./community.controller";
import { ForumController } from "./forum.controller";

@Module({
  imports: [AuthModule],
  controllers: [CommunityController, ForumController],
})
export class CommunityModule {}
