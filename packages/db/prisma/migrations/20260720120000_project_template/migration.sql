-- Mẫu dự án (Project Builder) → marketplace / Sàn M&A
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "industry" TEXT,
    "summary" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "valueProps" JSONB,
    "buildSteps" JSONB,
    "priceVnd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "monthlyFeeVnd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "coverUrl" TEXT,
    "demoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectTemplate_slug_key" ON "ProjectTemplate"("slug");
CREATE INDEX "ProjectTemplate_status_createdAt_idx" ON "ProjectTemplate"("status", "createdAt");
