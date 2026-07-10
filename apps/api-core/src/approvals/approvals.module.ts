import { Module } from "@nestjs/common";
import { ApprovalsService } from "./approvals.service";
import { ApprovalsController } from "./approvals.controller";

/** Hàng đợi phê duyệt HITL tầng 2 — SoloCEO OS v2 (arishem + FlowGram). */
@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
