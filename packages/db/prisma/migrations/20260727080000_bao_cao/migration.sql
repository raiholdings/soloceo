-- Báo cáo nghiên cứu do Đội AI sản xuất hằng ngày.
-- Lưu nguyên HTML thay vì markdown: báo cáo có bảng và biểu đồ SVG mà markdown không tả nổi.
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "html" TEXT NOT NULL,
    "coverUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'thi-truong',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "authorName" TEXT NOT NULL DEFAULT 'Đội AI SoloCEO',
    "sources" JSONB,
    "fbPostId" TEXT,
    "fbPostedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Report_slug_key" ON "Report"("slug");
CREATE INDEX "Report_status_publishedAt_idx" ON "Report"("status", "publishedAt");
