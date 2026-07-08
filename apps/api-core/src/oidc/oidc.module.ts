import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OidcController } from "./oidc.controller";
import { OidcService } from "./oidc.service";

// forwardRef: AuthModule ↔ OidcModule vòng nhau (WowonderController cần
// OidcService để nhận biết luồng OIDC ở callback cố định của WoWonder).
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [OidcController],
  providers: [OidcService],
  exports: [OidcService],
})
export class OidcModule {}
