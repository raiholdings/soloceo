-- v2 cleanup (R0 §C9): ARCHIVE cụm claw3d/openclaw (khách nội bộ test — được phép
-- loại, không migrate). KHÔNG xoá cứng bản ghi nào.
--   1) Vô hiệu hoá CatalogApp claw3d/openclaw (active=false) — ẩn khỏi App Store.
--   2) Đánh dấu mọi AppInstall của 2 app này = ARCHIVED (giữ lịch sử, không DELETE).
UPDATE "CatalogApp"
   SET active = false
 WHERE key IN ('claw3d', 'openclaw');

UPDATE "AppInstall"
   SET status = 'ARCHIVED'
 WHERE "catalogAppId" IN (
   SELECT id FROM "CatalogApp" WHERE key IN ('claw3d', 'openclaw')
 )
   AND status <> 'ARCHIVED';
