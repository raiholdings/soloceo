-- CeoProject: doanh nghiệp/ý tưởng CEO tạo ở workspace, cho Admin theo dõi
CREATE TABLE "CeoProject" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "ceoEmail" TEXT,
    "businessName" TEXT NOT NULL,
    "industry" TEXT,
    "capital" TEXT,
    "idea" TEXT NOT NULL,
    "channels" TEXT,
    "goal6m" TEXT,
    "score" INTEGER,
    "evaluation" TEXT,
    "firstStep" TEXT,
    "recommended" JSONB,
    "source" TEXT NOT NULL DEFAULT 'workspace',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CeoProject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CeoProject_createdAt_idx" ON "CeoProject"("createdAt");
CREATE INDEX "CeoProject_orgId_idx" ON "CeoProject"("orgId");
