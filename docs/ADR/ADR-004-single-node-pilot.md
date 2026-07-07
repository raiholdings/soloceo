# ADR-004 — Sơ đồ node production pilot

**Trạng thái:** ĐÃ DUYỆT bởi Phạm Văn Thư — 08/07/2026.

## Quyết định
Giữ đúng kiến trúc 2 node của CLAUDE.md Phần 2.2:

| Node | Máy | Vai trò |
|---|---|---|
| **VPS-CORE** (`core-01`) | Contabo Cloud VDS S — 3 core EPYC 7282, 24GB RAM, 180GB NVMe (đã mua) | Coolify controller, api-core, web-community, web-platform, svc-provision, svc-billing-webhooks, Postgres, Redis, LiteLLM, Langfuse, **Supabase self-host** |
| **VPS-TENANT-01** (`tenant-01`) | Mua thêm (khuyến nghị Contabo Cloud VDS M hoặc VPS 32GB) | Toàn bộ stack tenant (Dify + Activepieces + site per-tenant), thêm vào Coolify qua SSH key |

## Auth
**Supabase self-host trên VPS-CORE** (không dùng Supabase Cloud) — deploy bằng
service template Supabase của Coolify. `JWT_SUPABASE_SECRET` lấy từ stack này;
RLS SQL trong `packages/db/rls/` chạy trên Postgres của Supabase.

## Ghi chú RAM VPS-CORE (24GB)
Core stack ~4–6GB + Supabase self-host ~2–3GB + Langfuse ~1–2GB → dư địa an
toàn. Tenant KHÔNG chạy trên core (đúng spec) — svc-provision chỉ chọn server
tenant (RAM <70%).
