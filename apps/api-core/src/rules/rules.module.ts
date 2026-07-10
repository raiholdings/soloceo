import { Module } from "@nestjs/common";
import { RulesService } from "./rules.service";
import { AdminRulesController } from "./rules.controller";
import { InternalRulesController } from "./rules-internal.controller";

/** HITL gate (arishem) — SoloCEO OS v2. RulesService export cho module khác
 *  (payments, store, marketplace…) gọi evaluate() trước hành động nhạy cảm.
 *  InternalRulesController = cổng cho DeerFlow guardrail (tầng agent). */
@Module({
  controllers: [AdminRulesController, InternalRulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
