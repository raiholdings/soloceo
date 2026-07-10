-- v2 cleanup (R0 §C9): thêm giá trị enum ARCHIVED cho InstallStatus.
-- TÁCH riêng khỏi UPDATE dữ liệu: Postgres không cho dùng giá trị enum mới
-- trong cùng transaction vừa thêm nó (migration kế mới UPDATE được).
-- Bổ sung giá trị enum là thao tác cộng thêm (additive) — an toàn, không phá dữ liệu.
ALTER TYPE "InstallStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
