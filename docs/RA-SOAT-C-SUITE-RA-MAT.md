# SOLOCEO.VN — RÀ SOÁT TOÀN DIỆN CẤP C-SUITE & LỘ TRÌNH RA MẮT
**Ngày:** 13/07/2026 · Rà soát dưới 6 lăng kính giám đốc để trả lời: **thừa gì · thiếu gì · sẵn sàng ra mắt chưa.**

---

## 0. TRẢ LỜI NGAY 2 CÂU HỎI CỦA CHỦ DỰ ÁN

**(1) "Phê duyệt cần đăng nhập lại, chuyển sang app" — ĐÃ SỬA.**
Trang Phê duyệt trước đọc token từ cookie `soloceo_token` (cơ chế Supabase cũ) → không có → hiện nút "Đăng nhập" trỏ `app.soloceo.vn/dang-nhap`. Nay dùng **cầu SSO thống nhất** (`soloceoApi`) như mọi trang native khác → **1 đăng nhập duy nhất**, không còn nhảy sang app. (Verify: route 307, bundle sạch link cũ.)

**(2) "app.soloceo.vn giờ còn áp dụng gì?" — GẦN NHƯ KHÔNG CÒN GÌ.**
`app.soloceo.vn` (web-community, container `fxvxy…`) là **sản phẩm v1 cũ**. Sau khi mọi trang chuyển thành native trong shell DeerFlow (`soloceo.vn/workspace`), app.soloceo.vn **bị bỏ rơi**: trang duy nhất còn trỏ tới nó là nút đăng nhập của Phê duyệt (vừa gỡ). 3 iframe xã hội (Cộng đồng/Video/Nhóm chat) trỏ `my.soloceo.vn` (WoWonder), **không phải app**. ⇒ **app.soloceo.vn là hệ thống THỪA, nên retire.**

---

## 1. 👔 CEO — Sẵn sàng ra mắt & bức tranh lớn

**Điểm mạnh:** sản phẩm lõi chạy end-to-end thật — CEO kể ý tưởng → AI đánh giá → đội 6 AI làm trong sandbox → HITL duyệt → doanh thu ghi sổ. 8/8 nền tảng có chức năng chạy. 94 trợ lý + 39 gói mô hình kinh doanh là tài sản khác biệt.

**Chặn ra mắt (hard blockers):**
1. **Chưa có đường tiền thật** — Payments mới test-mode. Cần 4 quyết định C.4 (bán gì/giá/cổng/kênh) + key Stripe/PayOS live.
2. **DNS wildcard** `*.app.soloceo.vn` chưa trỏ node PaaS tenant-03 → app CEO mua chưa sống public.
3. **Chưa có Điều khoản dịch vụ + Chính sách dữ liệu** (Nghị định 13) đăng công khai — bắt buộc trước khi nhận người dùng thật.

**Kết luận CEO:** **Sẵn sàng cho PILOT ĐÓNG (10-20 CEO mời riêng)** ngay sau khi dọn redundancy + DNS. **Ra mắt công khai** cần thêm đường tiền + pháp lý.

---

## 2. 🧭 CPO — Sản phẩm: tính năng THỪA & THIẾU

### Tính năng THỪA (nên gỡ/gộp để sản phẩm sắc, không loãng)
| Thừa | Lý do | Đề xuất |
|---|---|---|
| **app.soloceo.vn (web-community)** | Mọi trang đã có bản native trong shell | **Retire** (stop container, giữ DNS redirect → soloceo.vn) |
| **Trang `/workspace/tao-doanh-nghiep`** | Đã bị **`/workspace/bat-dau`** thay thế (onboarding sâu hơn) | Redirect tao-doanh-nghiep → bat-dau |
| **94 trợ lý mặc định** | Quá nhiều → CEO tê liệt lựa chọn | Gom thành **~15 nhóm** hiển thị, còn lại làm kho tri thức nền |
| **web-platform (v1 OS Shell)** | Đã tắt từ cut-over v2 | Xác nhận đã ngừng hẳn (platform.soloceo.vn → 000) |

### Tính năng THIẾU để trải nghiệm trọn vẹn
1. **Thanh toán mua app trong Chợ** — hiện cài free; chưa gắn đường tiền (mức C, chờ giá/cổng).
2. **Thông báo (notification)** khi có việc chờ Phê duyệt / agent xong — hiện CEO phải tự vào xem.
3. **Zalo OA** (N8) — chờ credential; là kênh chạm khách quan trọng ở VN.
4. **Trạng thái công khai** (status.soloceo.vn) + **onboarding có hướng dẫn lần đầu** (tour).

---

## 3. 🎯 CXO — Trải nghiệm khách hàng: tính nhất quán

**Đã đạt (điểm sáng):** sau các phiên gần đây, **13/16 trang workspace là NATIVE, 1 đăng nhập** (SSO bridge). Sidebar gọn, theme đồng nhất.

**Gợn còn lại:**
- **3 trang xã hội vẫn iframe** (Cộng đồng/Video/Nhóm chat → WoWonder `my.soloceo.vn`): WoWonder có hệ đăng nhập RIÊNG → CEO có thể bị hỏi đăng nhập lần 2 ở các trang này. Đây là gợn SSO CÒN LẠI (giống lỗi Phê duyệt vừa sửa, nhưng WoWonder khó nhúng SSO hơn).
- **Chưa có empty-state hướng dẫn** ở vài trang khi org rỗng (đã sửa lỗi 500 Quy trình bằng lazy-create org — nay các trang ghi dữ liệu đều chịu được user chưa onboarding).

**Ưu tiên CXO:** (a) làm 3 trang xã hội đồng bộ đăng nhập với WoWonder (token bridge WoWonder→shell), hoặc gom xã hội vào 1 mục "Cộng đồng" duy nhất; (b) thêm thông báo.

---

## 4. 🏗️ CTO — Hạ tầng & nợ kỹ thuật

**Hạ tầng 4 VPS Coolify:** core-01 (kiệt RAM 8.2/11GB — LiteLLM ngốn ~4GB), tenant-01 (WoWonder), tenant-02 (DeerFlow), tenant-03 (PaaS 94GB, dư nhiều).

| Việc | Tác động | Mức |
|---|---|---|
| **Dời LiteLLM core-01 → tenant-02** | Gỡ nghẽn RAM core-01 (đang gây fail build) | Cao — chờ DNS `llm` |
| **Retire app.soloceo.vn** | Bớt 1 hệ thống phải bảo trì | Thấp rủi ro, làm ngay được |
| **Browser egress qua g3** | Hardening — browser_act chưa chắc qua g3 (shell đã qua) | Trung bình |
| **DNS wildcard → tenant-03** | App CEO mua sống public | Cao — việc tay |
| **Backup + monitor** (Uptime Kuma, status page) | Vận hành bền vững | Cao trước go-live |

**Nợ kỹ thuật đã khai:** N2/N3 vừa đóng; còn browser-egress-g3, Dolphin-v2 GPU, tag org_id sâu trên trace.

---

## 5. 💰 CFO — Đường tiền & chi phí

- **Doanh thu:** chưa có giao dịch live. Chặn: 4 quyết định C.4 + key cổng thật. Sổ cái Transaction + badge "verified" đã sẵn.
- **Chi phí đang chạy:** ~4 VPS Contabo + API LLM (batch 178 sách chỉ tốn ~$0.5 — chi phí AI rất thấp nhờ model rẻ + trần budget). core-01 kiệt RAM là rủi ro vận hành > chi phí.
- **Đơn vị kinh tế:** cần đo "chi phí AI / 1 đồng doanh thu" khi có giao dịch thật (openclawos làm mẫu).

---

## 6. 🔐 CISO — An ninh & tuân thủ

**Đã tốt:** godlp ENFORCE (che PII), HITL 2 tầng (arishem→Phê duyệt), g3 egress allowlist (shell), browser_act cấm CAPTCHA/OTP/ký số, trợ lý hệ thống khoá xoá (409), rotate Coolify token, dev-login tắt ở prod.

**Cần xử lý trước go-live:**
1. **Đổi mật khẩu Appsmith** (`soloceo@123` đã lộ trong chat).
2. **OpenClaw Control UI** đang `dangerouslyDisableDeviceAuth=true` — rà trước khi bán rộng.
3. **Browser egress qua g3** (hardening).
4. **Rà license** (ADR-001 Dify không còn dùng; xác nhận LiveSmart bản quyền thương mại đã mua).

---

## 7. 🗺️ LỘ TRÌNH RA MẮT (ưu tiên, nhiều phiên)

### Phiên A — Dọn dẹp & nhất quán (làm ngay, rủi ro thấp)
- [x] Sửa Phê duyệt SSO (xong phiên này)
- [ ] Retire app.soloceo.vn (redirect → soloceo.vn); tao-doanh-nghiep → bat-dau
- [ ] Gom 94 trợ lý thành ~15 nhóm hiển thị
- [ ] Gộp/đồng bộ 3 trang xã hội (SSO WoWonder hoặc gom 1 mục)

### Phiên B — Sẵn sàng vận hành (trước pilot)
- [ ] Dời LiteLLM → tenant-02 (chờ DNS `llm`)
- [ ] DNS wildcard `*.app` → tenant-03
- [ ] Thông báo in-app (việc chờ duyệt / agent xong)
- [ ] Uptime Kuma + status.soloceo.vn + backup đêm đã test khôi phục

### Phiên C — Ra tiền thật (chờ quyết định chủ dự án)
- [ ] 4 quyết định C.4 → key Stripe/PayOS live → 1 giao dịch verified
- [ ] Thanh toán mua app trong Chợ
- [ ] Zalo OA (credential)

### Phiên D — Pháp lý & bảo mật go-live
- [ ] Điều khoản dịch vụ + Chính sách dữ liệu (Nghị định 13) đăng công khai
- [ ] Đổi mật khẩu Appsmith; rà OpenClaw device-auth; browser egress qua g3
- [ ] Rà license (LiveSmart, các lib)

---

## 8. NHẬN ĐỊNH TỔNG
Dự án đã vượt "chạy được" — lõi sản phẩm mạnh và khác biệt (đội AI + kho tri thức + HITL). Việc còn lại **KHÔNG phải xây thêm nhiều, mà là DỌN cho sắc + nối 3 mắt xích go-live (tiền, DNS, pháp lý)**. Khuyến nghị: **chạy Phiên A ngay** (dọn redundancy — sản phẩm gọn hơn liền), rồi **pilot đóng 10-20 CEO**, vừa chạy vừa hoàn thiện Phiên B-D.

— HẾT —
