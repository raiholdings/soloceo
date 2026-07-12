-- N2 FlowGram: bảng Flow (quy trình tái dùng per-org). Additive, reversible.
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "graphJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Flow_orgId_updatedAt_idx" ON "Flow"("orgId", "updatedAt");
