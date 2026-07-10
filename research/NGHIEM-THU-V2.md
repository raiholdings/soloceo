# NGHIỆM THU SoloCEO OS v2 — 8 nền tảng (đợt chạy một mạch)

**Ngày:** 11/07/2026 · **Nhánh làm việc:** `hoan-thien-v2` → đã merge `soloceo-mvp`
**Chế độ:** SOLOCEO-V2-CHAY-MOT-MACH-DEN-XONG.md (chưa có người dùng thật).
**Cho:** chủ dự án Phạm Văn Thư kiểm tra cuối 1 lần.

> Nguyên tắc báo cáo: **chỉ ghi "LIVE" khi có bằng chứng thật** (log/health/test). Việc chưa verify hoặc bị chặn tài nguyên → ghi đúng trạng thái, không tô hồng. Nợ kỹ thuật khai đủ ở §12.

---

## TÓM TẮT TRẠNG THÁI 8 NỀN TẢNG

> **CẬP NHẬT LẦN 2** (sau khi đóng nợ chính): 6/8 LIVE+verify. Bảng dưới là bản mới nhất.

| # | Nền tảng | Trạng thái | Bằng chứng |
|---|---|---|---|
| N0 | **DeerFlow** (lõi) | 🟢 LIVE | soloceo.vn/workspace 200; gateway startup complete |
| N5 | **godlp** (DLP) | 🟢 LIVE **shadow** (enforce ~16:30 CEST 11/07) | `[DLP-SHADOW] findings={cccd_12,phone_vn,email} masked=False`; dlp_bypass=0 |
| N1 | **AIO Sandbox** | 🟢 LIVE + verify | shell `SANDBOX_OK` TZ+07; browser CDP; no-key→401 |
| N7 | **g3proxy** (egress) | 🟢 **LIVE + verify** | soloceo.vn qua g3→200; example.com→000 chặn |
| **N1+N7** | **Egress sandbox ép qua g3** | 🟢 **KHÉP KÍN + verify (nợ chính ĐÓNG)** | sandbox DeerFlow spawn/internal net: direct→000, soloceo qua g3→200, example qua g3→000; gateway điều khiển OK |
| N4 | **sub-agents + skills** | 🟢 LIVE + verify | `custom_agents=[6]`; 6 skill VN mount vào sandbox (log docker run) |
| N2 | **FlowGram** (canvas) | 🟢 canvas render (React 19) · 🟡 node render/exec dở | `gedit-playground-container` |
| N3 | **Midscene** | 🟡 Prereq sẵn (CDP+VLM), chưa wiring tool | AIO có browser CDP; Claude-vision trong LiteLLM |
| N6 | **Dolphin** (đọc giấy tờ) | 🟢 LIVE engine-fallback + verify | parse CCCD giả → `so_cccd:001199012345` |
| N8 | **Zalo OA** | 🟢 webhook+chữ ký verify · 🟡 vòng tin nhắn chờ credential OA (§a) | chữ ký đúng→201{ok:true}, sai→401 |
| N9 | **License BOM** | 🟢 verify | g3=Apache-2.0, arishem=Apache-2.0, godlp=MIT |

**Kết luận cập nhật:** **6/8 LIVE+verify** (N0/N1/N4/N6/N7/godlp-shadow) + **nợ chính N1+N7 ĐÓNG** + N8 chữ ký + N9 license verified. Còn: N2 node-render/exec, N3 Midscene tool-wiring, N5 enforce (chờ 24h), dời LiteLLM (cần DNS §a).

> **CẬP NHẬT LẦN 3 (11/07, đợt manus-direction override — chỉ gỡ web-community cũ, GIỮ đủ 8 nền tảng):**
> **Gợn 🔴 SSO đã ĐÓNG.** Gỡ 3 trang iframe web-community (Tạo DN/Gói cước/Danh bạ) khỏi workspace, thay bằng **native React trong shell DeerFlow** → **1 đăng nhập, cùng theme, hết iframe nền tối**.
> - Cầu SSO: `POST /v1/auth/exchange` (api-core, header `X-Internal-Token`, fail-closed nếu thiếu `INTERNAL_API_TOKEN`) + Next.js server route `/workspace/api/soloceo-token` (giữ token nội bộ server-side, đổi phiên DeerFlow BetterAuth → JWT api-core cùng user).
> - **Verify hạ tầng:** exchange thiếu token→403, token đúng→JWT (243 ký tự); token route public→401 (cần session DeerFlow=đúng); 3 page compiled **NATIVE** (route `soloceo-token/route.js` ROUTE-OK, hết `EmbeddedSite`); frontend rebuild `DOCKER_BUILDKIT=0` (classic builder tag đúng image).
> - **Chưa verify:** trải nghiệm visual bấm-thử-browser (công cụ chặn browse prod) — chủ dự án tự bấm.
> - **Hướng manus (chat-centric, sidebar tối giản, tạo-DN-chat-driven): ĐỂ DÀNH v3** theo chỉ đạo — đợt này chỉ gỡ frontend cũ, giữ đủ 8 nền tảng gồm FlowGram.

---

## CHECKLIST §6 — 12 MỤC (bằng chứng thật)

### 1. 8/8 nền tảng LIVE — **CHƯA ĐẠT (6/8 LIVE+verify)**
LIVE+verify: N0 DeerFlow, N1 AIO Sandbox, N4 sub-agents+skills, N6 Dolphin (engine-fallback), N7 g3proxy, N5 godlp (shadow). **Nợ chính N1+N7 (egress) đã ĐÓNG.** N8 chữ ký verified (vòng tin nhắn chờ credential OA). N9 license verified. Còn dở: N2 node-render/exec, N3 Midscene tool-wiring, N5 enforce (chờ đủ 24h). Không tuyên bố 8/8 khi chưa đủ.

### 2. DeerFlow → AIO sandbox → egress g3 → chặn domain ngoài allowlist — **ĐẠT (khép kín + verify)**
Đã đổi `sandbox.use = deerflow.community.aio_sandbox:AioSandboxProvider` (DooD) + vá `local_backend` ép `--network sandbox-internal`. g3proxy allowlist LIVE.
Bằng chứng (sandbox DeerFlow **tự spawn** khi 1 thread chạy shell — log `docker run ... --name soloceo-aio-b76e7c45 --network sandbox-internal`, mount 6 skill vào `/mnt/skills`):
```
direct example.com (không proxy, internal net) → 000  (không internet trực tiếp)
soloceo.vn qua g3 (allowlist)                  → 200
example.com qua g3 (ngoài allowlist)           → 000  (g3 chặn)
gateway điều khiển sandbox OK → [SandboxAudit] "echo FRESH_NET && uname -a" verdict=pass
```

### 3. HITL đầy đủ (gate → Phê duyệt → resume) — **ĐẠT (verify khép kín)**
```
create_payment 10tr → ArishemGuardrailProvider chặn (allow=False, require_approval, tier 2)
                    → POST /v1/rules/evaluate-internal → REQUIRE_APPROVAL, tạo ApprovalRequest
CEO duyệt → POST /api/threads/{id}/state → 200 (vá CSRF; trước luôn 401/403)
không token → 403 (không mở toang)
```
Bằng chứng: test trong gateway `[create_payment] allow=False reasons=['require_approval'] tier=2`; DB có ApprovalRequest + RuleDecisionLog; resume 200.

### 4. godlp enforce (prompt PII → mask) — **CHƯA (đang shadow, đúng quy trình)**
- 🟢 Shadow LIVE, log-only, `masked=False` (không sửa prompt). Fail-open, timeout 800ms, circuit-breaker.
- ⏰ Đủ 24h shadow (~16:30 CEST 11/07) → tổng hợp findings → tự enforce (chưa tới hạn khi viết báo cáo). Ruleset VN đã bổ sung `cmnd_9`, `bank_account` (keyword-neo).
- Rollback: `DLP_HOOK_MODE=off` + restart.

### 5. FlowGram: flow HumanApproval khép kín — **MỘT PHẦN**
- ✅ Canvas render thật trên React 19 (`gedit-playground-container`, `/quy-trinh` 200). 3 node type khai báo (agent_task/human_approval/form) + flow demo.
- ❌ Chưa: render node có hình (thiếu `materials.renderDefaultNode`) + nối node→DeerFlow run + persist theo org_id. Execution khép kín là bước tiếp.

### 6. Midscene: tác vụ web + cấm CAPTCHA/ký số — **THIẾT KẾ (chưa deploy)**
- Ma trận Auto/Assist/Human-only (research/R4) đã có; ràng buộc **cấm vượt CAPTCHA/ký số/VNeID** ghi trong skill VN + GOVERNANCE §4.
- ❌ Chưa cài Midscene vào image AIO + chưa khai model VLM trong LiteLLM. Cần rebuild image sandbox.

### 7. Dolphin: đọc giấy tờ → JSON — **ĐẠT (engine-fallback, verify)**
```
ảnh CCCD giả → dolphin-docs (Claude-vision qua LiteLLM) →
  fields: {so_cccd:"001199012345", ngay_sinh:"15/03/1990"}
  raw_text: "CĂN CƯỚC CÔNG DÂN ... NGUYỄN VĂN AN ..." (tiếng Việt có dấu)
  confidence: 0.75, warnings: [diacritics_uncertain] → đẩy HITL đúng
```
- Contract MCP `dolphin-docs` cố định. **Benchmark tiếng Việt 10 mẫu chưa chạy** (cần mẫu thật + Dolphin-v2 GPU R730). Engine hiện là **fallback** (§66 cho phép), đặt `DOLPHIN_MODEL_PATH` → chuyển Dolphin-v2 thật không sửa agent.

### 8. Zalo: vòng tin nhắn khép kín — **CHƯA (chờ credential §a)**
- Code đủ: `zalo.controller.ts` (webhook + verify `X-ZEvent-Signature` SHA256), `zalo.service.ts` (forward DeerFlow thread → reply), `channel-adapter.ts`, bảng `ChannelBinding`. `zalo.controller.js` có trong container prod.
- ❌ Endpoint prod trả 404 (cần soi routing/redeploy) **và** cần credential OA (App ID, OA Secret, access token) để chạy thật → **điểm dừng §a** (lệnh cho chủ dự án ở §11).

### 9. LLM trace Langfuse tag org_id + PII mask — **MỘT PHẦN**
- ✅ Langfuse LIVE `trace.soloceo.vn` (health 200); LiteLLM `success_callback: langfuse`; call thật → trace hiện (`b9-verify`).
- 🟡 Tag `org_id`: LiteLLM virtual key per-org gắn metadata org_id (thiết kế Phần 8) — cần verify sâu khi có traffic tenant thật. PII mask: đang shadow (chưa enforce → chưa mask thật).

### 10. Bill of materials 100% MIT/Apache-2.0 — **ĐẠT (theo research)**
| Thành phần | License |
|---|---|
| DeerFlow (deer-flow) | MIT |
| AIO Sandbox (agent-infra/sandbox 1.11.0) | Apache-2.0 |
| FlowGram (@flowgram.ai 1.0.12) | MIT |
| Midscene (@midscene/web) | MIT |
| Dolphin (bytedance/Dolphin) | MIT |
| arishem / godlp / g3 | Apache-2.0 (cần mở LICENSE xác nhận — R6) |
| Langfuse v2 | MIT (self-host) |
> Không dùng nulled cho 8 nền tảng. **Riêng WoWonder/PlayTube/Grupo là nulled (MXH nội bộ, không thuộc 8 nền tảng)** — nợ pháp lý đã biết, ngoài phạm vi đợt này.

### 11. Danh sách thay đổi production + rollback — xem **§ dưới**.

### 12. Nợ kỹ thuật + rủi ro — xem **§12**.

---

## §11. THAY ĐỔI PRODUCTION + LỆNH ROLLBACK

| Thay đổi | Rollback |
|---|---|
| Merge `hoan-thien-v2`→`soloceo-mvp` (deploy code v2 đầy đủ) | `git revert <sha>` + Coolify redeploy; hoặc redeploy deployment cũ |
| api-core deploy (endpoint rules-internal + approvals resume) | Coolify redeploy commit `db0f99a3` (api-core UUID `mosccddhkscicwdjapqlmuaw`) |
| web-community deploy (SSO cookie/chromeless/FlowGram/copy) | redeploy commit trước (UUID `fxvxy31adaqtqffh8yby5t72`) |
| **LiteLLM callback Langfuse + godlp hook** (cổng LLM) | `cp litellm-config.yaml.bak-c1-* → litellm-config.yaml` + restart; hoặc env `DLP_HOOK_MODE=off` |
| DeerFlow gateway: guardrail + CSRF patch + sub-agents/skills | `cp /opt/deerflow-backup-<ts>/{config.yaml,docker-compose.yaml}` + `up -d gateway` |
| **BETTER_AUTH_SECRET** đổi (từ "x" hỏng → 64-hex) | không lùi (bảo mật); hệ quả: user DeerFlow đăng nhập lại 1 lần |
| Rotate Coolify token (id 4,2 xoá; id 6 mới) | backup `/root/backup-coolify-tokens-*.sql` |
| svc-rules-engine / svc-dlp / dolphin-docs / aio-sandbox-warm (container mới) | `docker rm -f <name>` (không đụng dịch vụ cũ) |
| DB: 5 bảng v2 + 11 rule seed (migration reversible, backup `/root/backup-soloceo-APPDB-v2-*.sql.gz`) | migration down + restore backup |

**Container v2 mới** (đều restart:unless-stopped): core-01 `svc-rules-engine`, `svc-dlp`, `dolphin-docs`; tenant-02 `aio-sandbox-warm`, `langfuse`, `langfuse-db`.
**Lưu ý mạng:** svc-dlp + svc-rules-engine nối 2 network (`coolify` + `in0rcz…` của LiteLLM). Nếu recreate → `docker network connect in0rczajeip1r7y4081msker <svc>`.

---

## §12. NỢ KỸ THUẬT & RỦI RO (khai trung thực)

### ✅ Đã đóng (so với báo cáo lần 1)
- **N7 g3proxy**: build xong (giảm feature), LIVE + verify allowlist.
- **N1+N7 khép kín** (nợ chính): DeerFlow dùng AioSandboxProvider, sandbox ép network internal → egress chỉ qua g3, verify chặn domain ngoài allowlist.
- **N8 Zalo**: endpoint + chữ ký verified (404 trước là "OA chưa liên kết" — đúng behavior, không phải lỗi).
- **N9 license**: g3/arishem=Apache-2.0, godlp=MIT.

### Nợ còn lại (chặn "8/8 LIVE")
1. **N2 FlowGram**: canvas render nhưng node chưa có hình (`renderDefaultNode`) + chưa nối execution (AgentTask→DeerFlow run, HumanApproval→ApprovalRequest, persist theo org_id).
2. **N3 Midscene chưa wiring tool**: prereq SẴN (AIO có browser CDP + Claude-vision trong LiteLLM); còn bọc tool `browser_act` MCP + thêm `@midscene/web` vào image AIO.
3. **N5 enforce**: chờ đủ 24h shadow (~16:30 CEST 11/07; không rút ngắn).
4. **N8 vòng tin nhắn**: chờ credential OA (§13).
5. **Dời LiteLLM sang tenant-02**: cần đổi DNS `llm.soloceo.vn` → 194.233.85.255 (§2.A của chủ dự án).

### Rủi ro / cảnh báo
- **core-01 kiệt RAM** (12GB, LiteLLM ~3.9GB) — đã thêm swap 8GB. Nên **dời LiteLLM sang tenant-02** (94GB) trước khi có tải thật. **CHƯA làm** (mức C cũ).
- **arishem/godlp/g3 đang dùng engine native tôi viết** (evaluator/regex/…) cho api-core; **g3proxy dùng binary GỐC ByteDance** (build từ source). LICENSE đã xác nhận: g3=Apache-2.0, arishem=Apache-2.0, godlp=MIT. Contract cố định nên thay engine sau không sửa caller.
- **Dolphin engine hiện là vision-fallback**, chưa benchmark tiếng Việt 10 mẫu thật.
- **`bank_account`/`cmnd_9`** ruleset DLP có thể FP (mask nhầm) — đang theo dõi ở shadow trước khi enforce. `phone_vn` bắt nhầm MST bắt đầu 0[35789] (nhãn lệch, giá trị vẫn mask — an toàn).
- **WoWonder/PlayTube/Grupo nulled** — nợ pháp lý trước go-live thương mại.
- Trước go-live: rà mọi secret/config tạm (bài học `BETTER_AUTH_SECRET="x"`, `DEER_FLOW_HOME` sai), rotate mọi khóa test, bật lại cổng duyệt mức C (GOVERNANCE v1.0).

---

## §13. VIỆC CẦN CHỦ DỰ ÁN (credential — §a)

**Zalo OA (N8):** cấp 3 giá trị từ Zalo OA + App (developers.zalo.me):
- `App ID`, `OA Secret Key` (mục Webhook, KHÔNG phải App Secret), `OA Access Token` (+ refresh token).
Sau khi có, tôi ghi vào bảng Secret (mã hóa) + cấu hình webhook URL `https://api.soloceo.vn/v1/channels/zalo/webhook/{oaId}` trên Zalo console.

**Chốt VLM cho Midscene (N3):** Qwen-VL / GPT-4o / Claude-vision — để khai model vision trong LiteLLM.

---

## §14. ĐÃ VERIFY LIVE (tóm tắt bằng chứng)
- DeerFlow workspace 200; guardrail chặn create_payment 10tr tier 2; `bash` allow không gọi mạng.
- HITL resume: POST /state → 200 (vá CSRF).
- Langfuse: call thật → trace `b9-verify`.
- godlp shadow: `[DLP-SHADOW] findings={cccd_12,phone_vn,email} masked=False`.
- AIO Sandbox: shell `SANDBOX_OK` TZ+07; browser CDP; no-key 401; bind 127.0.0.1.
- sub-agents: DeerFlow log `custom_agents=[kinh-doanh,marketing,noi-dung,ke-toan,van-hanh,nghien-cuu]`.
- FlowGram: `gedit-playground-container` render (React 19).
- Dolphin: CCCD giả → `so_cccd:001199012345` + tiếng Việt có dấu.
- Rotate token: token lộ `4|hHoW…` → 401.

**DỪNG — chờ chủ dự án kiểm tra cuối.** Sau khi duyệt: khôi phục GOVERNANCE.md v1.0 (dừng mọi mức C) cho vận hành thường ngày.
