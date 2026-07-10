# PHA 3 — Báo cáo cài 8 nền tảng v2 (nhánh `chuan-bi-v2`)

> Phần **code trong repo**: HOÀN TẤT, build xanh. Phần **VPS/container/GPU**: soạn
> lệnh cho anh chạy (research/PHA3-deploy.md). KHÔNG merge production tới khi anh duyệt.

## Đã làm (code — build 6/6 xanh mỗi bước)
| Hạng mục | File | Nền tảng (spec §6) |
|---|---|---|
| DB: 5 bảng + 2 enum + migration | `packages/db` | #5/6/7, HITL, Zalo |
| `SENSITIVE_ACTIONS` + policy fail-safe | `packages/shared` | #5 (arishem) |
| HITL gate (fail-closed) | `apps/api-core/src/rules` | #5 arishem — bước 3 |
| Hàng đợi duyệt + resume DeerFlow | `apps/api-core/src/approvals` | HITL — bước 3/6 |
| Kênh Zalo (verify chữ ký + adapter) | `apps/api-core/src/channels` | Zalo — bước 8 |
| LiteLLM +VLM +godlp guardrail | `infra/litellm/` | #3 Midscene, #6 godlp — bước 4/7 |
| DeerFlow config (models/sandbox/guardrail/6 agent) | `platform/deerflow` | #0 — bước 1 |
| AIO Sandbox provider spec | `platform/sandbox` | #1 — bước 2 |
| g3proxy allowlist template | `platform/egress` | #7 — bước 2 |
| svc-rules-engine / svc-dlp spec | `platform/rules`, `platform/dlp` | #5/#6 |
| 6 sub-agent + lead_agent | `agents/` | bước 8 |
| skills VN (thay ClawHub) | `skills/vietnam-business` | bước 8 |
| MCP contracts (cố định) | `mcp-servers/{rules-engine,dolphin-docs}` | #4/#5 |
| FlowGram 3 node + canvas | `apps/web-community/flowgram-v2` | #2 — bước 6 |
| ADR-006 (license), ADR-007 (HITL 2 tầng) | `docs/ADR` | — |

## Đặc điểm an toàn đã cài sẵn
- **Fail-closed**: `RulesService` chưa cần svc-rules-engine — mặc định require_approval
  cho hành động không-đảo-ngược (DEFAULT_ACTION_POLICY). Hệ thống an toàn ngay.
- **HITL 2 tầng**: arishem gate (tầng 1) → ApprovalRequest → người duyệt (tầng 2) →
  resume DeerFlow. Nối interrupt-resume qua threadId/runId.
- **Nghị định 13**: godlp mask PII trong prompt trước khi rời hệ thống; audit context mask.
- **Egress**: sandbox chỉ ra qua g3 (network isolation + allowlist per-org).

## Còn lại (VPS/GPU — cần anh chạy, xem PHA3-deploy.md)
- Deploy container: DeerFlow, AIO Sandbox, g3proxy, svc-rules-engine, svc-dlp, Dolphin(GPU).
- Cài npm `@flowgram.ai` (cần mạng) + wire route `/quy-trinh`.
- Thêm `@midscene/web` vào image sandbox.
- **Benchmark Dolphin 10 mẫu VN** (≥90% strict) trước khi tin dùng.
- **Mở LICENSE** arishem/godlp/g3 xác nhận Apache-2.0 (ADR-006).
- Cấu hình Zalo OA webhook + token refresh worker.

## Điều cần anh quyết / xác minh
1. Model VLM cho Midscene: tạm Claude vision; chốt Qwen-VL (BytePlus) hay GPT-4o (R4).
2. Xác nhận license 3 lib Go/Rust (chặn go-live thu phí — ADR-006).
3. `web-community → apps/web` (spec §7): đổi tên hay giữ web-community? (chưa đổi, tránh vỡ).

## Nghiệm thu §10: xem checklist cuối PHA3-deploy.md (chạy sau khi deploy container).
