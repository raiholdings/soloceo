-- =====================================================================
-- Chính sách RLS (CLAUDE.md Phần 4.1) — chạy trên Supabase Postgres.
-- api-core dùng service key (bypass RLS); RLS bảo vệ khi frontend truy
-- vấn trực tiếp Supabase (PostgREST/Realtime) và là lớp phòng thủ thứ 2.
--
-- Custom claim org_id gắn vào JWT khi login (Supabase Auth Hook).
-- helper: auth.jwt() ->> 'org_id'
-- =====================================================================

-- Helper function lấy org_id từ JWT
CREATE OR REPLACE FUNCTION public.current_org_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'org_id',
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata' ->> 'org_id'
  )
$$;

-- ---------- Org ----------
ALTER TABLE "Org" ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_select ON "Org" FOR SELECT
  USING (id = public.current_org_id());
CREATE POLICY org_update ON "Org" FOR UPDATE
  USING (id = public.current_org_id());

-- ---------- Venture ----------
ALTER TABLE "Venture" ENABLE ROW LEVEL SECURITY;
CREATE POLICY venture_owner_all ON "Venture" FOR ALL
  USING ("orgId" = public.current_org_id());
-- Hồ sơ public: venture LIVE/LISTED ai cũng đọc được (danh bạ)
CREATE POLICY venture_public_select ON "Venture" FOR SELECT
  USING (status IN ('LIVE', 'LISTED'));

-- ---------- AppInstall ----------
ALTER TABLE "AppInstall" ENABLE ROW LEVEL SECURITY;
CREATE POLICY appinstall_owner ON "AppInstall" FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "Venture" v
    WHERE v.id = "AppInstall"."ventureId"
      AND v."orgId" = public.current_org_id()
  ));

-- ---------- Subscription ----------
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_owner ON "Subscription" FOR SELECT
  USING ("orgId" = public.current_org_id());

-- ---------- Transaction (sổ cái — nhạy cảm) ----------
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY transaction_owner ON "Transaction" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "Venture" v
    WHERE v.id = "Transaction"."ventureId"
      AND v."orgId" = public.current_org_id()
  ));
-- INSERT/UPDATE chỉ qua api-core service key — không cấp policy cho user.

-- ---------- Listing ----------
ALTER TABLE "Listing" ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_owner_all ON "Listing" FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "Venture" v
    WHERE v.id = "Listing"."ventureId"
      AND v."orgId" = public.current_org_id()
  ));
-- Public: listing LIVE cho SELECT (số nhạy cảm đã ẩn ở tầng API —
-- chỉ hiện ttmRevenue dạng khoảng)
CREATE POLICY listing_public_select ON "Listing" FOR SELECT
  USING (status = 'LIVE');

-- ---------- Offer ----------
ALTER TABLE "Offer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY offer_buyer ON "Offer" FOR ALL
  USING ("buyerOrgId" = public.current_org_id());
CREATE POLICY offer_seller_select ON "Offer" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM "Listing" l JOIN "Venture" v ON v.id = l."ventureId"
    WHERE l.id = "Offer"."listingId"
      AND v."orgId" = public.current_org_id()
  ));

-- ---------- Post / Comment / Like (feed public) ----------
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
CREATE POLICY post_public_select ON "Post" FOR SELECT USING (true);
CREATE POLICY post_owner_write ON "Post" FOR ALL
  USING ("orgId" = public.current_org_id());

ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY comment_public_select ON "Comment" FOR SELECT USING (true);
CREATE POLICY comment_owner_write ON "Comment" FOR ALL
  USING ("orgId" = public.current_org_id());

ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;
CREATE POLICY like_public_select ON "Like" FOR SELECT USING (true);
CREATE POLICY like_owner_write ON "Like" FOR ALL
  USING ("orgId" = public.current_org_id());

-- ---------- AiUsage ----------
ALTER TABLE "AiUsage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY aiusage_owner ON "AiUsage" FOR SELECT
  USING ("orgId" = public.current_org_id());

-- ---------- CatalogApp (public catalog) ----------
ALTER TABLE "CatalogApp" ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_public_select ON "CatalogApp" FOR SELECT
  USING (active = true);
