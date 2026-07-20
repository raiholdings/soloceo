-- Tin tức nền tảng (Admin Console + hiển thị public)
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "coverUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'thong-bao',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "authorName" TEXT NOT NULL DEFAULT 'SoloCEO',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");
CREATE INDEX "News_status_publishedAt_idx" ON "News"("status", "publishedAt");
