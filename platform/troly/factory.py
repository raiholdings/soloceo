"""
Factory "Thư viện trợ lý" — chưng cất PDF (sách mô hình kinh doanh / siêu hướng
dẫn) thành TRỢ LÝ AI tiếng Việt cho mọi CEO trên SoloCEO.

Pipeline: PDF → pdftotext → làm sạch → LLM (qua LiteLLM, godlp enforce áp dụng)
→ thẻ trợ lý JSON + tri thức Markdown. KHÔNG chép nguyên văn sách — chỉ tổng
hợp khung tư duy, checklist, ví dụ Việt hoá (tôn trọng bản quyền: dạy lại bằng
lời của trợ lý, kèm ghi nguồn).

Chạy: python factory.py all | python factory.py one <file.pdf>
Trạng thái ghi /data/index.json + log /data/factory.log.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

import httpx

DATA = Path(os.environ.get("TROLY_DATA", "/data"))
PDF_DIR = DATA / "pdfs"
KNOW_DIR = DATA / "knowledge"
CARD_DIR = DATA / "assistants"
INDEX = DATA / "index.json"
LOG = DATA / "factory.log"

LITELLM_BASE = os.environ.get("LITELLM_BASE_URL", "https://llm.soloceo.vn")
LITELLM_KEY = os.environ.get("LITELLM_KEY", "")
MODEL = os.environ.get("TROLY_MODEL", "soloceo-fast")
MAX_INPUT_CHARS = int(os.environ.get("TROLY_MAX_INPUT", "60000"))

NHOM_HOP_LE = [
    "Mô hình kinh doanh", "Chiến lược", "Marketing & Thương hiệu", "Bán hàng",
    "Tài chính & Gọi vốn", "Vận hành & Quy trình", "Nhân sự & Lãnh đạo",
    "Công nghệ & AI", "Khách hàng & Trải nghiệm", "Khởi nghiệp",
]

PROMPT = """Bạn là biên tập viên tri thức của SoloCEO — nền tảng AI cho doanh nghiệp một người tại Việt Nam.
Dưới đây là nội dung trích từ một tài liệu kinh doanh (tiếng Anh). Nhiệm vụ: tạo MỘT TRỢ LÝ AI tiếng Việt
chuyên sâu về chủ đề của tài liệu, để các CEO Việt hỏi đáp và áp dụng ngay.

YÊU CẦU NGHIÊM NGẶT:
- Toàn bộ đầu ra bằng TIẾNG VIỆT tự nhiên, thực dụng, hướng hành động cho chủ doanh nghiệp nhỏ.
- KHÔNG chép nguyên văn tài liệu. Tổng hợp lại khung tư duy, quy trình, checklist bằng lời của bạn.
- Ví dụ minh hoạ nên Việt hoá (quán cà phê, shop online, công ty dịch vụ...).
- Trả về DUY NHẤT một JSON hợp lệ theo schema (không markdown, không giải thích thêm):

{
  "ten": "tên trợ lý, dạng 'Cố vấn <Chủ đề>' hoặc 'Chuyên gia <Chủ đề>' (<= 40 ký tự)",
  "moTa": "1 câu mô tả trợ lý giúp gì cho CEO (<= 120 ký tự)",
  "nhom": "một trong: %s",
  "chuyenMon": ["5-7 năng lực cụ thể trợ lý làm được"],
  "cauHoiGoiY": ["4 câu hỏi CEO Việt hay hỏi nhất về chủ đề này"],
  "triThuc": "Markdown 1500-2500 từ tiếng Việt: ## Khung tư duy chính (các mô hình/bước trong tài liệu, giải thích rõ), ## Quy trình áp dụng từng bước cho doanh nghiệp nhỏ VN, ## Checklist hành động, ## Sai lầm thường gặp, ## Chỉ số cần theo dõi. Đây là bộ nhớ lõi của trợ lý — phải đủ sâu để trả lời như chuyên gia."
}

TÊN TÀI LIỆU: %s

NỘI DUNG TÀI LIỆU:
%s"""


def log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:60] or "tai-lieu"


def pdf_to_text(pdf: Path) -> str:
    out = subprocess.run(
        ["pdftotext", "-layout", "-q", str(pdf), "-"],
        capture_output=True, text=True, timeout=120,
    )
    text = out.stdout
    # Làm sạch: bỏ dòng lặp header/footer, nén khoảng trắng
    lines = [ln.strip() for ln in text.splitlines()]
    seen: dict[str, int] = {}
    for ln in lines:
        if 5 < len(ln) < 80:
            seen[ln] = seen.get(ln, 0) + 1
    repeated = {ln for ln, n in seen.items() if n >= 6}  # header/footer lặp
    lines = [ln for ln in lines if ln not in repeated]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def smart_truncate(text: str, limit: int) -> str:
    """Giữ đầu (mục lục+khung) và giữa+cuối (kết luận) khi tài liệu quá dài."""
    if len(text) <= limit:
        return text
    head = text[: int(limit * 0.6)]
    tail = text[-int(limit * 0.25):]
    mid_at = len(text) // 2
    mid = text[mid_at: mid_at + int(limit * 0.15)]
    return head + "\n\n[...phần giữa rút gọn...]\n\n" + mid + "\n\n[...]\n\n" + tail


def call_llm(prompt: str) -> str:
    r = httpx.post(
        f"{LITELLM_BASE}/v1/chat/completions",
        headers={"Authorization": f"Bearer {LITELLM_KEY}"},
        json={
            "model": MODEL,
            "max_tokens": 8000,
            "temperature": 0.4,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=300,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def parse_json_block(raw: str) -> dict:
    raw = raw.strip()
    # gỡ code-fence nếu model bọc ```json
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Không tìm thấy JSON trong trả lời")
    return json.loads(raw[start: end + 1])


def load_index() -> dict:
    if INDEX.exists():
        return json.loads(INDEX.read_text(encoding="utf-8"))
    return {"assistants": [], "sources": {}}


def save_index(idx: dict) -> None:
    INDEX.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")


def source_title(pdf: Path) -> str:
    name = pdf.stem
    name = re.sub(r"-[a-z0-9]{6}(\s*\(\d+\))?$", "", name)  # bỏ mã đuôi -oyi2ud
    name = re.sub(r"\s*\(\d+\)$", "", name)
    name = name.replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", name).strip()


def process_one(pdf: Path, idx: dict) -> bool:
    digest = hashlib.sha256(pdf.read_bytes()).hexdigest()[:16]
    if digest in idx["sources"]:
        log(f"BỎ QUA (trùng nội dung): {pdf.name}")
        return False
    title = source_title(pdf)
    slug = slugify(title)
    if any(a["slug"] == slug for a in idx["assistants"]):
        slug = f"{slug}-{digest[:4]}"

    text = pdf_to_text(pdf)
    if len(text) < 800:
        log(f"BỎ QUA (PDF gần như không có chữ / scan ảnh): {pdf.name} ({len(text)} ký tự)")
        idx["sources"][digest] = {"file": pdf.name, "skipped": "no-text"}
        return False

    prompt = PROMPT % (", ".join(NHOM_HOP_LE), title, smart_truncate(text, MAX_INPUT_CHARS))
    for attempt in (1, 2):
        try:
            raw = call_llm(prompt)
            card = parse_json_block(raw)
            break
        except Exception as e:  # retry 1 lần rồi chịu thua — ghi lỗi, không dừng batch
            log(f"LLM lỗi lần {attempt} với {pdf.name}: {type(e).__name__}: {e}")
            if attempt == 2:
                idx["sources"][digest] = {"file": pdf.name, "error": str(e)[:200]}
                return False
            time.sleep(5)

    tri_thuc = str(card.pop("triThuc", "")).strip()
    if card.get("nhom") not in NHOM_HOP_LE:
        card["nhom"] = "Chiến lược"
    entry = {
        "slug": slug,
        "ten": str(card.get("ten", title))[:60],
        "moTa": str(card.get("moTa", ""))[:160],
        "nhom": card["nhom"],
        "chuyenMon": list(card.get("chuyenMon", []))[:8],
        "cauHoiGoiY": list(card.get("cauHoiGoiY", []))[:4],
        "nguon": title,
        "file": pdf.name,
        "taoLuc": time.strftime("%Y-%m-%d %H:%M"),
    }
    (KNOW_DIR / f"{slug}.md").write_text(tri_thuc, encoding="utf-8")
    (CARD_DIR / f"{slug}.json").write_text(
        json.dumps(entry, ensure_ascii=False, indent=1), encoding="utf-8")
    idx["assistants"].append(entry)
    idx["sources"][digest] = {"file": pdf.name, "slug": slug}
    save_index(idx)  # lưu NGAY sau mỗi cuốn — batch chết giữa chừng không mất gì
    log(f"XONG: {entry['ten']}  ({pdf.name} → {slug}, tri thức {len(tri_thuc)} ký tự)")
    return True


def main() -> None:
    for d in (PDF_DIR, KNOW_DIR, CARD_DIR):
        d.mkdir(parents=True, exist_ok=True)
    idx = load_index()
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode == "one":
        pdfs = [Path(sys.argv[2])]
    else:
        pdfs = sorted(PDF_DIR.glob("**/*.pdf"))
    log(f"BẮT ĐẦU: {len(pdfs)} PDF, model={MODEL}")
    ok = 0
    for i, pdf in enumerate(pdfs, 1):
        try:
            if process_one(pdf, idx):
                ok += 1
        except Exception as e:
            log(f"LỖI không lường {pdf.name}: {type(e).__name__}: {e}")
        if i % 10 == 0:
            log(f"— tiến độ {i}/{len(pdfs)}, thành công {ok} —")
    save_index(idx)
    log(f"HOÀN TẤT: {ok}/{len(pdfs)} trợ lý được tạo. Tổng thư viện: {len(idx['assistants'])}")


if __name__ == "__main__":
    main()
