"""
Factory kép cho kho "Mô hình kinh doanh" (121 PDF):
- Tên file chứa business-model / revenue-models / how-companies-make-money
  → GÓI MÔ HÌNH KINH DOANH (JSON đầy đủ: công thức, hướng, lộ trình 90 ngày,
    map 8 nền tảng) ghi /bm-out/{slug}.json + index.json → trang
    /workspace/mo-hinh-kinh-doanh đọc động.
- Còn lại → TRỢ LÝ AI mặc định (như factory_agents.py) ghi /agents/{slug}/.

Dedupe theo hash nội dung (bản "(1).pdf" trùng sẽ bị bỏ). Idempotent.
Env: PDF_DIR /pdfs · BM_DIR /bm-out · AGENTS_DIR /agents · TROLY_KEY · MODEL soloceo-fast
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF
import httpx

PDF_DIR = Path(os.environ.get("PDF_DIR", "/pdfs"))
BM_DIR = Path(os.environ.get("BM_DIR", "/bm-out"))
AGENTS_DIR = Path(os.environ.get("AGENTS_DIR", "/agents"))
LITELLM = os.environ.get("LITELLM", "https://llm.soloceo.vn")
KEY = os.environ["TROLY_KEY"]
MODEL = os.environ.get("MODEL", "soloceo-fast")
MAX_IN = int(os.environ.get("MAX_IN", "30000"))
LOG = PDF_DIR / "factory-bm.log"

BM_PATTERN = re.compile(r"(?i)business.?models?|revenue.?models|how_companies_make_money")
PLATFORM_KEYS = ["deerflow", "sandbox", "flowgram", "midscene", "dolphin", "arishem", "godlp", "g3"]
NHOM = ("Mô hình kinh doanh, Chiến lược, Marketing & Thương hiệu, Bán hàng, "
        "Tài chính & Gọi vốn, Vận hành & Quy trình, Nhân sự & Lãnh đạo, "
        "Công nghệ & AI, Khách hàng & Trải nghiệm, Khởi nghiệp")

BM_PROMPT = """Bạn là kiến trúc sư sản phẩm của SoloCEO — nền tảng AI cho doanh nghiệp một người tại Việt Nam.
Từ tài liệu (tiếng Anh) dưới đây, ĐÓNG GÓI thành MỘT GÓI MÔ HÌNH KINH DOANH tiếng Việt để CEO Việt chọn
và đội AI thực thi. KHÔNG chép nguyên văn — tổng hợp bằng lời của bạn, ví dụ Việt hoá.

Trả về DUY NHẤT một JSON hợp lệ (không markdown):
{"ten":"tên mô hình ngắn gọn tiếng Việt hoặc giữ tên gốc nếu là danh từ riêng (<=45 ký tự)",
 "tagline":"1 câu bán mô hình này cho CEO (<=140 ký tự)",
 "nhom":"một trong: %s",
 "gioiThieu":"đoạn 80-140 từ: mô hình là gì, hợp với ai, logic kiếm tiền",
 "congThuc":{"tao":"TẠO giá trị: …(1 câu sắc)","trao":"TRAO giá trị: …","giu":"GIỮ giá trị: …",
   "doanhThu":["3-4 dòng doanh thu cụ thể"],"chiPhi":["3-4 nhóm chi phí"],
   "ruiRoPhapLy":"1-2 câu rủi ro/pháp lý VN cần lưu ý"},
 "variants":[{"id":"slug-ngan","ten":"hướng triển khai","hopVoi":"ngành/đối tượng hợp",
   "doKho":"Dễ|Vừa|Khó","ruiRo":"mức rủi ro ngắn","moTa":"1-2 câu"}]  (3-5 hướng),
 "loTrinh":[{"id":"pha-1","ten":"tên pha","tuan":"Tuần x–y",
   "steps":[{"id":"slug","ten":"tên bước","moTa":"1-2 câu làm gì + kết quả",
     "team":"Kinh doanh|Marketing|Nội dung|Vận hành|Kế toán|Nghiên cứu (1-2 đội)",
     "platforms":["2-4 trong: %s"]}] (2-3 bước/pha)}] (đúng 4 pha phủ ~90 ngày),
 "canhBao":["4 sai lầm chết người khi làm mô hình này"],
 "chiSo":["5-6 chỉ số theo dõi"]}

LƯU Ý platforms: deerflow=điều phối AI, sandbox=agent dựng web/tài liệu, flowgram=quy trình lặp,
midscene=thao tác web, dolphin=đọc giấy tờ, arishem=chặn phê duyệt tiền/pháp lý, godlp=che dữ liệu
cá nhân, g3=an ninh mạng. Bước chạm TIỀN/PHÁP LÝ bắt buộc có "arishem".

TÊN TÀI LIỆU: %s

NỘI DUNG:
%s"""

AGENT_PROMPT = """Bạn là biên tập viên tri thức của SoloCEO — nền tảng AI cho doanh nghiệp một người tại Việt Nam.
Từ tài liệu (tiếng Anh) dưới đây, tạo MỘT TRỢ LÝ AI tiếng Việt chuyên sâu để CEO Việt hỏi đáp áp dụng ngay.
KHÔNG chép nguyên văn; ví dụ Việt hoá. Trả về DUY NHẤT JSON:
{"ten":"Cố vấn/Chuyên gia <Chủ đề> (<=42 ký tự)","moTa":"1 câu (<=130 ký tự)","nhom":"một trong: %s",
 "chuyenMon":["5-6 năng lực"],
 "triThuc":"Markdown 1200-1800 từ tiếng Việt: ## Khung tư duy chính, ## Quy trình áp dụng cho doanh nghiệp nhỏ VN, ## Checklist hành động, ## Sai lầm thường gặp, ## Chỉ số theo dõi."}

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
- Luôn tiếng Việt, có cấu trúc, ví dụ Việt hoá.
- Chủ động hỏi lại ngành + quy mô của CEO trước khi khuyên cụ thể.
- Kết tư vấn dài bằng "**Việc nên làm ngay tuần này**".
- Vượt chuyên môn (thuế, pháp lý chi tiết) → nói rõ giới hạn, khuyên gặp chuyên gia.

*Tri thức tổng hợp từ: "{nguon}" (tài liệu bản quyền thương mại của SoloCEO). Trợ lý diễn giải lại
bằng lời riêng, không thay thế tài liệu gốc.*
"""


class BudgetHet(Exception):
    pass


def log(m: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {m}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def title_of(pdf: Path) -> str:
    n = pdf.stem
    n = re.sub(r"\s*\(\d+\)$", "", n)
    n = re.sub(r"-[a-z0-9]{6}$", "", n)          # mã đuôi -oyi2ud
    n = re.sub(r"(?i)^super.?guide[-_ ]*", "", n)
    n = re.sub(r"(?i)[-_ ]v\d+$", "", n)
    n = n.replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", n).strip()


def slug_of(title: str, prefix: str) -> str:
    s = unicodedata.normalize("NFD", title)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return (prefix + s)[:52].rstrip("-")


def extract(pdf: Path) -> str:
    doc = fitz.open(pdf)
    text = "\n".join(p.get_text() for p in doc)
    text = re.sub(r"\n{3,}", "\n\n", text)
    if len(text) > MAX_IN:
        text = text[: int(MAX_IN * 0.7)] + "\n\n[...rút gọn...]\n\n" + text[-int(MAX_IN * 0.3):]
    return text.strip()


def call_llm(prompt: str, max_tokens: int) -> dict:
    r = httpx.post(
        f"{LITELLM}/v1/chat/completions",
        headers={"Authorization": f"Bearer {KEY}"},
        json={"model": MODEL, "max_tokens": max_tokens, "temperature": 0.4,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=420,
    )
    if r.status_code == 429:
        raise BudgetHet(r.text[:150])
    r.raise_for_status()
    raw = r.json()["choices"][0]["message"]["content"].strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw[raw.find("{"): raw.rfind("}") + 1])


def yaml_quote(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def validate_bm(card: dict, slug: str, title: str) -> dict:
    """Ép schema an toàn — LLM lệch thì sửa/mặc định, không để UI vỡ."""
    def s(v, d=""):
        return str(v) if v else d
    card["id"] = slug
    card["ten"] = s(card.get("ten"), title)[:60]
    card["tagline"] = s(card.get("tagline"))[:180]
    card["nhom"] = s(card.get("nhom"), "Mô hình kinh doanh")
    card["planMin"] = "STARTER"
    card["trangThai"] = "SẴN SÀNG"
    ct = card.get("congThuc") or {}
    card["congThuc"] = {
        "tao": s(ct.get("tao")), "trao": s(ct.get("trao")), "giu": s(ct.get("giu")),
        "doanhThu": [s(x) for x in (ct.get("doanhThu") or [])][:5],
        "chiPhi": [s(x) for x in (ct.get("chiPhi") or [])][:5],
        "ruiRoPhapLy": s(ct.get("ruiRoPhapLy")),
    }
    vs = []
    for i, v in enumerate((card.get("variants") or [])[:5]):
        dk = v.get("doKho") if v.get("doKho") in ("Dễ", "Vừa", "Khó") else "Vừa"
        vs.append({"id": s(v.get("id"), f"huong-{i+1}"), "ten": s(v.get("ten"))[:60],
                   "hopVoi": s(v.get("hopVoi")), "doKho": dk, "ruiRo": s(v.get("ruiRo")),
                   "moTa": s(v.get("moTa"))})
    card["variants"] = vs
    phases = []
    for pi, p in enumerate((card.get("loTrinh") or [])[:4]):
        steps = []
        for si, st in enumerate((p.get("steps") or [])[:3]):
            plats = [x for x in (st.get("platforms") or []) if x in PLATFORM_KEYS] or ["deerflow"]
            steps.append({"id": s(st.get("id"), f"p{pi+1}-b{si+1}"), "ten": s(st.get("ten"))[:80],
                          "moTa": s(st.get("moTa")), "team": s(st.get("team"), "Kinh doanh"),
                          "platforms": plats})
        phases.append({"id": s(p.get("id"), f"pha-{pi+1}"), "ten": s(p.get("ten"))[:60],
                       "tuan": s(p.get("tuan")), "steps": steps})
    card["loTrinh"] = phases
    card["canhBao"] = [s(x) for x in (card.get("canhBao") or [])][:5]
    card["chiSo"] = [s(x) for x in (card.get("chiSo") or [])][:7]
    card["nguon"] = title
    return card


def main() -> None:
    BM_DIR.mkdir(parents=True, exist_ok=True)
    AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    index_file = BM_DIR / "index.json"
    index = json.loads(index_file.read_text(encoding="utf-8")) if index_file.exists() else []
    seen_hash: set[str] = set()
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    log(f"BẮT ĐẦU: {len(pdfs)} PDF (model={MODEL})")
    bm_ok = ag_ok = skip = err = 0
    for i, pdf in enumerate(pdfs, 1):
        try:
            digest = hashlib.sha256(pdf.read_bytes()).hexdigest()[:16]
            if digest in seen_hash:
                skip += 1
                continue
            seen_hash.add(digest)
            title = title_of(pdf)
            is_bm = bool(BM_PATTERN.search(pdf.name))
            if is_bm:
                slug = slug_of(title, "bm-")
                out = BM_DIR / f"{slug}.json"
                if out.exists():
                    skip += 1
                    continue
                text = extract(pdf)
                if len(text) < 800:
                    log(f"BỎ (ít chữ): {pdf.name}")
                    err += 1
                    continue
                card = None
                for attempt in (1, 2):
                    try:
                        card = call_llm(BM_PROMPT % (NHOM, ", ".join(PLATFORM_KEYS), title, text), 7000)
                        break
                    except BudgetHet:
                        raise
                    except Exception as e:
                        log(f"LLM lỗi {attempt} [{pdf.name}]: {type(e).__name__}: {str(e)[:100]}")
                        if attempt == 2:
                            card = None
                        else:
                            time.sleep(8)
                if card is None:
                    err += 1
                    continue
                card = validate_bm(card, slug, title)
                out.write_text(json.dumps(card, ensure_ascii=False, indent=1), encoding="utf-8")
                index = [e for e in index if e["id"] != slug]
                index.append({"id": slug, "ten": card["ten"], "tagline": card["tagline"],
                              "nhom": card["nhom"], "planMin": "STARTER", "trangThai": "SẴN SÀNG"})
                index_file.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
                bm_ok += 1
                log(f"GÓI: {card['ten']}  ({pdf.name} → {slug})")
            else:
                slug = slug_of(title, "cv-")
                out = AGENTS_DIR / slug
                if out.exists():
                    skip += 1
                    continue
                text = extract(pdf)
                if len(text) < 800:
                    log(f"BỎ (ít chữ): {pdf.name}")
                    err += 1
                    continue
                card = None
                for attempt in (1, 2):
                    try:
                        card = call_llm(AGENT_PROMPT % (NHOM, title, text), 5000)
                        break
                    except BudgetHet:
                        raise
                    except Exception as e:
                        log(f"LLM lỗi {attempt} [{pdf.name}]: {type(e).__name__}: {str(e)[:100]}")
                        if attempt == 2:
                            card = None
                        else:
                            time.sleep(8)
                if card is None:
                    err += 1
                    continue
                ten = str(card.get("ten", f"Cố vấn {title}"))[:60]
                soul = SOUL_TMPL.format(
                    ten=ten, mo_ta=str(card.get("moTa", ""))[:200],
                    chuyen_mon="; ".join(str(x) for x in card.get("chuyenMon", [])[:6]),
                    tri_thuc=str(card.get("triThuc", "")).strip(), nguon=title)
                out.mkdir(parents=True, exist_ok=True)
                (out / "config.yaml").write_text(
                    f"name: {slug}\ndescription: {yaml_quote(ten + ' — ' + str(card.get('moTa',''))[:200])}\n",
                    encoding="utf-8")
                (out / "SOUL.md").write_text(soul, encoding="utf-8")
                ag_ok += 1
                log(f"TRỢ LÝ: {ten}  ({pdf.name} → {slug})")
        except BudgetHet as e:
            log(f"DỪNG: hết budget ({e})")
            break
        except Exception as e:
            log(f"LỖI [{pdf.name}]: {type(e).__name__}: {str(e)[:120]}")
            err += 1
        if i % 10 == 0:
            log(f"— {i}/{len(pdfs)}: gói {bm_ok}, trợ lý {ag_ok}, bỏ {skip}, lỗi {err} —")
        time.sleep(2)
    log(f"HOÀN TẤT: {bm_ok} gói mô hình + {ag_ok} trợ lý, bỏ {skip}, lỗi {err} / {len(pdfs)} file")


if __name__ == "__main__":
    main()
