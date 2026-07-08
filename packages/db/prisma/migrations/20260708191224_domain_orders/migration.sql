-- CreateEnum
CREATE TYPE "DomainOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PENDING_APPROVAL', 'REGISTERING', 'ACTIVE', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "DomainOrder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ventureId" TEXT,
    "domain" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "years" INTEGER NOT NULL DEFAULT 1,
    "priceVnd" DECIMAL(18,2) NOT NULL,
    "status" "DomainOrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "contact" JSONB NOT NULL,
    "providerMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainOrder_orgId_createdAt_idx" ON "DomainOrder"("orgId", "createdAt");
