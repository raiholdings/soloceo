# MCP `dolphin-docs` — hợp đồng cố định (đọc giấy tờ VN)

Ref: research/R5 §5. Bọc Dolphin (bytedance/Dolphin, MIT) sau FastAPI + vLLM (GPU
R730). Contract ổn định tuyệt đối — đổi engine (Dolphin ↔ VietOCR ↔ GPT-4o-vision
qua LiteLLM) chỉ đổi implementation, agent KHÔNG sửa.

## Tool: `parse_document`
```jsonc
parse_document(
  image_base64: string,
  doc_type: "cccd" | "gpkd" | "invoice_vat" | "auto",
  options?: { language?: "vi", return_raw?: boolean, return_bbox?: boolean }
) -> {
  doc_type: string,
  fields: { [key: string]: string|number|null },     // schema tiếng Việt (R5 §4.2)
  line_items?: Array<{ ten_hang, so_luong, don_gia, thanh_tien }>,
  raw_text: string,
  confidence: number,                                 // 0..1
  field_confidence?: { [key: string]: number },
  engine: string, engine_version: string,
  warnings?: string[]                                 // "low_resolution","diacritics_uncertain"
}
```

## Tool: `parse_layout` (thoát hiểm doc_type lạ)
```jsonc
parse_layout(image_base64, output: "json"|"markdown") -> { markdown, elements[], engine }
```

## Bất biến
- Trường `fields` cố định theo schema VN (CCCD/GPKD/hóa đơn — R5 §4.2).
- `confidence` bắt buộc → agent quyết định HITL: confidence thấp / có `warnings`
  → đẩy người duyệt, KHÔNG tự ghi DB.
- **Benchmark bắt buộc** 10 mẫu VN ≥90% field accuracy (strict, giữ dấu) trước khi
  tin dùng Dolphin; kém → đổi engine, giữ contract này (R5 §4.4).
