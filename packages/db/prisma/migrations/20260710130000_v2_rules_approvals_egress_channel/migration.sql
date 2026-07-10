-- SoloCEO OS v2 (PHA 3): HITL gate (arishem), audit, HITL queue, egress allowlist, channel.
-- Additive — không đụng bảng cũ. Ref research/R6, R7, R1/R3.

-- CreateEnum
CREATE TYPE "RuleDecision" AS ENUM ('ALLOW', 'DENY', 'REQUIRE_APPROVAL');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable Rule
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "actionType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "conditionJson" JSONB NOT NULL,
    "decision" "RuleDecision" NOT NULL,
    "approvalTier" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Rule_orgId_actionType_enabled_idx" ON "Rule"("orgId", "actionType", "enabled");

-- CreateTable RuleDecisionLog
CREATE TABLE "RuleDecisionLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ventureId" TEXT,
    "actionType" TEXT NOT NULL,
    "contextJson" JSONB NOT NULL,
    "decision" "RuleDecision" NOT NULL,
    "matchedRuleId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RuleDecisionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RuleDecisionLog_orgId_createdAt_idx" ON "RuleDecisionLog"("orgId", "createdAt");

-- CreateTable ApprovalRequest
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ventureId" TEXT,
    "actionType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "matchedRuleId" TEXT,
    "tier" INTEGER NOT NULL,
    "threadId" TEXT,
    "runId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ApprovalRequest_orgId_status_idx" ON "ApprovalRequest"("orgId", "status");

-- CreateTable EgressAllowlist
CREATE TABLE "EgressAllowlist" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EgressAllowlist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EgressAllowlist_orgId_domain_key" ON "EgressAllowlist"("orgId", "domain");
CREATE INDEX "EgressAllowlist_orgId_enabled_idx" ON "EgressAllowlist"("orgId", "enabled");

-- CreateTable ChannelBinding
CREATE TABLE "ChannelBinding" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ventureId" TEXT,
    "channel" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "secretRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelBinding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChannelBinding_channel_externalId_key" ON "ChannelBinding"("channel", "externalId");
CREATE INDEX "ChannelBinding_orgId_ventureId_idx" ON "ChannelBinding"("orgId", "ventureId");
