"""
dolphin-docs — đọc giấy tờ VN → JSON (research/R5, contract CONTRACT.md).
FastAPI bọc Dolphin (bytedance/Dolphin, MIT). Contract CỐ ĐỊNH; đổi engine
(Dolphin ↔ VietOCR ↔ GPT-4o-vision qua LiteLLM) chỉ đổi hàm `run_engine`.

Luồng: ảnh → run_engine() ra raw_text (markdown/text) → extract_fields() map theo
schema tiếng Việt (R5 §4.2) bằng regex → trả {fields, confidence, ...}.
`confidence` thấp / có warnings → agent đẩy người duyệt (HITL), không tự ghi DB.
"""
import base64
import os
import re
from typing import Any, Optional

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="dolphin-docs")
ENGINE = os.environ.get("DOLPHIN_ENGINE", "dolphin-v2")


class ParseReq(BaseModel):
    image_base64: str
    doc_type: str = "auto"
    options: Optional[dict] = None


def run_engine(image_bytes: bytes) -> tuple[str, float]:
    """SEAM: chạy Dolphin/VietOCR/GPT-4o-vision → (raw_text, confidence).
    TODO khi deploy: load Dolphin-v2 (vLLM, GPU R730) và infer. Hiện trả rỗng +
    cảnh báo để tầng trên biết engine chưa nạp (fail-safe, không bịa dữ liệu)."""
    if os.environ.get("DOLPHIN_MODEL_PATH"):
        # from dolphin_infer import infer   # tích hợp thật ở đây
        # return infer(image_bytes)
        pass
    return "", 0.0


# ---- Field extractors (regex VN) — R5 §4.2 ----
RE_CCCD = re.compile(r"\b0\d{11}\b")
RE_MST = re.compile(r"\b\d{10}(?:-\d{3})?\b")
RE_DATE = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b")
RE_MONEY = re.compile(r"\b\d{1,3}(?:[.,]\d{3})+\b")


def _first(rx: re.Pattern, text: str) -> Optional[str]:
    m = rx.search(text)
    return m.group(0) if m else None


def extract_fields(doc_type: str, text: str) -> dict[str, Any]:
    t = text
    if doc_type == "cccd":
        return {
            "so_cccd": _first(RE_CCCD, t),
            "ngay_sinh": _label(t, r"(?:sinh|ngày sinh)"),
            "co_gia_tri_den": None,
        }
    if doc_type == "gpkd":
        return {
            "ma_so_doanh_nghiep": _first(RE_MST, t),
            "ngay_cap": _first(RE_DATE, t),
        }
    if doc_type == "invoice_vat":
        return {
            "mst_nguoi_ban": _first(RE_MST, t),
            "so_hoa_don": _label(t, r"(?:số hóa đơn|số HĐ)"),
            "tong_thanh_toan": _first(RE_MONEY, t),
        }
    return {}


def _label(text: str, label_rx: str) -> Optional[str]:
    m = re.search(label_rx + r"\s*[:\-]?\s*(.+)", text, re.IGNORECASE)
    return m.group(1).strip().split("\n")[0] if m else None


@app.get("/healthz")
def healthz():
    return {"ok": True, "engine": ENGINE}


@app.post("/parse_document")
def parse_document(req: ParseReq):
    warnings: list[str] = []
    try:
        img = base64.b64decode(req.image_base64)
    except Exception:
        return {"error": "image_base64 không hợp lệ"}
    raw_text, confidence = run_engine(img)
    if not raw_text:
        warnings.append("engine_not_loaded")
    doc_type = req.doc_type if req.doc_type != "auto" else _guess(raw_text)
    fields = extract_fields(doc_type, raw_text)
    if confidence < 0.9:
        warnings.append("diacritics_uncertain")
    return {
        "doc_type": doc_type,
        "fields": fields,
        "raw_text": raw_text if (req.options or {}).get("return_raw") else "",
        "confidence": confidence,
        "engine": ENGINE,
        "engine_version": os.environ.get("DOLPHIN_VERSION", "unknown"),
        "warnings": warnings,
    }


def _guess(text: str) -> str:
    low = text.lower()
    if "căn cước" in low or "cccd" in low:
        return "cccd"
    if "đăng ký" in low and "kinh doanh" in low:
        return "gpkd"
    if "hóa đơn" in low:
        return "invoice_vat"
    return "auto"
