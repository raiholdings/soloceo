# OpenClaw production (ADR-005, approach B)

Repo openclaw/openclaw Dockerfile BUILD SẠCH (multi-stage tốt, không cần vá).
Chỉ cần config RUNTIME đúng + 1 lớp vá header cho Control UI nhúng iframe.

## Runtime config
- CMD: `node openclaw.mjs gateway --allow-unconfigured` (bỏ yêu cầu `openclaw setup` tương tác)
- ENV `OPENCLAW_GATEWAY_TOKEN=<secret>` (bắt buộc để bind public)
- Model qua LiteLLM: `OPENAI_API_BASE=https://llm.soloceo.vn`, `OPENAI_API_KEY=<virtual key>`,
  `OPENCLAW_DEFAULT_MODEL=soloceo-smart` (Claude Sonnet). Mặc định gốc là openai/gpt-5.5.

## CỔNG (QUAN TRỌNG)
OpenClaw gateway **và** Control UI phục vụ trên **18789** — KHÔNG phải 8080.
Trước đây Traefik trỏ 8080 → **502 Bad Gateway**. Traefik/Coolify loadbalancer
port PHẢI là 18789. Control UI trả HTML tại `/`, auth bằng fragment
`#token=<OPENCLAW_GATEWAY_TOKEN>` (đọc client-side, không gửi lên server).

## Vá header Control UI để nhúng iframe (image `soloceo/openclaw:soloceo2`)
Control UI đặt `Content-Security-Policy: ... frame-ancestors 'none'` và
`X-Frame-Options: DENY` trong `/app/dist/control-ui-*.js` → chặn nhúng vào
platform.soloceo.vn. Layer vá (Dockerfile + patch-headers.mjs trên tenant-01
`/opt/openclaw-patch`):
- `frame-ancestors 'none'` → `frame-ancestors 'self' https://platform.soloceo.vn https://soloceo.vn`
- gỡ `res.setHeader("X-Frame-Options", "DENY")`

```dockerfile
FROM localhost:5000/soloceo/openclaw:soloceo
COPY patch-headers.mjs /tmp/patch-headers.mjs
RUN node /tmp/patch-headers.mjs   # replaceAll trên các file /app/dist/*.js
```

Image cuối: `soloceo/openclaw:soloceo2` (push `localhost:5000`). Base
`:soloceo` build trên tenant-01 (cần ~8GB heap); lớp vá chỉ vài giây.

## Lớp 3 — `soloceo3`: entrypoint sinh config từ env (BẢN DÙNG PRODUCTION)
Gateway từ chối WS từ browser nếu origin không nằm trong
`gateway.controlUi.allowedOrigins` (mặc định chỉ localhost → lỗi
"origin not allowed", Claw3D báo "Gateway closed 1011"). Đồng thời env
`OPENAI_API_*` KHÔNG được OpenClaw đọc cho model — phải khai
`models.providers` trong `~/.openclaw/openclaw.json`.

`soloceo3` = `soloceo2` + `/soloceo/gen-config.mjs` (chạy trước gateway,
file nguồn tại tenant-01 `/opt/openclaw-patch/`): sinh `openclaw.json` từ env
nếu chưa tồn tại:
- `OPENCLAW_ALLOWED_ORIGINS` (CSV) → `gateway.controlUi.allowedOrigins`
- `OPENCLAW_TRUSTED_PROXIES` (CSV, mặc định `172.16.0.0/12`) → `gateway.trustedProxies`
  (bắt buộc sau Traefik — không có sẽ cảnh báo proxy headers untrusted)
- `OPENAI_API_BASE` + `OPENAI_API_KEY` → provider `litellm`
  (api `openai-completions`, baseUrl tự thêm `/v1`)
- `OPENCLAW_DEFAULT_MODEL` → `agents.defaults.model.primary = litellm/<model>`,
  fallback `litellm/soloceo-fast`

Đã kiểm chứng: gateway log `agent model: litellm/soloceo-smart`,
`openclaw agent --agent main -m "2+2?"` trả lời qua LiteLLM/Claude.
LƯU Ý Coolify: env dockerimage app phải `is_buildtime=false` (PATCH
/applications/{uuid}/envs) — buildtime env không chắc inject runtime.

## Token gateway
`svc-provision` sinh `OPENCLAW_GATEWAY_TOKEN` ngẫu nhiên mỗi lần deploy và lưu
vào bảng `Secret` (mã hoá AES-256-GCM) key `openclaw_token:<ventureId>`.
api-core `GET /v1/ventures/:id/openclaw-access` trả `{url, token}` cho chủ Org;
OS Shell (AI Studio) nhúng `${url}/#token=${token}`.

## Còn lại
OpenClaw thiết kế quanh chat/channels + Control UI. Inline script theme của
Control UI bị `script-src 'self'` chặn (chỉ cosmetic — app chính load qua module
`./assets/index-*.js` được 'self' cho phép). Onboarding CEO (nhập kênh
Telegram/Discord, skills) để dùng đầy đủ — bước sau.
