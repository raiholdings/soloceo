# VẬN HÀNH openclawos.vn — Venture #1 do đội AI SoloCEO điều hành

> **Ngày:** 11/07/2026 · **Chủ dự án:** Phạm Văn Thư
> Tài liệu này mô tả end-to-end cách nền tảng SoloCEO OS v2 vận hành **một doanh nghiệp thật** — openclawos.vn — bằng một đội 6 nhân sự AI, có điểm dừng phê duyệt (HITL) ở mọi mắt xích tiền/pháp lý.

---

## 1. openclawos là ai

**OpenClawOS** là dự án tách riêng (openclawos.vn — hệ điều hành ứng dụng đóng gói hệ sinh thái OpenClaw). Trong đợt này, nó được **onboard làm Venture #1** ngay trên chính nền tảng SoloCEO: một doanh nghiệp thật để đội AI vận hành và chứng minh nền tảng "ra được doanh số".

**Đã tạo (thật, trên production 11/07):**
- **Org "OpenClawOS"** (`ba2b9dae-…`), plan SCALE, status ACTIVE.
- **Venture "openclawos"** (`42d6cfe2-…`), status **LIVE**, ngành services → xuất hiện trên trang chủ soloceo.vn (thẻ dẫn ra openclawos.vn).
- **Virtual key LiteLLM riêng** (`org-openclawos`): **budget cứng $10/30 ngày**, gắn `metadata.org_id`, 4 model (soloceo-fast/smart + claude-fast/smart). Mọi lời gọi AI của openclawos quy về đúng org, có trần chi.
- Trang chủ: **2 công ty demo cũ** ("Chào Buổi Sáng", "Phạm Văn Thư") đã **ARCHIVE** (status PAUSED — không xoá cứng, dữ liệu còn nguyên, backup `/root/backup-venture-org-*.sql`).

---

## 2. Đội 6 nhân sự AI làm gì mỗi ngày

DeerFlow (lõi điều phối) có 1 lead-agent + 6 sub-agent chuyên trách (đã nạp trong `config.yaml` → `subagents.custom_agents`):

| Nhân sự AI | Việc cho openclawos |
|---|---|
| **Kinh doanh** | Nuôi & chốt deal; soạn báo giá (⛔ chờ duyệt), theo dõi pipeline |
| **Marketing** | Chọn kênh, chạy chiến dịch thu lead, đăng bài (Midscene Assist khi cần thao tác web) |
| **Nội dung** | Landing bán hàng, bài giới thiệu, mô tả sản phẩm OpenClawOS |
| **Vận hành** | Dựng web/tài liệu trong sandbox, đóng gói tài nguyên bàn giao |
| **Kế toán** | Ghi nhận thanh toán vào sổ cái Transaction, đối soát — **KHÔNG tự chi** |
| **Nghiên cứu** | Khảo sát thị trường, đối thủ, định giá tham khảo (đề xuất, không tự đặt giá) |

---

## 3. Cỗ máy doanh thu (lead → chốt → thu tiền → ghi sổ)

```
Thu lead → Nurture → Tư vấn → Báo giá ⛔ → Chốt ⛔ → Thanh toán ⛔ → Bàn giao/Hỗ trợ → Ghi sổ
   Mkt      Mkt/ND    KD        KD          KD         (cổng thật)      Vận hành       Kế toán
```

- **Chạy được ngay (không cần quyết định):** thu lead, nurture, tư vấn, soạn **báo giá nháp**, nội dung bán hàng, landing. Đội AI làm trong sandbox live; CEO xem trực tiếp.
- ✅ **ĐÃ CHẠY THẬT (11/07, thread `8e1eb282…` owner=org openclawos):** lead_agent trả kết quả bước 1:
  (1) 3 kênh (FB Groups / LinkedIn / cold email) + 3 thông điệp thu lead; (2) bài ra mắt 157 chữ kèm CTA
  "để lại liên hệ — báo giá & demo trong 24h"; (3) khung báo giá A-setup/B-thuê bao/C-bổ sung với **mọi ô
  giá = "Chờ duyệt"** — agent tôn trọng đúng ràng buộc KHÔNG tự đặt giá.
- **⛔ Điểm dừng HITL (arishem gác luật → hàng chờ Phê duyệt):** báo giá, chốt hợp đồng, và đặc biệt **thanh toán thật**.
- **Bước THU TIỀN THẬT dừng chờ chủ dự án** — cần 4 quyết định (§5). Chưa có = chạy tới báo giá/nội dung/lead, không hứa quá đà.

**Đo "ra doanh số":**
- `Venture(openclawos).revenueVerified = true` khi có ≥1 giao dịch IN verified qua cổng thật.
- Đơn vị kinh tế: chi phí AI (LiteLLM budget) để tạo 1 đồng doanh thu — đọc trên Langfuse theo org_id.

---

## 4. Vai trò 8 nền tảng trong vận hành

| Nền tảng | Vai trò khi openclawos hoạt động |
|---|---|
| **DeerFlow** | Bộ não — CEO nói chuyện, điều phối 6 nhân sự AI |
| **AIO Sandbox** | "Máy tính của doanh nghiệp" — nơi agent thật sự gõ lệnh, dựng web, soạn file (hiện live) |
| **g3proxy** | Canh cửa ra internet — sandbox chỉ ra ngoài qua g3, chặn domain lạ (dữ liệu mỗi org tách biệt) |
| **arishem** | Cổng dừng — chi tiền/ký/gửi hợp đồng → chặn → đẩy vào Phê duyệt |
| **godlp** | Che CCCD/SĐT/STK/MST trước khi prompt rời hệ thống (Nghị định 13) — đã chống FP che nhầm số tiền/giá |
| **Dolphin** | Đọc chứng từ — CEO kéo ảnh CCCD/GPKD/hoá đơn vào chat → dữ liệu có cấu trúc |
| **Midscene** | Thao tác web hộ (Assist) — tra cứu/điền form trang không có API; **cấm** vượt CAPTCHA/ký số |
| **FlowGram** | Biến việc lặp thành quy trình tái dùng (cỗ máy doanh thu ở dạng flow) |

---

## 5. ⛔ 4 QUYẾT ĐỊNH để openclawos "ra tiền thật" (chờ chủ dự án)

1. **Bán gì?** (đề xuất mặc định: gói SaaS "Văn phòng AI OpenClawOS" — setup + thuê bao tháng)
2. **Giá?** (chủ dự án chốt con số — agent KHÔNG tự đặt giá)
3. **Cổng thu tiền?** PayOS (khuyến nghị VN) / Stripe — **cần key thật** mới có doanh thu verified
4. **Kênh bán chính?** Facebook / Zalo / cộng đồng / cold outreach

→ Trước khi có 4 quyết định: agent chạy tới báo giá/nội dung/lead; **thanh toán thật DỪNG chờ**.

---

## 6. Số liệu thật (cập nhật khi có)

| Chỉ số | Giá trị | Nguồn |
|---|---|---|
| Lead | — | (khi chiến dịch chạy) |
| Deal chốt | — | pipeline Kinh doanh |
| Doanh thu verified | 0₫ | sổ cái Transaction (chờ cổng thật) |
| Chi phí AI | $0 / trần $10/30d | LiteLLM key `org-openclawos` |

*Bảng này được cập nhật khi cỗ máy doanh thu chạy thật.*
