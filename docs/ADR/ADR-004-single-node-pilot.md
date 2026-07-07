# ADR-004 — Sơ đồ node production pilot

**Trạng thái:** ĐÃ DUYỆT bởi Phạm Văn Thư — 08/07/2026.
**Cập nhật:** đổi từ 1× Cloud VDS S sang **2× Contabo Cloud VPS 20**
(6 vCPU / 12GB RAM / 100GB NVMe / 300 Mbit — $7.20/tháng/máy, kỳ hạn 12 tháng).

## Quyết định
Giữ kiến trúc 2 node của CLAUDE.md Phần 2.2:

| Node | Máy | Vai trò |
|---|---|---|
| **VPS-CORE** (`core-01`) | Cloud VPS 20 #1 | Coolify controller, api-core, web-community, web-platform, svc-provision, svc-billing-webhooks, Postgres, Redis, LiteLLM, **Supabase self-host** |
| **VPS-TENANT-01** (`tenant-01`) | Cloud VPS 20 #2 | Toàn bộ stack tenant (site + CRM + Dify + Activepieces per-tenant) |

## Auth
Supabase self-host trên VPS-CORE (Coolify service template), domain
`auth.soloceo.vn`. RLS SQL `packages/db/rls/` chạy trên Postgres của Supabase.

## Ngân sách RAM (12GB/node — chặt hơn thiết kế gốc 16/32GB)
**core-01 (~10GB dùng được sau OS):** Coolify+proxy ~1.5GB · Supabase ~2.5–3GB
· Postgres+Redis ~1GB · LiteLLM ~0.5GB · 5 app SoloCEO ~1.5–2GB → còn ~1.5–2GB
đệm. **Langfuse (v3 cần ClickHouse, nặng) HOÃN sang khi nâng cấp máy** —
tạm đo chi phí AI bằng bảng AiUsage đồng bộ từ LiteLLM (đã có sẵn trong code).
Build Docker image chạy trên swap 4GB — script setup đã lo.

**tenant-01 (~10GB):** Dify ≈ 2.5–3GB/tenant; site+CRM ≈ 0.8–1GB/tenant.
→ Sức chứa pilot ước tính: **~3 tenant GROWTH (có Dify) + 3–4 tenant STARTER**,
hoặc ~8–9 tenant STARTER thuần. Ngưỡng nhận tenant mới giữ nguyên RAM <70%
(svc-provision đã enforce); vượt → mua thêm Cloud VPS 20 làm tenant-02.

## Lối thoát
Cả 2 node cùng cấu hình nên dễ thêm node ngang hàng; khi doanh thu pilot
chứng minh, nâng tenant node lên 32GB theo đúng thiết kế gốc.
