# -*- coding: utf-8 -*-
"""Thu thập tự động: nguồn công khai → Crawl4AI → Markdown → bigdata.

Vì sao có tệp này: trước đây mỗi nguồn phải viết một hàm nạp riêng. Từ nay bất kỳ
nguồn nào có RSS đều chỉ cần thêm một dòng vào `nguon.json`; Crawl4AI lo phần tải
trang và chuyển sang Markdown sạch.

Nguyên tắc:
- Tôn trọng robots.txt, giữ nhịp chậm, ghi rõ nguồn và thời điểm lấy.
- Chỉ lưu nội dung công khai. Không thu thập dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP).
- Mỗi tài liệu vừa lưu bản Markdown đầy đủ (bảng `tai_lieu`) vừa tạo một nốt trong
  `items` để hoà vào mạng tri thức và ô tìm kiếm.
"""
import hashlib
import html
import json
import os
import re
import sqlite3
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
C4AI = os.environ.get("CRAWL4AI_URL", "http://crawl4ai:11235")
C4AI_TOKEN = os.environ.get("CRAWL4AI_API_TOKEN", "")
C4AI_EMAIL = os.environ.get("CRAWL4AI_EMAIL", "soloceo.vn@gmail.com")
NGUON = os.environ.get("NGUON_JSON", "/work/nguon.json")
MOI_NGUON = int(os.environ.get("MOI_NGUON", "12"))     # số bài mỗi nguồn mỗi lượt
CHI_NHOM = set(filter(None, os.environ.get("CHI_NHOM", "").split(",")))
UA = "SoloCEO-DataEngine/1.0 (+https://bigdata.soloceo.vn; info@soloceo.vn)"

SCHEMA = """
CREATE TABLE IF NOT EXISTS tai_lieu (
  id INTEGER PRIMARY KEY,
  nguon TEXT NOT NULL,          -- mã nguồn (vnexpress-kd, techcrunch…)
  nhom TEXT NOT NULL,           -- nhóm Data Engine (thi-truong, cong-nghe…)
  ten_nguon TEXT,               -- tên hiển thị tiếng Việt
  url TEXT NOT NULL UNIQUE,
  tieu_de TEXT,
  tom_tat TEXT,
  markdown TEXT,                -- nội dung chuẩn hoá dạng Markdown
  so_tu INTEGER DEFAULT 0,
  ngay_dang TEXT,
  lay_luc TEXT,
  giay_phep TEXT DEFAULT 'Trích dẫn có ghi nguồn — bản quyền thuộc về đơn vị xuất bản'
);
CREATE INDEX IF NOT EXISTS idx_tl_nguon ON tai_lieu(nguon);
CREATE INDEX IF NOT EXISTS idx_tl_nhom ON tai_lieu(nhom);
"""

ITEM_SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                                year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES('tai-lieu',?,?,?,?,?,?,?,?,?,?, ?,'','','',NULL,'',0,'',?,?,?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,tags=excluded.tags,
 published=excluded.published,updated_at=excluded.updated_at"""


def lay(url, data=None, headers=None, timeout=120):
    hd = {"User-Agent": UA}
    if headers:
        hd.update(headers)
    body = json.dumps(data).encode() if data is not None else None
    if body:
        hd["Content-Type"] = "application/json"
    rq = urllib.request.Request(url, data=body, headers=hd)
    with urllib.request.urlopen(rq, timeout=timeout) as r:
        return r.read()


def jwt():
    if not C4AI_TOKEN:
        raise SystemExit("Thiếu CRAWL4AI_API_TOKEN")
    d = json.loads(lay(C4AI + "/token", {"email": C4AI_EMAIL, "api_token": C4AI_TOKEN}, timeout=60))
    return d["access_token"]


def doc_rss(url, n):
    """Lấy danh sách bài mới nhất từ RSS/Atom."""
    try:
        raw = lay(url, timeout=60)
    except Exception as e:
        print("    không đọc được RSS: %s" % str(e)[:70], flush=True)
        return []
    try:
        root = ET.fromstring(raw)
    except Exception:
        try:
            root = ET.fromstring(re.sub(rb"&(?!amp;|lt;|gt;|quot;|apos;|#)", b"&amp;", raw))
        except Exception as e:
            print("    RSS hỏng: %s" % str(e)[:60], flush=True)
            return []
    ra = []
    for it in root.iter():
        tag = it.tag.split("}")[-1]
        if tag not in ("item", "entry"):
            continue
        lien_ket = tieu_de = ngay = ""
        for c in it:
            t = c.tag.split("}")[-1]
            if t == "title":
                tieu_de = html.unescape((c.text or "").strip())
            elif t == "link":
                lien_ket = (c.text or c.attrib.get("href") or "").strip()
            elif t in ("pubDate", "published", "updated"):
                ngay = (c.text or "").strip()
        if lien_ket and tieu_de:
            ra.append({"url": lien_ket, "tieu_de": tieu_de, "ngay": ngay})
        if len(ra) >= n:
            break
    return ra


def don_markdown(md, tieu_de, ten_nguon, url, ngay):
    """Cắt bỏ phần điều hướng/quảng cáo và bọc lại theo khuôn Markdown tiếng Việt."""
    md = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", md)                 # bỏ ảnh
    md = re.sub(r"\[\s*\]\([^)]*\)", "", md)                     # bỏ liên kết rỗng
    md = re.sub(r"\n{3,}", "\n\n", md)
    dong = []
    for d in md.split("\n"):
        s = d.strip()
        if not s:
            dong.append("")
            continue
        # bỏ các dòng chỉ toàn liên kết điều hướng
        chu = re.sub(r"\[[^\]]*\]\([^)]*\)", "", s).strip(" *-|·>")
        if len(chu) < 3 and s.count("](") >= 1:
            continue
        dong.append(s)
    than = "\n".join(dong).strip()
    # cắt phần đuôi lặp (chân trang) — giữ tối đa 12.000 ký tự
    than = than[:12000]
    dau = ["# %s" % tieu_de,
           "",
           "> **Nguồn:** %s · **Địa chỉ:** %s%s" % (
               ten_nguon, url, ("  · **Đăng:** " + ngay) if ngay else ""),
           "> **Lấy về:** %s (tự động qua Crawl4AI). Trích dẫn có ghi nguồn; bản quyền thuộc đơn vị xuất bản."
           % datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
           "", "---", ""]
    return "\n".join(dau) + than


def tom_tat_tu(md, n=400):
    for d in md.split("\n"):
        s = d.strip()
        if len(s) > 80 and not s.startswith(("#", ">", "-", "*", "|")):
            return s[:n]
    return re.sub(r"\s+", " ", md)[:n]


def main():
    con = sqlite3.connect(DB, timeout=180)
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript(SCHEMA)
    now = datetime.now(timezone.utc).isoformat()
    A = jwt()
    cfg = json.load(open(NGUON, encoding="utf-8"))
    tong_moi = tong_bo = 0

    for nhom in cfg["nhom"]:
        if CHI_NHOM and nhom["ma"] not in CHI_NHOM:
            continue
        print("▸ %s" % nhom["ten"], flush=True)
        for ng in nhom["nguon"]:
            bai = doc_rss(ng["rss"], MOI_NGUON)
            print("  %-18s %d bài trong RSS" % (ng["ma"], len(bai)), flush=True)
            for b in bai:
                co = con.execute("SELECT 1 FROM tai_lieu WHERE url=?", (b["url"],)).fetchone()
                if co:
                    tong_bo += 1
                    continue
                try:
                    r = json.loads(lay(C4AI + "/md",
                                       {"url": b["url"], "f": "fit"},
                                       {"Authorization": "Bearer " + A}, timeout=150))
                except Exception as e:
                    print("      lỗi %s: %s" % (b["url"][:50], str(e)[:60]), flush=True)
                    continue
                md_raw = r.get("markdown") or ""
                if len(md_raw) < 400:
                    continue
                md = don_markdown(md_raw, b["tieu_de"], ng["ten"], b["url"], b["ngay"])
                tt = tom_tat_tu(md)
                con.execute(
                    "INSERT OR IGNORE INTO tai_lieu(nguon,nhom,ten_nguon,url,tieu_de,tom_tat,markdown,so_tu,ngay_dang,lay_luc)"
                    " VALUES(?,?,?,?,?,?,?,?,?,?)",
                    (ng["ma"], nhom["ma"], ng["ten"], b["url"], b["tieu_de"], tt, md,
                     len(md.split()), b["ngay"], now))
                khoa = hashlib.sha1(b["url"].encode()).hexdigest()[:20]
                con.execute(ITEM_SQL, (
                    "crawl-" + ng["ma"], "tl-" + khoa, b["tieu_de"], b["url"],
                    "%s\n\nNguồn: %s. %s" % (tt, ng["ten"], nhom["y_nghia"]),
                    tt[:200], nhom["ten"], ng["ten"],
                    "Việt Nam" if nhom["ma"] in ("chinh-sach", "thi-truong") else "Quốc tế",
                    ", ".join([ng["ten"], nhom["ten"]])[:300],
                    None, 0, b["ngay"], now))
                con.commit()
                tong_moi += 1
                time.sleep(1.2)   # giữ nhịp, không dồn tải lên nguồn
    n = con.execute("SELECT count(*) FROM tai_lieu").fetchone()[0]
    print("XONG: thêm %d tài liệu mới, bỏ qua %d đã có. Tổng kho: %d" % (tong_moi, tong_bo, n), flush=True)
    con.close()


if __name__ == "__main__":
    main()
