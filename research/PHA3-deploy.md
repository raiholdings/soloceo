# PHA 3 — Runbook cài 8 nền tảng v2 (LỆNH CHO ANH TỰ CHẠY)

> Claude Code **KHÔNG tự chạy** phần VPS/Coolify/DNS/registry. Dưới đây là lệnh
> soạn sẵn theo đúng thứ tự spec §6; mỗi bước có smoke test. Chạy sau khi PHA 1
> (dọn v1) + migrate đã áp. Biến chung:
> ```bash
> CORE=194.233.72.150 ; T1=62.146.235.177 ; T2=194.233.85.255
> SSHK="ssh -i ~/.ssh/soloceo_deploy -o IdentitiesOnly=yes"
> REG=localhost:5000   # registry nội bộ trên tenant-01
> ```

## 0. DNS (Cloudflare, DNS-only cho SSL lần đầu)
```
deer.soloceo.vn      → CORE  (Gateway DeerFlow, nếu tách; hoặc dùng soloceo.vn)
rules.soloceo.vn     → CORE  (svc-rules-engine, nội bộ — chặn IP ngoài)
dlp.soloceo.vn       → CORE  (svc-dlp, nội bộ)
egress.soloceo.vn    → T2    (g3proxy, nội bộ)
docs-ocr.soloceo.vn  → (host GPU R730)  (dolphin-docs MCP)
```
> Các service nội bộ (rules/dlp/egress) KHÔNG mở ra internet — chỉ mạng Docker nội bộ.

## Bước 1 — DeerFlow ↔ LiteLLM (+godlp) ↔ Langfuse
1. Pin repo `bytedance/deer-flow` (chọn tag/SHA — `git ls-remote --tags`), mở `LICENSE` (MIT).
2. Copy `platform/deerflow/config.yaml` vào backend; mount `agents/` + `skills/vietnam-business`
   vào `/mnt/skills/custom`. Đặt env `LITELLM_MASTER_KEY`, `LANGFUSE_*`.
3. Build + deploy image DeerFlow (Coolify hoặc docker-compose trên CORE).
4. **Smoke test:** `curl -s https://<deerflow>/api/threads -XPOST` tạo thread OK; chat 1 câu
   → trace hiện ở `trace.soloceo.vn` (Langfuse) kèm tag org_id.
> godlp hook (bước 4) bật sau khi svc-dlp chạy.

## Bước 2 — AIO Sandbox (thay sandbox-local) + g3proxy (egress duy nhất)
1. Pull `ghcr.io/agent-infra/sandbox:1.11.0` (Apache-2.0) về T2.
2. Tạo Docker network `internal: true` cho sandbox (KHÔNG route ngoài). Chạy g3proxy
   trong network có egress + network nội bộ.
   ```bash
   $SSHK root@$T2
   docker network create --internal sbx_internal
   # g3proxy (build từ bytedance/g3, pin SHA; config platform/egress/g3proxy.yaml)
   docker run -d --name g3proxy --network sbx_internal -p 127.0.0.1:3128:3128 \
     -v /opt/soloceo/g3proxy.yaml:/etc/g3proxy/g3proxy.yaml $REG/soloceo/g3proxy:pinned
   # AIO sandbox (per-org, ví dụ demo) — chỉ nói chuyện được với g3proxy
   docker run -d --name sbx_org_demo --network sbx_internal \
     --security-opt seccomp=unconfined \
     -e SANDBOX_API_KEY=$(openssl rand -hex 24) \
     -e PROXY_SERVER=http://org_DEMO:token@g3proxy:3128 \
     -p 127.0.0.1:8081:8080 ghcr.io/agent-infra/sandbox:1.11.0
   ```
3. Viết `SoloAioSandboxProvider` (platform/sandbox/README.md) trong backend DeerFlow, trỏ
   `sandbox.use`; map org_id→sandbox.
4. **Smoke test:** trong sandbox `curl https://api.stripe.com` (trong allowlist) = OK;
   `curl https://vd-ngoai-allowlist.com` = **bị g3 chặn** (DENY, có audit log).

## Bước 3 — arishem (svc-rules-engine) + MCP rules-engine
1. Mở `LICENSE` arishem (giả định Apache-2.0 — ADR-006). Viết wrapper Go `cmd/server`
   (platform/rules/README.md), embed arishem, load bảng `Rule`, expose `POST /evaluate`.
2. Build `$REG/soloceo/svc-rules-engine`, deploy (CORE, nội bộ). Đặt `RULES_ENGINE_URL`
   cho api-core + DeerFlow guardrail.
3. **Smoke test:** `curl rules/evaluate -d '{"action":"spend_money","context":{"amount":9e9}}'`
   → `require_approval`; tắt service → api-core vẫn fail-closed (require_approval). ✅
4. 100% tool-call nhạy cảm bị gate: gọi thử agent chi tiền → tạo `ApprovalRequest`, luồng dừng.

## Bước 4 — godlp (svc-dlp) + pre-call hook LiteLLM
1. Mở `LICENSE` godlp. Viết `svc-dlp` (Go) `POST /mask`, nạp `platform/dlp/rules-vn.yaml`.
2. Build `$REG/soloceo/svc-dlp`, deploy. Copy `infra/litellm/guardrails/dlp_guardrail.py`
   vào LiteLLM; đặt `SVC_DLP_URL`; bật `guardrails:` trong config (đã thêm).
3. **Smoke test:** gửi prompt chứa "CCCD 012345678901, SĐT 0912345678" qua LiteLLM →
   Anthropic nhận bản **đã mask**; Langfuse log `dlp_findings` (loại+count, KHÔNG giá trị).

## Bước 5 — Dolphin MCP `dolphin-docs` (GPU R730)
1. Pin `ByteDance/Dolphin-v2` (HF revision SHA, MIT). Viết FastAPI + vLLM bọc theo
   `mcp-servers/dolphin-docs/CONTRACT.md`; expose `parse_document`.
2. **Benchmark bắt buộc (R5 §4):** 10 mẫu VN (3 CCCD, 3 GPKD, 4 hóa đơn) → ≥90% field
   accuracy strict (giữ dấu) mới dùng; kém → đổi engine (VietOCR/GPT-4o-vision), giữ contract.
3. **Smoke test:** upload ảnh CCCD → JSON `fields{so_cccd,...}` + `confidence`.

## Bước 6 — FlowGram canvas + 3 node + bảng approvals
1. `pnpm --filter @soloceo/web-community add @flowgram.ai/free-layout-editor styled-components`
   (cần mạng; pin exact). Smoke React 19 (`npm ls react`) — nếu vỡ, pin styled-components@^6.
2. Chuyển `flowgram-v2/` → `src/flowgram/`, bỏ khỏi tsconfig exclude, tạo route
   `/quy-trinh` (CSR, ssr:false). Bảng `ApprovalRequest` đã có.
3. **Smoke test:** kéo node agent_task→human_approval; chạy → xuất hiện ApprovalRequest;
   duyệt ở `/v1/approvals` → luồng resume nhánh approved.

## Bước 7 — Midscene (trong image sandbox) chế độ Assist
1. Thêm `@midscene/web@1.10.3` (MIT) vào image sandbox; đặt `MIDSCENE_MODEL_BASE_URL=
   https://llm.soloceo.vn/v1`, `MIDSCENE_MODEL_NAME=soloceo-vision`, `MIDSCENE_MODEL_FAMILY`.
2. Tool `browser_act(instruction)` = 1 Instant Action (KHÔNG `aiAct`); checkpoint HITL ở
   tầng gọi. Ma trận R4: CAPTCHA/ký số/VNeID/OTP/thanh toán = Human-only.
3. **Smoke test:** `browser_act("tra cứu mã số thuế 0101243150 trên gdt")` (Auto, chỉ đọc) OK;
   thao tác submit → dừng chờ duyệt.

## Bước 8 — Sub-agents (6 playbook) + skills/vietnam-business + Zalo + ngắt OpenClaw cũ (C7)
1. `agents/*` + `skills/vietnam-business` mount vào DeerFlow (đã khai trong config.yaml).
2. Zalo: tạo `ChannelBinding` (oa_id→org), lưu Secret OA (app_id/oa_secret_key/token). Cấu
   hình Webhook URL Zalo App = `https://api.soloceo.vn/v1/channels/zalo/webhook/<oaId>`.
   Refresh worker token (cron ~50', lock per-oaId).
3. **C7 hoàn tất:** xác nhận không còn container OpenClaw per-venture chạy (đã stop ở PHA 1).
4. **Smoke test:** nhắn Zalo OA → agent trả lời (trong 48h, free); lead_agent giao việc 6 sub-agent.

## Nghiệm thu §10 (checklist — báo cáo từng tiêu chí)
- [ ] `grep` không còn tham chiếu v1 active (PHA 1 đã đạt trong repo).
- [ ] Sandbox KHÔNG vượt allowlist g3 (bước 2 smoke).
- [ ] 100% hành động nhạy cảm bị gate (bước 3–4 smoke).
- [ ] Trace tag org_id + PII mask (bước 1,4 smoke).
- [ ] CI kiểm license: 8 nền tảng MIT/Apache-2.0 (ADR-006; mở LICENSE 3 lib Go/Rust).
- [ ] KHÔNG merge production tới khi anh duyệt lần cuối.
