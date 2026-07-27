-- Bài giới thiệu nền tảng mã nguồn mở, một bài một nền tảng, chuẩn SEO.
CREATE TABLE "PlatformArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT,
    "html" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "seoTitle" TEXT,
    "seoDesc" TEXT,
    "keywords" JSONB,
    "demoUrl" TEXT,
    "platformUrl" TEXT,
    "courseUrl" TEXT,
    "usesAI" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformArticle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformArticle_slug_key" ON "PlatformArticle"("slug");
CREATE INDEX "PlatformArticle_status_category_idx" ON "PlatformArticle"("status", "category");
