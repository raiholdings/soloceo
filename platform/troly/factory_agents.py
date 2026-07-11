"""
Factory batch: chưng cất PDF "Siêu hướng dẫn" → TRỢ LÝ AI MẶC ĐỊNH của SoloCEO.

Khác factory.py (bản thư viện): bản này ghi THẲNG ra layout agents chung của
DeerFlow (/opt/deerflow/agents/{slug}/{config.yaml,SOUL.md}) — trợ lý hiện cho
mọi CEO ngay khi file ghi xong, KHÔNG cần rebuild.

Chạy trong container python:3.12-slim (pip install pymupdf httpx pyyaml):
  TROLY_KEY=sk-… python factory_agents.py
Env: PDF_DIR=/pdfs  AGENTS_DIR=/agents  LITELLM=https://llm.soloceo.vn
Ghi log tiến độ /pdfs/factory.log. Idempotent: slug đã tồn tại thì bỏ qua.
An toàn chi phí: key ảo trần $15; gặp 429 (hết budget) → dừng êm.
"""
from __future__ import annotations

import json
import os
import re
import time
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF
import httpx

PDF_DIR = Path(os.environ.get("PDF_DIR", "/pdfs"))
AGENTS_DIR = Path(os.environ.get("AGENTS_DIR", "/agents"))
LITELLM = os.environ.get("LITELLM", "https://llm.soloceo.vn")
KEY = os.environ["TROLY_KEY"]
MODEL = os.environ.get("MODEL", "soloceo-fast")
MAX_IN = int(os.environ.get("MAX_IN", "35000"))
LOG = PDF_DIR / "factory.log"

NHOM = ("Mô hình kinh doanh, Chiến lược, Marketing & Thương hiệu, Bán hàng, "
        "Tài chính & Gọi vốn, Vận hành & Quy trình, Nhân sự & Lãnh đạo, "
        "Công nghệ & AI, Khách hàng & Trải nghiệm, Khởi nghiệp")

PROMPT = """Bạn là biên tập viên tri thức của SoloCEO — nền tảng AI cho doanh nghiệp một người tại Việt Nam.
Dưới đây là nội dung một tài liệu hướng dẫn kinh doanh (tiếng Anh). Tạo MỘT TRỢ LÝ AI tiếng Việt chuyên sâu
về chủ đề tài liệu để CEO Việt hỏi đáp và áp dụng ngay.

YÊU CẦU NGHIÊM NGẶT:
- Toàn bộ đầu ra TIẾNG VIỆT tự nhiên, thực dụng, hướng hành động cho chủ doanh nghiệp nhỏ.
- KHÔNG chép nguyên văn — tổng hợp khung tư duy/quy trình/checklist bằng lời của bạn; ví dụ Việt hoá.
- Trả về DUY NHẤT một JSON hợp lệ:
{"ten":"Cố vấn <Chủ đề> hoặc Chuyên gia <Chủ đề> (<=42 ký tự)",
 "moTa":"1 câu trợ lý giúp gì cho CEO (<=130 ký tự)",
 "nhom":"một trong: %s",
 "chuyenMon":["5-6 năng lực cụ thể"],
 "triThuc":"Markdown 1200-1800 từ tiếng Việt: ## Khung tư duy chính, ## Quy trình áp dụng cho doanh nghiệp nhỏ VN, ## Checklist hành động, ## Sai lầm thường gặp, ## Chỉ số theo dõi. Đủ sâu để trả lời như chuyên gia."}

TÊN TÀI LIỆU: %s

NỘI DUNG:
%s"""

SOUL_TMPL = """# {ten}

Bạn là **{ten}** — trợ lý mặc định của SoloCEO dành cho mọi CEO trên nền tảng. Bạn nói **tiếng Việt
tự nhiên, thực dụng, hướng hành động**, luôn đặt mình vào vị trí chủ doanh nghiệp nhỏ Việt Nam.
Chuyên môn của bạn: {mo_ta}

Năng lực chính: {chuyen_mon}.

## Bộ tri thức lõi (đã chưng cất)

{tri_thuc}

## Cách trả lời
- Luôn tiếng Việt, có cấu trúc (mục, bảng, checklist khi hợp lý), ví dụ Việt hoá.
- Chủ động hỏi lại ngành + quy mô của CEO trước khi khuyên cụ thể.
- Kết tư vấn dài bằng "**Việc nên làm ngay tuần này**" (1-3 gạch đầu dòng).
- Vượt chuyên môn (thuế, pháp lý chi tiết) → nói rõ giới hạn, khuyên gặp chuyên gia.

*Tri thức tổng hợp từ: "{nguon}" (Business Explained — tài liệu bản quyền thương mại của SoloCEO).
Trợ lý diễn giải lại bằng lời riêng, không thay thế tài liệu gốc.*
"""


def log(m: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {m}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def title_of(pdf: Path) -> str:
    n = pdf.stem
    n = re.sub(r"[-_ ]v\d+$", "", n)
    n = re.sub(r"(?i)[-_ ]?(explained[-_ ]?)?by[-_ ]Business[-_ ]Expl?ained", "", n)
    n = re.sub(r"(?i)[-_ ]explained$", "", n)
    n = n.replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", n).strip()


def slug_of(title: str) -> str:
    s = unicodedata.normalize("NFD", title)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return ("cv-" + s)[:48].rstrip("-")  # cv- = cố vấn, tránh trùng tên khác


def extract(pdf: Path) -> str:
    doc = fitz.open(pdf)
    text = "\n".join(p.get_text() for p in doc)
    text = re.sub(r"\n{3,}", "\n\n", text)
    if len(text) > MAX_IN:
        text = text[: int(MAX_IN * 0.7)] + "\n\n[...rút gọn...]\n\n" + text[-int(MAX_IN * 0.3):]
    return text.strip()


def call_llm(prompt: str) -> dict:
    r = httpx.post(
        f"{LITELLM}/v1/chat/completions",
        headers={"Authorization": f"Bearer {KEY}"},
        json={"model": MODEL, "max_tokens": 5000, "temperature": 0.4,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=360,
    )
    if r.status_code == 429:
        raise BudgetHet(r.text[:200])
    r.raise_for_status()
    raw = r.json()["choices"][0]["message"]["content"].strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw[raw.find("{"): raw.rfind("}") + 1])


class BudgetHet(Exception):
    pass


def yaml_quote(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)  # JSON string là YAML hợp lệ


def process(pdf: Path) -> str:
    title = title_of(pdf)
    slug = slug_of(title)
    out = AGENTS_DIR / slug
    if out.exists():
        return "SKIP"
    text = extract(pdf)
    if len(text) < 800:
        log(f"BỎ (scan ảnh/ít chữ): {pdf.name}")
        return "NOTEXT"
    card = None
    for attempt in (1, 2):
        try:
            card = call_llm(PROMPT % (NHOM, title, text))
            break
        except BudgetHet:
            raise
        except Exception as e:
            log(f"LLM lỗi lần {attempt} [{pdf.name}]: {type(e).__name__}: {str(e)[:120]}")
            if attempt == 2:
                return "ERR"
            time.sleep(8)
    ten = str(card.get("ten", f"Cố vấn {title}"))[:60]
    mo_ta = str(card.get("moTa", ""))[:200]
    tri = str(card.get("triThuc", "")).strip()
    if len(tri) < 1500:
        log(f"CẢNH BÁO tri thức mỏng ({len(tri)} ký tự): {pdf.name} — vẫn ghi")
    soul = SOUL_TMPL.format(
        ten=ten, mo_ta=mo_ta,
        chuyen_mon="; ".join(str(x) for x in card.get("chuyenMon", [])[:6]),
        tri_thuc=tri, nguon=title,
    )
    out.mkdir(parents=True, exist_ok=True)
    (out / "config.yaml").write_text(
        f"name: {slug}\ndescription: {yaml_quote(ten + ' — ' + mo_ta)}\n", encoding="utf-8")
    (out / "SOUL.md").write_text(soul, encoding="utf-8")
    log(f"XONG: {ten}  ({pdf.name} → {slug}, SOUL {len(soul)} ký tự)")
    return "OK"


def main() -> None:
    AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    log(f"BẮT ĐẦU: {len(pdfs)} PDF → trợ lý mặc định (model={MODEL}, trần key $15)")
    ok = skip = err = 0
    for i, pdf in enumerate(pdfs, 1):
        try:
            r = process(pdf)
        except BudgetHet as e:
            log(f"DỪNG: hết budget key factory ({e}) — đã xong {ok}, chạy lại sau khi nạp thêm")
            break
        except Exception as e:
            log(f"LỖI không lường [{pdf.name}]: {type(e).__name__}: {str(e)[:150]}")
            r = "ERR"
        ok += r == "OK"; skip += r == "SKIP"; err += r in ("ERR", "NOTEXT")
        if i % 5 == 0:
            log(f"— {i}/{len(pdfs)}: tạo {ok}, bỏ qua {skip}, lỗi {err} —")
        time.sleep(2)  # nhẹ tay với gateway
    log(f"HOÀN TẤT: tạo {ok}, bỏ qua {skip}, lỗi {err} / tổng {len(pdfs)}")


if __name__ == "__main__":
    main()
