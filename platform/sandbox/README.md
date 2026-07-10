# platform/sandbox — AIO Sandbox provider (thay sandbox-local DeerFlow)

Ref: research/R2 + R1 §2 (điểm cắm `SandboxProvider`). Hoàn tất R0 §C6.

## SoloAioSandboxProvider (Python, đặt trong DeerFlow backend khi deploy)
Implement interface `SandboxProvider` của DeerFlow (`sandbox_provider.py`):
`acquire(thread_id, *, user_id) -> sandbox_id`, `get`, `release`.

Trách nhiệm (không có sẵn trong core — R2 §2):
- **Map tenant→sandbox**: `org_id` (lấy từ thread/user metadata) → 1 container AIO
  Sandbox riêng (`http://{host}:8080`). 1 container/org (cô lập).
- **Warm pool + idle timeout**: giữ vài sandbox ấm; reap sandbox idle (cron/controller).
- **Hardening (R2 §5, BẮT BUỘC)**:
  - `SANDBOX_API_KEY` cho mọi sandbox (header `X-AIO-API-Key`).
  - Bind `127.0.0.1:8080` + reverse proxy; KHÔNG expose ra ngoài.
  - **Egress chỉ qua g3**: container sandbox đặt trong Docker network `internal: true`
    (không route ngoài) + `HTTP(S)_PROXY=http://<org_id>:<token>@g3proxy:3128`.
    Không tin env proxy đơn thuần — network isolation hạ tầng là bắt buộc (R6 §9).

## Kết nối
- SDK TS `@agent-infra/sandbox` (`new Sandbox({ baseURL })`), hoặc REST `/v1/*`.
- Browser tự động (Midscene): qua `cdp_url` từ `GET /v1/browser/info` (KHÔNG expose 9222).
- MCP tools sẵn của sandbox tại `/mcp` (browser/file/shell/markitdown).

## Pin
`ghcr.io/agent-infra/sandbox:1.11.0` (Apache-2.0). Chạy `--security-opt seccomp=unconfined`.

> Trạng thái: SPEC. Code provider viết trong backend DeerFlow lúc deploy (Python),
> không nằm trong monorepo TS. Sức chứa tenant-02: ~20–40 sandbox (đo thực tế, R2 §3).
