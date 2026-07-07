import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { OrgsModule } from "./orgs/orgs.module";
import { VenturesModule } from "./ventures/ventures.module";
import { DirectoryModule } from "./directory/directory.module";
import { StoreModule } from "./store/store.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    OrgsModule,
    VenturesModule,
    DirectoryModule,
    StoreModule,
  ],
})
export class AppModule {}
