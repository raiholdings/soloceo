# PHA 2 — Tổng hợp Giai đoạn R (R1–R7) & Quyết định cho PHA 3

> 7 report chi tiết: [R1 DeerFlow](R1-report.md) · [R2 AIO Sandbox](R2-report.md) · [R3 FlowGram](R3-report.md) · [R4 Midscene+pháp lý](R4-report.md) · [R5 Dolphin](R5-report.md) · [R6 arishem/godlp/g3](R6-report.md) · [R7 Zalo](R7-report.md).
> Phương pháp: 7 subagent web-research (đọc source tree GitHub thật). Mọi khẳng định chưa chắc gắn `[CẦN KIỂM CHỨNG]` trong từng report.

## Bảng license (nguyên tắc #6 — MIT/Apache-2.0)
| # | Nền tảng | License | Pin | Trạng thái |
|---|---|---|---|---|
| 0 | DeerFlow | MIT | tag/SHA (chưa chốt) | ✅ (mở LICENSE xác nhận) |
| 1 | AIO Sandbox | **Apache-2.0** | `1.11.0` | ✅ |
| 2 | FlowGram.ai | MIT | exact npm | ✅ |
| 3 | Midscene.js | MIT | `@midscene/web@1.10.3` | ✅ |
| 4 | Dolphin | MIT | HF `revision=<sha>` | ✅ |
| 5 | arishem | Apache-2.0 `[KIỂM CHỨNG]` | SHA | ⚠️ mở LICENSE |
| 6 | godlp | Apache-2.0 `[KIỂM CHỨNG]` | SHA | ⚠️ mở LICENSE |
| 7 | g3 | Apache-2.0 `[KIỂM CHỨNG]` | SHA | ⚠️ mở LICENSE |

→ Tất cả MIT/Apache-2.0 (đạt nguyên tắc licence). **ADR-005** ghi xác nhận license 3 thành phần Go/Rust trước go-live thu phí.

## Quyết định kiến trúc rút ra (điểm cắm cho PHA 3)

**#0 DeerFlow** — điểm cắm đã xác định trong source `bytedance/deer-flow`:
- Model→LiteLLM: `config.yaml` `models:` `base_url: https://llm.soloceo.vn`. Fallback đặt ở LiteLLM (factory không có).
- Sandbox: viết `SoloAioSandboxProvider(SandboxProvider)` (method `acquire/get/release`), trỏ `sandbox.use`; map `org_id` qua `thread_id/user_id`.
- **arishem gate = `guardrails/provider.py`** (`evaluate(GuardrailRequest)→GuardrailDecision.allow`) + `middleware.py` chặn mọi tool-call. Deny→interrupt để HITL.
- HITL: Gateway `POST /api/threads/{id}/runs/stream` + resume qua `POST /api/threads/{id}/state`.
- Sub-agents: `custom_agents` trong config (≤3 song song, đã xác nhận `MAX_CONCURRENT_SUBAGENTS=3`). Skills `/mnt/skills/{public,custom}/<name>/SKILL.md`.

**#1 AIO Sandbox** — 1 container/org, port `8080`, SDK `@agent-infra/sandbox`; **bắt buộc** `SANDBOX_API_KEY` + bind `127.0.0.1` + **network isolation chỉ tới g3** (không tin env proxy). CDP qua `cdp_url` (không expose 9222). Pin `ghcr.io/agent-infra/sandbox:1.11.0`.

**#2 FlowGram** — `@flowgram.ai/free-layout-editor` trong `apps/web`, **CSR-only** (`dynamic ssr:false` + `"use client"` + import CSS). 3 node `agent_task`/`human_approval`/`form`. **api-core orchestrate** DeerFlow (FlowGram chỉ canvas+schema). Pin styled-components v6, smoke test React 19.

**#3 Midscene** — **Instant Action + wrapper HITL tự viết** (KHÔNG `aiAct` cho cổng công), CDP mode vào sandbox, VLM qua LiteLLM (`MIDSCENE_MODEL_*` + thêm entry VLM vào litellm config). Ma trận pháp lý: **CAPTCHA/ký số/VNeID/OTP/thanh toán = Human-only** (bảng 30 dòng ở R4).

**#4 Dolphin** — không có HTTP API → **MCP `dolphin-docs`** (FastAPI + vLLM, GPU R730). Contract `parse_document(image, doc_type)→{fields, confidence,...}`. Benchmark 10 mẫu VN ≥90% strict (giữ dấu) mới dùng; kém → đổi engine, giữ contract.

**#5/6/7 arishem/godlp/g3** — 3 microservice bọc HTTP: `svc-rules-engine` (Go+arishem), `svc-dlp` (Go+godlp), `g3proxy` (Rust). Fail-closed. godlp là **pre_call hook LiteLLM** (sidecar HTTP). g3 = egress duy nhất của sandbox + allowlist per-org.

**Channel Zalo** (R7) — webhook controller trong api-core + BullMQ; verify `X-ZEvent-Signature` (SHA256 + **OA Secret Key**, không phải App Secret); token access 1h/refresh 1-lần-3-tháng (worker refresh có lock); cửa sổ 48h/7 ngày. Interface `ChannelAdapter` chung Telegram/Zalo.

## PHA 3 sẽ xây (code trong repo — build xanh từng bước)
1. **DB (Prisma) + migration**: `Rule`, `RuleDecisionLog`, `ApprovalRequest`, `EgressAllowlist`, `ChannelBinding` + enum `RuleDecision`/`ApprovalStatus`. (bảng `approvals` cho HITL FlowGram cũng dùng `ApprovalRequest`).
2. **packages/shared**: hằng `SENSITIVE_ACTIONS` + types.
3. **api-core modules**: `rules` (SensitiveActionGuard + client MCP rules-engine), `approvals` (hàng đợi HITL + duyệt), `channels` (webhook Zalo verify+enqueue).
4. **Config**: `infra/litellm/config.yaml` (+VLM model, +godlp guardrail), `platform/deerflow/config.yaml`, `platform/egress/g3proxy.yaml` (template), `platform/dlp/rules-vn.yaml`.
5. **Scaffold code**: `platform/sandbox` (SoloAioSandboxProvider spec), `mcp-servers/{rules-engine,dolphin-docs}` (contract), `agents/` (6 sub-agent từ playbook), `skills/vietnam-business/`, `channels/zalo` (adapter), `apps/web` FlowGram node defs.
6. **VPS/infra**: SOẠN LỆNH cho user (deploy DeerFlow/AIO/g3proxy/svc-dlp/svc-rules-engine container, DNS, registry) — KHÔNG tự chạy.

## Rủi ro nổi bật (từ R)
- **AIO egress**: env proxy KHÔNG đủ → bắt buộc network isolation hạ tầng (R2/R6).
- **Dolphin tiếng Việt**: dấu thanh chưa xác nhận → benchmark bắt buộc trước khi tin (R5).
- **FlowGram React 19**: rủi ro styled-components → smoke test, có thể ghim React 18 cho apps/web (R3).
- **Midscene**: không có Assist native → HITL do ta bọc; tuyệt đối không `aiAct` cổng công (R4).
- **3 lib Go/Rust**: license cần mở LICENSE xác nhận; đều phải tự wrap microservice (R6).
