# R5 — Nghiên cứu Dolphin (bytedance/Dolphin) cho SoloCEO OS v2

## 1. Dolphin là gì

**Dolphin** = "Document Image Parsing via Heterogeneous Anchor Prompting" (ByteDance, ACL 2025). VLM parse ảnh tài liệu → cấu trúc.

- **"Analyze-then-parse" (2 giai đoạn, 1 VLM)**: Stage 1 phân tích layout cấp trang → chuỗi phần tử theo reading order; Stage 2 parse song song từng phần tử (text/table/formula/code) bằng "heterogeneous anchors".
- **Backbone**: Vision Encoder = Swin Transformer + Text Decoder = **mBART** (đa ngôn ngữ).
- **Input**: ảnh (PNG/JPG), PDF. **Output**: **JSON có cấu trúc** + Markdown (page-level và element-level, kèm bounding box).
- **Quan trọng**: Dolphin trả **cấu trúc tài liệu tổng quát** (text/table/formula theo layout), **KHÔNG** phải JSON theo schema nghiệp vụ (CCCD/GPKD/hóa đơn). Muốn ra `{fields:{...}}` cần **lớp post-processing / field-mapping** hoặc bước LLM trích trường sau khi có raw_text (xem mục 5).

## 2. Cách chạy

- **Model / VRAM**: Dolphin-v2 = **3B** (mới nhất 2025.12.12); Dolphin-1.5 = 0.3B. VRAM **~8–12 GB** [CẦN KIỂM CHỨNG — blog review, không phải README]. 1 GPU đủ; CPU-only rất chậm. → **Dell R730 + GPU ≥12–16GB (T4/P40/A10) đủ.**
- **Inference (chỉ script, KHÔNG có HTTP API chính thức)**: `demo_page.py`, `demo_element.py`, `demo_layout.py`. Không server sẵn. Backend tăng tốc: **vLLM** (2025.06.27), **TensorRT-LLM** (2025.06.30), hoặc HF Transformers.
- **Docker**: không có image chính thức → tự đóng gói.
- Cài:
  ```bash
  git clone https://github.com/ByteDance/Dolphin.git && cd Dolphin
  pip install -r requirements.txt
  huggingface-cli download ByteDance/Dolphin-v2 --local-dir ./hf_model
  python demo_page.py --model_path ./hf_model --save_dir ./results --input_path img.png
  ```
- **Hệ quả**: vì không có HTTP API sẵn, **MCP `dolphin-docs` (mục 5) chính là server ta tự viết** — bọc script/vLLM sau FastAPI + MCP contract cố định.

## 3. Tiếng Việt

- **Không cam kết chính thức về tiếng Việt.** Ngôn ngữ nêu (v2): Primary English + Chinese; Secondary Japanese/Korean/German/French/Spanish; General "reasonable support" Latin-script khác. **Tiếng Việt KHÔNG được liệt kê tên.** [CẦN KIỂM CHỨNG]
- Cơ sở kỳ vọng: decoder mBART đa ngôn ngữ + tiếng Việt là Latin có dấu → lý thuyết "reasonable". Nhưng **dấu thanh (ắ, ầ, ộ, ữ, ỉ…)** là rủi ro OCR cao, chưa validate.
- **Kết luận**: tiếng Việt là **giả định phải benchmark**, không coi là đã đạt → mục 4.

## 4. THIẾT KẾ BENCHMARK 10 mẫu tiếng Việt (giao thức đo — KHÔNG chạy ở đây)

### 4.1 Bộ mẫu (10 ảnh thật, che số nhạy cảm)
| # | Loại | Số | Điều kiện |
|---|------|----|-----------|
| 1–3 | CCCD gắn chip | 3 | 1 scan phẳng, 1 chụp nghiêng, 1 lóa/thấp phân giải |
| 4–6 | GPKD (ĐKKD/hộ KD) | 3 | 1 PDF-scan sạch, 1 photocopy mờ, 1 chụp có bóng |
| 7–10 | Hóa đơn GTGT | 4 | 2 điện tử (PDF), 1 giấy chụp, 1 nhiều dòng hàng (test bảng) |

### 4.2 Trường cần trích (chấm)
- **CCCD**: `so_cccd`(12), `ho_ten`, `ngay_sinh`, `gioi_tinh`, `quoc_tich`, `que_quan`, `noi_thuong_tru`, `co_gia_tri_den`.
- **GPKD**: `ten_doanh_nghiep`, `ma_so_doanh_nghiep`(MST 10/13), `dia_chi_tru_so`, `nguoi_dai_dien`, `von_dieu_le`, `nganh_nghe_chinh`, `ngay_cap`, `noi_cap`.
- **Hóa đơn VAT**: `ky_hieu_hoa_don`, `so_hoa_don`, `ngay_lap`, `ten_nguoi_ban`, `mst_nguoi_ban`, `ten_nguoi_mua`, `mst_nguoi_mua`, `tien_hang`, `thue_suat`, `tien_thue_gtgt`, `tong_thanh_toan`, + **line items** (`ten_hang`, `so_luong`, `don_gia`, `thanh_tien`).
- Ghi ground-truth thủ công `gold/{id}.json`.

### 4.3 Cách chấm (field-level exact match có chuẩn hóa)
1. **Unicode NFC** (gộp dấu tổ hợp) — bắt buộc. 2. Trim + gộp khoảng trắng. 3. Case-insensitive cho tên/địa chỉ. 4. Số: bỏ `.`/`,` phân tách nghìn, so giá trị; ngày → `YYYY-MM-DD`. 5. **Dấu tiếng Việt chấm 2 lớp**:
   - **Strict (giữ dấu)** = con số quyết định DÙNG/BỎ.
   - **Relaxed (bỏ dấu, unidecode)** = chẩn đoán: Strict thấp + Relaxed cao ⇒ đọc đúng chữ, **hỏng dấu** → cứu bằng hậu xử lý; cả hai thấp ⇒ sai bản chất → đổi engine.
- `field_accuracy = khớp Strict / tổng trường`. Tách theo loại + Strict/Relaxed. Line items chấm row-level riêng.

### 4.4 Tiêu chí đạt & đường lui
- **≥90% field accuracy (Strict, có dấu) → DÙNG Dolphin** sau `dolphin-docs`.
- **<90% → GIỮ contract MCP, chỉ đổi implementation**:
  - Hỏng dấu → **VietOCR** / PaddleOCR-VN cho lớp text (giữ Dolphin layout/table), hoặc hậu xử lý phục hồi dấu.
  - Sai bố cục/trích trường → **GPT-4o-vision / Claude vision qua LiteLLM** prompt trích JSON theo schema 4.2.
  - Ensemble: Dolphin (layout+raw_text) → LLM-vision trích trường, so confidence.

## 5. MCP contract `dolphin-docs` (cố định — engine nào cũng cắm)

```jsonc
parse_document(
  image_base64: string,
  doc_type: "cccd" | "gpkd" | "invoice_vat" | "auto",
  options?: { language?: "vi", return_raw?: boolean, return_bbox?: boolean }
) -> {
  doc_type: string,
  fields: { [key: string]: string|number|null },       // theo schema 4.2
  line_items?: Array<{ ten_hang, so_luong, don_gia, thanh_tien }>,
  raw_text: string,
  confidence: number,                                   // 0..1
  field_confidence?: { [key: string]: number },
  engine: string,                                       // "dolphin-v2"|"vietocr"|"gpt4o-vision"
  engine_version: string,
  warnings?: string[]                                   // "low_resolution","diacritics_uncertain"
}
// Thoát hiểm doc_type lạ:
parse_layout(image_base64, output: "json"|"markdown") -> { markdown, elements[], engine }
```
**Nguyên tắc**: tên tool + `fields` cố định theo schema tiếng Việt 4.2 (hợp đồng, không phụ thuộc engine). Mọi engine tự map raw→fields. `confidence` bắt buộc để agent quyết định HITL (confidence thấp / có warnings → đẩy người duyệt, không tự ghi DB). Triển khai: FastAPI + MCP, load Dolphin qua vLLM trên GPU R730.

## 6. License & version pin

- **License: MIT** (GitHub + HuggingFace) → dùng thương mại OK, kể cả bán dịch vụ. Ghi ADR xác nhận.
- Pin: model `ByteDance/Dolphin-v2` **theo commit HF `revision=<sha>`**; code `bytedance/Dolphin@<sha>` (branch `master`). [CẦN KIỂM CHỨNG — repo dùng milestone theo ngày, chưa có tag semver → pin bằng SHA, không pin "v2" trần.]

---

## GIẢ ĐỊNH & CẦN KIỂM CHỨNG
1. VRAM ~8–12GB (blog review, không README) → đo thực trên GPU R730. 2. Tiếng Việt không được liệt kê tên; **dấu thanh chưa xác nhận** → benchmark 4 là bắt buộc. 3. Không có HTTP API/Docker chính thức → tự viết server (vLLM/TensorRT sẵn). 4. Output là cấu trúc tài liệu ≠ field nghiệp vụ → cần extractor (regex/LLM). 5. Pin bằng SHA + HF revision. 6. KHÔNG số benchmark nào là kết quả tiếng Việt thật — mục 4 chỉ là giao thức đo.

**Nguồn**: github.com/bytedance/Dolphin, HuggingFace ByteDance/Dolphin-v2, arXiv 2505.14059, các blog review.
