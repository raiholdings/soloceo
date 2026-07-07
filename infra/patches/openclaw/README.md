# OpenClaw production (ADR-005, approach B)

Repo openclaw/openclaw Dockerfile BUILD SẠCH (multi-stage tốt, không cần vá).
Chỉ cần config RUNTIME đúng:
- CMD: `node openclaw.mjs gateway --allow-unconfigured` (bỏ yêu cầu `openclaw setup` tương tác)
- ENV `OPENCLAW_GATEWAY_TOKEN=<secret>` (bắt buộc để bind public — giống Claw3D)
- Model qua LiteLLM: `OPENAI_API_BASE=https://llm.soloceo.vn`, `OPENAI_API_KEY=<virtual key>`,
  `OPENCLAW_DEFAULT_MODEL=soloceo-smart` (Claude Sonnet). Mặc định gốc là openai/gpt-5.5.

Image: `soloceo/openclaw:patched` (build trên tenant-01, cần ~8GB heap để build).
Gateway lắng nghe :8080, log "[gateway] ready" + 8 plugins.
LƯU Ý: OpenClaw thiết kế chat/channels + control-ui; cần bước onboarding CEO
(nhập kênh Telegram/Discord, skills) để dùng đầy đủ — sẽ dựng ở bước sau.
