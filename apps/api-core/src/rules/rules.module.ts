import { Module } from "@nestjs/common";
import { RulesService } from "./rules.service";
import { AdminRulesController } from "./rules.controller";

/** HITL gate (arishem) — SoloCEO OS v2. RulesService export cho module khác
 *  (payments, store, marketplace…) gọi evaluate() trước hành động nhạy cảm. */
@Module({
  controllers: [AdminRulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
