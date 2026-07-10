-- HOÀN TÁC (chạy tay nếu cần khôi phục cụm v1):
-- Dữ liệu reversible hoàn toàn. Giá trị enum 'ARCHIVED' để lại là vô hại
-- (không cần gỡ; gỡ enum value trong Postgres phải tạo lại type — không khuyến nghị).
UPDATE "AppInstall"
   SET status = 'RUNNING'
 WHERE "catalogAppId" IN (
   SELECT id FROM "CatalogApp" WHERE key IN ('claw3d', 'openclaw')
 )
   AND status = 'ARCHIVED';

UPDATE "CatalogApp"
   SET active = true
 WHERE key IN ('claw3d', 'openclaw');
