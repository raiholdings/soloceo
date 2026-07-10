# Điểm nối v2 — chờ PHA 2/3 (R0 §C6/§C7)

> Đánh dấu, **CHƯA cắt**. Chỉ chuyển khi AIO Sandbox (#1) đã sẵn sàng — tránh rủi ro R-1.

## C6 — Sandbox-local của DeerFlow → AIO Sandbox
- DeerFlow engine hiện dùng sandbox-local (thực thi tool trong tiến trình/container của chính DeerFlow).
- **PHA 3 bước 2:** thay bằng `AioSandboxProvider` (1 container/org, warm pool, map tenant→sandbox),
  egress DUY NHẤT qua g3proxy, bind localhost + `SANDBOX_API_KEY`.
- Nghiên cứu trước ở **R1** (AioSandboxProvider) + **R2** (AIO Sandbox nội tại).
- Giữ code sandbox-local cũ dạng fallback có cờ tắt (không xoá).

## C7 — Runtime OpenClaw per-venture → DeerFlow lead_agent + 6 sub-agents
- Điểm nối cũ ở `services/svc-provision/src/worker.ts` đã @deprecated/comment (C2/C4).
- **PHA 3 bước 8:** port 6 playbook (`skills/soloceo-business-builder/*`) thành DeerFlow sub-agents;
  hoàn tất ngắt runtime OpenClaw cũ.

Xem: `research/R0-hien-trang-va-loai-bo.md` §C6/§C7/§D, `SOLOCEO-DEERFLOW-SPEC.md` §5–§6.
