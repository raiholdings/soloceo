# R6 — Tích hợp arishem + godlp + g3 vào SoloCEO OS v2

> Bối cảnh: HITL 2 tầng, tuân Nghị định 13/2023/NĐ-CP, mọi LLM qua LiteLLM. Ba lớp phòng thủ: **arishem** = lớp quyết định (gate tool-call), **godlp** = lớp mask PII (trước khi rời hệ thống), **g3** = lớp egress (kiểm soát network).
>
> ⚠️ Phần lớn report này dựa kiến thức training (cutoff 01/2026), lượt viết cuối KHÔNG có mạng xác minh README/tag hiện tại. Version, tên API cụ thể, chi tiết config đều `[CẦN KIỂM CHỨNG]` — tập trung ở cuối.

## A. arishem — Rule engine làm HITL gate

### 1. arishem là gì
- Rule engine **viết bằng Go** (ByteDance). Cung cấp: **ngôn ngữ luật biểu diễn JSON** (condition-tree AND/OR + toán tử so sánh) + engine parse JSON → AST → evaluate với **fact/context** (map key-value).
- Input: (a) rule JSON; (b) context/facts runtime. Output: boolean + nhãn hành động gắn kèm rule khi khớp. `[CẦN KIỂM CHỨNG tên "aviator" cho action]`.
- Điểm mạnh: **rule là dữ liệu** — sửa rule không deploy lại code, lưu DB, version, người vận hành chỉnh được.

Hình dạng JSON rule (điển hình):
```json
{
  "conditions": {
    "logic": "and",
    "sub_conditions": [
      { "lhs": {"fact": "action.type"}, "op": "eq", "rhs": {"const": "spend_money"} },
      { "lhs": {"fact": "action.amount"}, "op": "gt", "rhs": {"const": 5000000} }
    ]
  },
  "aviator": { "decision": "require_approval", "tier": 2 }
}
```
`[CẦN KIỂM CHỨNG]` tên field chính xác (`conditions`/`logic`/`lhs`/`op`/`rhs`). Cấu trúc condition-tree + toán tử gần như chắc đúng.

### 2. Nhúng làm "gate"
**Vấn đề**: arishem là **library Go**, stack SoloCEO là NestJS + MCP (TS/Python) → không gọi trực tiếp. Cần **bọc trong microservice Go** expose HTTP/gRPC:
```
svc-rules-engine (Go): embed arishem, load rules từ Postgres (bảng Rule) mỗi N giây,
  HTTP POST /evaluate {action, context} → {decision, ruleId, tier, matchedRule}
     ▲ HTTP/gRPC
  MCP rules-engine ◄── tool-call layer (gọi trước mỗi action nhạy cảm)
```
**Luồng gate**: agent chuẩn bị tool nhạy cảm → layer trung gian gọi `evaluate(action,context)` → svc-rules-engine chạy arishem trên rule set của org → `decision`: **allow** (chạy ngay) / **deny** (chặn + ruleId) / **require_approval** (tạo `ApprovalRequest`, dừng, đẩy hàng đợi HITL). Ghi mọi phán quyết vào audit.

arishem **thuần library, KHÔNG kèm server HTTP/gRPC** `[CẦN KIỂM CHỨNG cmd/server]` → SoloCEO tự viết wrapper. Ghi **ADR-004: Rules Engine Gate**.

### 3. Bảng DB (Prisma) + danh mục tool-call nhạy cảm
```prisma
model Rule {
  id            String   @id @default(uuid())
  orgId         String?                 // null = rule toàn nền tảng
  name          String
  description   String?
  actionType    String                  // khớp SensitiveAction
  priority      Int      @default(100)  // nhỏ = ưu tiên trước
  conditionJson Json                    // cây điều kiện arishem
  decision      RuleDecision            // ALLOW|DENY|REQUIRE_APPROVAL
  approvalTier  Int?                    // 1|2 (khi REQUIRE_APPROVAL)
  enabled       Boolean  @default(true)
  version       Int      @default(1)
  createdBy     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([orgId, actionType, enabled])
}
model RuleDecisionLog {           // audit mọi phán quyết
  id            String   @id @default(uuid())
  orgId         String
  ventureId     String?
  actionType    String
  contextJson   Json                 // context ĐÃ redact PII trước khi lưu
  decision      RuleDecision
  matchedRuleId String?
  actorUserId   String?
  createdAt     DateTime @default(now())
  @@index([orgId, createdAt])
}
model ApprovalRequest {           // hàng đợi HITL
  id            String   @id @default(uuid())
  orgId         String
  ventureId     String?
  actionType    String
  payloadJson   Json                 // payload tool-call bị giữ (PII masked)
  matchedRuleId String?
  tier          Int                  // 1=auto-policy, 2=người duyệt
  status        ApprovalStatus @default(PENDING)
  decidedBy     String?
  decidedAt     DateTime?
  expiresAt     DateTime?
  createdAt     DateTime @default(now())
  @@index([orgId, status])
}
enum RuleDecision   { ALLOW; DENY; REQUIRE_APPROVAL }
enum ApprovalStatus { PENDING; APPROVED; REJECTED; EXPIRED }
```
Danh mục `SensitiveAction` (`packages/shared/constants`):
| actionType | Mô tả | Mặc định |
|---|---|---|
| `spend_money` | Payment, chi tiền, mua credit AI | REQUIRE_APPROVAL (tier 2 nếu > ngưỡng) |
| `send_bulk_email` | Email/SMS hàng loạt | REQUIRE_APPROVAL |
| `submit_application` | Nộp hồ sơ | REQUIRE_APPROVAL tier 2 |
| `sign_document` | Ký hợp đồng/tài liệu | REQUIRE_APPROVAL tier 2 |
| `publish_public` | Đăng công khai (feed, listing M&A, web) | REQUIRE_APPROVAL tier 1 |
| `delete_data` | Xóa dữ liệu | DENY + REQUIRE_APPROVAL tier 2 |
| `deploy_infra` | Provision/gỡ app Coolify | REQUIRE_APPROVAL tier 1 |
| `transfer_ownership` | Chuyển org_id sở hữu venture (M&A) | REQUIRE_APPROVAL tier 2 (admin RAI) |
| `export_pii` | Xuất dữ liệu chứa PII | REQUIRE_APPROVAL + bắt buộc godlp mask |

HITL 2 tầng → `approvalTier`: **tầng 1** = policy tự động (log lại); **tầng 2** = người duyệt. Hành động không-đảo-ngược (chi tiền/ký/xóa/chuyển sở hữu) luôn tầng 2.

### 4. MCP `rules-engine`
```
Tool: evaluate
Input:  { action: string, context: object }
Output: { decision: "allow"|"deny"|"require_approval", ruleId: string|null, tier?: 1|2, reason?: string }
```
Bắt buộc: **fail-closed** (không phản hồi → `deny` action nhạy cảm); context log qua **godlp** mask trước khi lưu; MCP chỉ **quyết định**, không thực thi; gắn vào **guard tập trung ở api-core** (không tin agent tự giác gọi).

## B. godlp — DLP mask PII

### 5. godlp là gì
- **Thư viện DLP viết bằng Go** (ByteDance): detect + mask PII trong text. Cơ chế regex + từ điển + thuật toán (Luhn cho thẻ). Ra: text đã mask + danh sách phát hiện (loại/vị trí/độ tin cậy — log số lượng không log giá trị).
- Ruleset cấu hình YAML `[CẦN KIỂM CHỨNG]`. PII built-in hướng **thị trường Trung Quốc** (ID 18 số TQ) → VN cần ruleset riêng.

### 6. Ruleset tiếng Việt (bổ sung)
| Loại PII VN | Pattern | Ghi chú |
|---|---|---|
| CCCD 12 số | `\b0\d{11}\b` | Validate 3 số đầu = mã tỉnh để giảm nhầm SĐT |
| CMND 9 số | `\b\d{9}\b` | Cần ngữ cảnh "CMND" |
| SĐT VN | `(?:\+84\|0)(?:3\|5\|7\|8\|9)\d{8}` | Đầu số di động sau 2018 |
| Biển số xe | `\b\d{2}[A-Z]{1,2}[- ]?\d{3,5}\b` | vd 30A-12345 |
| MST | `\b\d{10}(?:-\d{3})?\b` | 10 số hoặc 10-3 |
| Số TK ngân hàng | 8–16 số | Ngữ cảnh + Luhn thẻ 16 số |
| Địa chỉ VN | dict "Phường/Quận/Xã/Huyện/TP" + số nhà | Cần từ điển địa danh |

File `infra/godlp/rules-vn.yaml`, version cùng repo. **Ưu tiên giảm false-negative** (thà mask nhầm còn hơn lọt PII — Nghị định 13). `[CẦN KIỂM CHỨNG]` regex do đề xuất, chưa test false-positive.

### 7. Pre-call hook LiteLLM (mask PROMPT trước khi rời hệ thống)
**Thách thức**: godlp Go, LiteLLM guardrail Python. Ba phương án → **chọn A: sidecar HTTP**:

| PA | Mô tả | Đánh giá |
|---|---|---|
| **A. Sidecar HTTP** ✅ | Bọc godlp trong `svc-dlp` (Go) expose `POST /mask {text}→{masked,findings}`; LiteLLM guardrail Python gọi HTTP nội bộ | Rõ ràng, ngôn ngữ độc lập, tái dùng cho arishem context-masking. +vài ms. **Chọn.** |
| B. CGO/bind | shared lib gọi cffi từ Python | Phức tạp, fragile |
| C. Port Python | Viết lại DLP (Presidio/regex) | Bỏ godlp; cân nhắc nếu muốn thuần Python |

Kiến trúc (A):
```
agent tenant ─► LiteLLM ─pre_call hook─► svc-dlp (Go+godlp) POST /mask
   → {masked_text, findings:[{type,count}]} ─► LiteLLM gửi PROMPT ĐÃ MASK tới Anthropic
   └─► Langfuse: log "pii_masked" {org_id, findings_count_by_type}  ← KHÔNG log giá trị PII
```
Khung guardrail:
```python
# infra/litellm/guardrails/dlp_guardrail.py
from litellm.integrations.custom_guardrail import CustomGuardrail
import httpx
class GodlpGuardrail(CustomGuardrail):
    async def async_pre_call_hook(self, user_api_key_dict, cache, data, call_type):
        for msg in data.get("messages", []):
            if isinstance(msg.get("content"), str):
                r = httpx.post("http://svc-dlp:8080/mask", json={"text": msg["content"]}, timeout=2.0)
                res = r.json()
                msg["content"] = res["masked"]
                data.setdefault("metadata", {})["dlp_findings"] = res["findings"]
        return data
```
`[CẦN KIỂM CHỨNG]` tên hook (`async_pre_call_hook`) + khai `guardrails:` `mode: "pre_call"` trong config.yaml (thay đổi theo version LiteLLM).
**Tuân Nghị định 13**: PROMPT rời SoloCEO (tới Anthropic nước ngoài) đã mask PII → giảm rủi ro chuyển dữ liệu qua biên giới; Langfuse chỉ lưu số lượng.

## C. g3 / g3proxy — Egress proxy

### 8. g3proxy + allowlist per-tenant + audit
- **Bộ proxy hiệu năng cao viết bằng Rust** (ByteDance). g3proxy = forward/egress proxy (HTTP(S), SOCKS5, TLS interception), đa tenant, ACL + audit. `[CẦN KIỂM CHỨNG]`.
- Vai trò: **cổng egress duy nhất** cho sandbox → allowlist domain per-tenant + audit log. Config YAML: escaper (đường ra), auth (client→tenant), acl/rule (chặn/cho theo domain), audit/log.
```yaml
# g3proxy.yaml (khung khái niệm — cú pháp thật cần đối chiếu docs)
server:
  - name: tenant_egress
    type: http_proxy
    auth: { type: basic }          # username = org_id
    escaper: route_by_tenant
escaper:
  - name: route_by_tenant
    type: route_query
    rules:
      - user: "org_abc"
        allow_domains: ["api.stripe.com", "*.payos.vn", "api.anthropic.com"]
    default: deny
audit:
  - name: egress_audit
    log: { type: journal }
```
`[CẦN KIỂM CHỨNG]` tên khối. Lưu allowlist per-org trong DB, sinh YAML qua template (như provisioning sinh compose), reload g3proxy khi đổi.

### 9. Ép AIO Sandbox chỉ đi ra qua g3 (2 lớp — dùng cả hai)
1. **Env proxy (ứng dụng)**: `HTTP_PROXY=http://<org_id>:<token>@g3proxy:3128`, `HTTPS_PROXY=...`, `NO_PROXY=localhost,127.0.0.1,.app.soloceo.vn`. `username=org_id` để g3 áp allowlist.
2. **Chặn network trực tiếp (hạ tầng — BẮT BUỘC, vì env proxy có thể bị bỏ qua)**: sandbox trong **Docker network `internal: true`** (không route ngoài); chỉ g3proxy có egress; hoặc iptables/nftables DROP mọi outbound từ subnet sandbox trừ đích = g3proxy.
```
┌─── Docker net: internal (no direct egress) ───┐
│ AIO Sandbox (org_abc) HTTP(S)_PROXY=g3proxy   │
│   └─► g3proxy ─[allowlist org_abc]─► internet │
└───────────────────────────────────────────────┘
  direct outbound tới IP khác → DROP
```
Map `org_id → domains` lưu DB (bảng `EgressAllowlist{orgId,domain,enabled}`); provision venture → allowlist mặc định (Stripe/PayOS/Anthropic + domain app cài); org xin domain mới → qua **arishem gate** (`deploy_infra`) duyệt.

## D. License + version pin
| Dự án | License | Ghi chú |
|---|---|---|
| arishem | **Apache-2.0** `[CẦN KIỂM CHỨNG]` | Bán-lại dạng dịch vụ OK, giữ NOTICE |
| godlp | **Apache-2.0** `[CẦN KIỂM CHỨNG]` | An toàn thương mại |
| g3/g3proxy | **Apache-2.0** `[CẦN KIỂM CHỨNG]` | Cần xác minh (proxy đôi khi license kép) |

Cả ba nhiều khả năng Apache-2.0 (không MIT). **PHẢI mở `LICENSE` từng repo xác nhận trước go-live** → **ADR-005: License thành phần bảo mật**. Pin SHA cụ thể (không `latest`/`main`), ghi `infra/versions.lock`, build image nội bộ (`soloceo/svc-rules-engine`, `svc-dlp`, `g3proxy`).

## E. Kiến trúc tích hợp tổng thể
```
                 ┌──────── api-core (NestJS) ────────┐
 tool-call ─────►│ SensitiveActionGuard              │
                 │   └─► MCP rules-engine.evaluate()  │
                 └──────────┬─────────────────────────┘ HTTP/gRPC
                  ┌─────────▼──────────┐ fail-closed
                  │ svc-rules-engine   │ allow/deny/require_approval
                  │  + arishem (Go)    │ ↕ Rule / ApprovalRequest
                  └────────────────────┘
 agent ─► LiteLLM ─pre_call─► svc-dlp (Go+godlp) ─► mask PROMPT ─► Anthropic
             └─► Langfuse: "pii_masked" (loại+count)
 AIO Sandbox (internal net, HTTP_PROXY) ─► g3proxy ─[allowlist per org]─► internet
                                              └─► audit log
```
- **3 microservice mới**: `svc-rules-engine`, `svc-dlp`, `g3proxy`.
- **4 bảng DB mới**: `Rule`, `RuleDecisionLog`, `ApprovalRequest`, `EgressAllowlist`.
- **1 MCP**: `rules-engine` (tool `evaluate`). **1 LiteLLM guardrail**: `dlp_guardrail.py`.
- **ADR mới**: ADR-004 (rules gate), ADR-005 (license bảo mật), + ADR egress proxy.

## GIẢ ĐỊNH & CẦN KIỂM CHỨNG
Toàn bộ soạn KHÔNG có mạng lượt cuối — dựa training (cutoff 01/2026). PHẢI xác minh README trước implement:
1. arishem: cú pháp JSON rule chính xác; có server sẵn hay pure library (giả định: library, tự wrap). 2. arishem: danh sách toán tử. 3. godlp: định dạng ruleset YAML, API mask, PII built-in. 4. godlp: regex PII VN do đề xuất, chưa test false-positive. 5. LiteLLM: tên hook chính xác + khai config theo version. 6. g3proxy: toàn bộ cú pháp YAML (server/escaper/acl/audit). 7. g3proxy: cổng mặc định (3128 ví dụ), auth basic mang org_id. 8. **License cả 3: giả định Apache-2.0 — PHẢI mở LICENSE xác nhận** (ảnh hưởng quyền bán-lại). 9. Version/tag: pin SHA khi có mạng. 10. AIO Sandbox honor HTTP_PROXY tới đâu → lớp chặn network hạ tầng là bắt buộc.
