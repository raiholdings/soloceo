-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'GROWTH', 'SCALE');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "VentureStatus" AS ENUM ('DRAFT', 'PROVISIONING', 'LIVE', 'PAUSED', 'LISTED', 'SOLD');

-- CreateEnum
CREATE TYPE "InstallStatus" AS ENUM ('QUEUED', 'DEPLOYING', 'RUNNING', 'FAILED', 'REMOVED');

-- CreateEnum
CREATE TYPE "TxDirection" AS ENUM ('IN', 'OUT', 'PLATFORM_FEE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING_REVIEW', 'LIVE', 'IN_ESCROW', 'SOLD', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venture" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "status" "VentureStatus" NOT NULL DEFAULT 'DRAFT',
    "revenueVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogApp" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "composeTemplate" TEXT NOT NULL,
    "defaultEnv" JSONB NOT NULL,
    "planMin" "Plan" NOT NULL DEFAULT 'STARTER',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CatalogApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppInstall" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "catalogAppId" TEXT NOT NULL,
    "coolifyAppId" TEXT,
    "url" TEXT,
    "status" "InstallStatus" NOT NULL DEFAULT 'QUEUED',
    "envOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "direction" "TxDirection" NOT NULL,
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "customerRef" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "ventureId" TEXT NOT NULL,
    "askPrice" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "ttmRevenue" DECIMAL(18,2),
    "ttmProfitEst" DECIMAL(18,2),
    "summary" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerOrgId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ventureId" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ventureId" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(12,6) NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venture_slug_key" ON "Venture"("slug");

-- CreateIndex
CREATE INDEX "Venture_orgId_idx" ON "Venture"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogApp_key_key" ON "CatalogApp"("key");

-- CreateIndex
CREATE INDEX "AppInstall_ventureId_idx" ON "AppInstall"("ventureId");

-- CreateIndex
CREATE INDEX "Subscription_orgId_idx" ON "Subscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_providerRef_key" ON "Transaction"("providerRef");

-- CreateIndex
CREATE INDEX "Transaction_ventureId_occurredAt_idx" ON "Transaction"("ventureId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_ventureId_key" ON "Listing"("ventureId");

-- CreateIndex
CREATE INDEX "Offer_listingId_idx" ON "Offer"("listingId");

-- CreateIndex
CREATE INDEX "Post_orgId_idx" ON "Post"("orgId");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_postId_orgId_key" ON "Like"("postId", "orgId");

-- CreateIndex
CREATE INDEX "AiUsage_orgId_day_idx" ON "AiUsage"("orgId", "day");

-- AddForeignKey
ALTER TABLE "Venture" ADD CONSTRAINT "Venture_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppInstall" ADD CONSTRAINT "AppInstall_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppInstall" ADD CONSTRAINT "AppInstall_catalogAppId_fkey" FOREIGN KEY ("catalogAppId") REFERENCES "CatalogApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "Venture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

