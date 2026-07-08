import { Module, forwardRef } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { WowonderController } from "./wowonder.controller";
import { WowonderService } from "./wowonder.service";
import { OidcModule } from "../oidc/oidc.module";

@Module({
  imports: [forwardRef(() => OidcModule)],
  controllers: [AuthController, WowonderController],
  providers: [
    AuthService,
    WowonderService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, WowonderService],
})
export class AuthModule {}
