import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { OrgsModule } from "./orgs/orgs.module";
import { VenturesModule } from "./ventures/ventures.module";
import { DirectoryModule } from "./directory/directory.module";
import { ConciergeModule } from "./concierge/concierge.module";
import { DomainsModule } from "./domains/domains.module";
import { StoreModule } from "./store/store.module";
import { AiModule } from "./ai/ai.module";
import { PaymentsModule } from "./payments/payments.module";
import { CommunityModule } from "./community/community.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    ScheduleModule.forRoot(),
    // Rate limit 100 req/phút (GĐ7)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    HealthModule,
    OrgsModule,
    VenturesModule,
    DirectoryModule,
    StoreModule,
    DomainsModule,
    ConciergeModule,
    AiModule,
    PaymentsModule,
    CommunityModule,
    MarketplaceModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
