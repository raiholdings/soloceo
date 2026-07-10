# R4 — Midscene.js & Ma trận pháp lý cổng dịch vụ công VN

> Nguồn A: midscenejs.com, GitHub web-infra-dev/midscene, npm @midscene/web. B: kiến thức pháp lý VN + xác minh Cổng DVCQG/VNeID/ký số. Chỗ chưa chắc: `[CẦN KIỂM CHỨNG]`; nguyên tắc — không chắc thì **Human-only**.

## PHẦN A — MIDSCENE.JS

### A.1 Bản chất; vision hay DOM; CDP 9222; SDK
- SDK OSS (ByteDance Web Infra) cho **UI automation bằng ngôn ngữ tự nhiên**. Mô tả bước bằng tiếng người → **VLM đa phương thức** lập kế hoạch + thao tác.
- **Vision-driven, KHÔNG thuần DOM**: làm việc từ **screenshot** + VLM định vị theo mô tả → không cần selector, ít vỡ khi UI đổi; có đọc DOM/a11y hỗ trợ. Khác Playwright/Puppeteer selector.
- **CDP cổng 9222: CÓ** — kết nối Chrome đang chạy qua CDP, endpoint mặc định `ws://127.0.0.1:9222/devtools/browser`, **giữ session đăng nhập thật** → mode phù hợp nhất để cắm AIO Sandbox.
- Tích hợp: Playwright/Vitest, Puppeteer (mặc định), **CDP mode**, Bridge mode (cần Chrome Extension), Chrome Extension độc lập, YAML script, JS SDK. Package chính `@midscene/web`.

### A.2 "Auto" vs "Assist" — Midscene KHÔNG có Assist native ⭐
**Midscene KHÔNG có "chế độ Assist" (pause-for-confirmation) đặt tên riêng.** "Assist có HITL" là thứ **SoloCEO tự bọc ở tầng orchestration**, không phải bật cờ.

| Chiến lược | API | Bản chất | SoloCEO |
|---|---|---|---|
| **Auto Planning** | `aiAct()` / `ai()` | VLM tự phân rã nhiều bước + tự chạy hết | **KHÔNG dùng cho cổng công** |
| **Instant Action** | `aiTap`, `aiInput`, `aiHover`, `aiScroll`, `aiKeyboardPress`, `aiQuery`, `aiAssert`, `aiWaitFor`, `aiLocate` | Mỗi lệnh = **đúng 1 hành động** chỉ định | Nền để dựng **Assist** + checkpoint HITL |

**Hiện thực Assist (HITL)**: chạy Instant Action tuần tự; trước mỗi hành động side-effect (submit/thanh toán/ký/đăng nhập định danh) → **dừng job, đẩy checkpoint phê duyệt** (nguyên tắc HITL CLAUDE.md), chờ người duyệt mới gọi lệnh kế. Dùng `aiQuery`+`aiAssert`+`aiWaitFor` kiểm trạng thái trang trước khi trình người duyệt. **Tuyệt đối tránh `aiAct()` cho luồng cổng công** (`deepThink` là planning, KHÔNG phải HITL).

### A.3 Tích hợp AIO Sandbox qua `browser_act(instruction)`
- Sandbox chạy Chrome mở remote-debug 9222. `browser_act(instruction)` → khởi tạo Midscene agent CDP mode trỏ `ws://127.0.0.1:9222/...` → map `instruction` sang **một** Instant Action (không `aiAct`).
- CDP mode dùng đúng Chrome profile sandbox → giữ cookie/đăng nhập giữa bước (cần cho cổng công đã đăng nhập bởi người).
- **Checkpoint HITL** ở tầng gọi `browser_act`: mỗi `browser_act` có side-effect qua hàng đợi duyệt trước khi phát lệnh.
- Midscene sinh report/screenshot mỗi bước → bằng chứng + audit. `[CẦN KIỂM CHỨNG]` định dạng report của version pin.

### A.4 Model VLM → trỏ LiteLLM
- Cần **VLM có thị giác** (model text-only KHÔNG chạy). Hỗ trợ: GPT-4o/GPT-5, **Qwen-2.5-VL/Qwen3-VL** (`qwen3`), UI-TARS, GLM-V `[CẦN KIỂM CHỨNG]`. **Canvas**: GPT-4o không dùng được → phải Qwen-VL/UI-TARS.
- Cấu hình OpenAI-compatible → LiteLLM (bắt buộc):
  ```
  MIDSCENE_MODEL_BASE_URL="https://llm.soloceo.vn/v1"
  MIDSCENE_MODEL_API_KEY="<virtual key per-org>"
  MIDSCENE_MODEL_NAME="<VLM đã khai trong litellm config>"
  MIDSCENE_MODEL_FAMILY="qwen3" | "gpt-5" | ...   # BẮT BUỘC đúng, sai → parsing hỏng
  ```
  - **Việc cần ở LiteLLM**: thêm 1 `model_name` là **VLM** trong `infra/litellm/config.yaml` (hiện chỉ có `soloceo-fast/smart` text) để chi phí quy về `org_id` + budget cap. `[backlog]`

### A.5 License + version
- **License: MIT** (repo + `@midscene/web`) → dùng thương mại OK, không vướng. 
- Pin `@midscene/web@1.10.3` (latest lúc tra), pin cứng (không `^`). `[CẦN KIỂM CHỨNG bản mới hơn]`.

---

## PHẦN B — MA TRẬN PHÁP LÝ CỔNG DỊCH VỤ CÔNG VN

### Quy ước 3 mức
- **Auto** — agent tự chạy (chỉ đọc/tra cứu vô hại, không định danh, không side-effect).
- **Assist (HITL)** — agent điền nháp/chuẩn bị, **người xem + bấm CHỐT** ở checkpoint trước mọi side-effect.
- **Human-only** — **agent TUYỆT ĐỐI không tự làm** (kể cả bấm hộ). Ghi backlog nếu Midscene bó tay.

### 3 rào chắn cứng (LUÔN Human-only)
1. **CAPTCHA/reCAPTCHA** → tự giải/bypass vi phạm điều khoản + có thể là truy cập trái phép.
2. **Ký số** (chữ ký số, USB token, ký trên VNeID, ký hồ sơ/tờ khai) → biểu thị ý chí pháp lý ràng buộc; ký hộ = giả mạo, vô hiệu + rủi ro hình sự.
3. **VNeID / OTP định danh / sinh trắc học** → danh tính pháp lý cá nhân; Cổng DVCQG chỉ đăng nhập VNeID từ 01/7/2024.

### BẢNG MA TRẬN
| # | Cổng | Thao tác | Mức | Lý do | Midscene bó tay → backlog |
|---|---|---|---|---|---|
| **DVCQG — dichvucong.gov.vn** |
| 1 | DVCQG | Đăng nhập VNeID/OTP/sinh trắc | **Human-only** | Định danh; bắt buộc VNeID 01/7/2024 | CAPTCHA+VNeID app → người đăng nhập trước, agent thao tác trong session CDP |
| 2 | DVCQG | Tra cứu thủ tục, tình trạng hồ sơ | **Auto** | Chỉ đọc | — |
| 3 | DVCQG | Điền nháp biểu mẫu (chưa nộp) | **Assist** | Không side-effect tới submit | Không tự vượt CAPTCHA → dừng |
| 4 | DVCQG | Nộp hồ sơ / bấm "Nộp" | **Human-only** | Hành vi hành chính + ký số | — |
| 5 | DVCQG | Thanh toán phí/lệ phí | **Human-only** | Chi tiền + OTP ngân hàng | OTP ngoài trình duyệt → người làm |
| 6 | DVCQG | Tải biểu mẫu/kết quả | **Assist** | Có thể chứa PII → người xác nhận | — |
| **Thuế — thuedientu.gdt.gov.vn / eTax** |
| 7 | eTax | Đăng nhập MST + chữ ký số/USB token | **Human-only** | Token vật lý | Token USB/HSM ngoài web |
| 8 | eTax | Tra cứu nghĩa vụ thuế, tờ khai | **Auto** (trong session người mở) | Chỉ đọc | — |
| 9 | eTax | Lập/điền nháp tờ khai (GTGT/TNCN/môn bài) | **Assist** | Người soát + chịu trách nhiệm số liệu | — |
| 10 | eTax | Ký + Nộp tờ khai | **Human-only** | Ký số = trách nhiệm pháp lý | — |
| 11 | eTax | Nộp thuế / lập giấy nộp tiền | **Human-only** | Chi tiền + ký + ngân hàng | — |
| **BHXH — VssID / dvc.baohiemxahoi** |
| 12 | BHXH | Đăng nhập + ký số đơn vị | **Human-only** | Định danh + ký | — |
| 13 | BHXH | Tra cứu quá trình đóng, C12 | **Auto** (session mở) | Chỉ đọc | — |
| 14 | BHXH | Kê khai nháp tăng/giảm lao động | **Assist** | Người soát danh sách | — |
| 15 | BHXH | Ký + Nộp hồ sơ chính thức | **Human-only** | Ký số đơn vị | — |
| **ĐKKD — dangkykinhdoanh.gov.vn** |
| 16 | ĐKKD | Đăng nhập + chữ ký số công cộng | **Human-only** | Định danh chủ thể | — |
| 17 | ĐKKD | Tra cứu tên/mã DN, trùng tên | **Auto** | Công khai, chỉ đọc | — |
| 18 | ĐKKD | Soạn/điền nháp hồ sơ ĐK/thay đổi | **Assist** | Người soát điều lệ/thông tin | — |
| 19 | ĐKKD | Ký số + Nộp + thanh toán lệ phí | **Human-only** | Ký + chi tiền | — |
| **Hải quan — VNACCS/VCIS** |
| 20 | Hải quan | Đăng nhập + chữ ký số | **Human-only** | Định danh DN + ký; thường phần mềm đầu cuối | Ngoài phạm vi trình duyệt |
| 21 | Hải quan | Tra cứu biểu thuế, mã HS, tờ khai | **Auto** | Chỉ đọc | — |
| 22 | Hải quan | Chuẩn bị nháp tờ khai/chứng từ | **Assist** | Người soát | — |
| 23 | Hải quan | Truyền/nộp tờ khai, thông quan | **Human-only** | Ký + trách nhiệm XNK | — |
| **Hóa đơn điện tử — hoadondientu.gdt.gov.vn** |
| 24 | HĐĐT | Đăng nhập + ký số | **Human-only** | Định danh + ký | — |
| 25 | HĐĐT | Tra cứu hóa đơn, kiểm tra hợp lệ | **Auto** | Chỉ đọc | — |
| 26 | HĐĐT | Lập nháp hóa đơn | **Assist** | Người soát số liệu | — |
| 27 | HĐĐT | Ký số + Phát hành/Gửi CQT | **Human-only** | Hành vi kế toán/pháp lý | — |
| **Chung** |
| 28 | Mọi cổng | CAPTCHA/reCAPTCHA | **Human-only** | Không tự giải/bypass | Midscene không giải → dừng |
| 29 | Mọi cổng | OTP (SMS/app/NH), sinh trắc | **Human-only** | Yếu tố xác thực của người, ngoài trình duyệt | Agent chờ checkpoint, người nhập |
| 30 | Mọi cổng | Bấm gửi/nộp/thanh toán/ký cuối | **Human-only** | Side-effect chính thức | — |

### Ghi chú vận hành
- **Mẫu chuẩn cổng công**: người đăng nhập VNeID/ký số trên thiết bị của họ → session mở trong Chrome sandbox (CDP 9222) → agent chỉ Instant Action **điền nháp/tra cứu** → mọi side-effect dừng checkpoint HITL → CAPTCHA/OTP/ký/thanh toán người tự làm.
- **KHÔNG cài UI-TARS** như agent tự chủ đóng luồng. Nơi Midscene bó tay → **backlog, KHÔNG tự vượt**.
- **Không `aiAct()`** trên cổng công. Chỉ Instant Action + wrapper duyệt.
- **Audit**: lưu screenshot/trace từng bước (Nghị định 13 + đối soát trách nhiệm).
- **Dữ liệu cá nhân**: chạm CMND/CCCD/MST/lao động → tuân Nghị định 13/2023, có consent.

---

## GIẢ ĐỊNH & CẦN KIỂM CHỨNG
1. Danh sách VLM đầy đủ `@midscene/web@1.10.3` + giá trị `MIDSCENE_MODEL_FAMILY` chính xác (Qwen-VL). 2. Bản `@midscene/web` mới hơn 1.10.3. 3. Định dạng report/trace. 4. CDP mode trong container (host/port/profile). 5. Hải quan: web vs phần mềm đầu cuối. 6. "Lưu nháp" có tạo bản ghi định danh không → nâng cấp checkpoint.
**Nguyên tắc khi lệch: nghiêng Human-only.** Ký số/đăng nhập định danh/nộp hồ sơ/thanh toán/CAPTCHA/OTP/sinh trắc — không bao giờ agent tự làm.
