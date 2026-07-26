# -*- coding: utf-8 -*-
"""Thu thập danh bạ ngành nghề Việt Nam từ Trang Vàng (trangvangvietnam.com).

Cơ sở pháp lý của việc thu thập:
- robots.txt của trang cho `User-agent: *` → `Allow: /` kèm `Crawl-delay: 5`.
  Script giữ đúng nhịp 5 giây, chỉ đọc trang danh mục công khai.
- **Chỉ lấy thông tin cấp doanh nghiệp** (tên · ngành · địa chỉ · giới thiệu).
  Mọi chuỗi giống số điện thoại / email đều bị lược bỏ trước khi lưu —
  không thu thập dữ liệu cá nhân để chào hàng (Nghị định 13/2023/NĐ-CP).

Giá trị: đây là lớp "doanh nghiệp Việt Nam theo ngành" mà các nguồn mở quốc tế
(Wikidata, OpenStreetMap) rất mỏng — phục vụ bước phân tích cạnh tranh và tìm
nhà cung cấp trong Data Engine.
"""
import json
import os
import re
import sqlite3
import time
import urllib.request
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
C4AI = os.environ.get("CRAWL4AI_URL", "http://crawl4ai:11235")
C4AI_TOKEN = os.environ.get("CRAWL4AI_API_TOKEN", "")
C4AI_EMAIL = os.environ.get("CRAWL4AI_EMAIL", "info@soloceo.vn")
SO_NGANH = int(os.environ.get("SO_NGANH", "40"))     # số ngành xử lý mỗi lượt
NHIP = float(os.environ.get("NHIP", "5"))            # giây giữa 2 lượt tải (theo Crawl-delay)
GOC = "https://trangvangvietnam.com"
UA = "SoloCEO-DataEngine/1.0 (+https://bigdata.soloceo.vn)"

SCHEMA = """
CREATE TABLE IF NOT EXISTS tv_nganh (
  id INTEGER PRIMARY KEY, ma TEXT UNIQUE, ten TEXT, url TEXT, so_dn INTEGER DEFAULT 0,
  da_lay INTEGER DEFAULT 0, lay_luc TEXT
);
"""
ITEM_SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                                year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES('doanh-nghiep-vn','trangvang',?,?,?,?,?,?,?,?,?, NULL,'','','',NULL,'',0,'',0,'',?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,url=excluded.url,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,region=excluded.region,
 tags=excluded.tags,updated_at=excluded.updated_at"""

RE_DT = re.compile(r"(?:\+?84|0)\d[\d .\-()]{7,13}\d")
RE_MAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")


def bo_pii(s):
    """Lược mọi chuỗi giống số điện thoại / email — không lưu dữ liệu liên hệ cá nhân."""
    s = RE_DT.sub("[đã lược]", s or "")
    return RE_MAIL.sub("[đã lược]", s)


def lay(url, data=None, headers=None, timeout=150):
    hd = {"User-Agent": UA}
    if headers:
        hd.update(headers)
    body = json.dumps(data).encode() if data is not None else None
    if body:
        hd["Content-Type"] = "application/json"
    with urllib.request.urlopen(urllib.request.Request(url, data=body, headers=hd), timeout=timeout) as r:
        return r.read()


def jwt():
    d = json.loads(lay(C4AI + "/token", {"email": C4AI_EMAIL, "api_token": C4AI_TOKEN}, timeout=60))
    return d["access_token"]


def md(url, A, loc="fit"):
    r = json.loads(lay(C4AI + "/md", {"url": url, "f": loc}, {"Authorization": "Bearer " + A}))
    return r.get("markdown") or ""


def quet_nganh(con, A, so_trang=None):
    """Đọc mục lục ngành nghề. Mục lục phân trang `findex.asp?page=1..N`;
    trang đầu cho biết N, quét hết một lần rồi dùng dần ở các lượt sau."""
    t = md(GOC + "/findex.asp", A, "raw")
    trang = [int(x) for x in re.findall(r"findex\.asp\?page=(\d+)", t)] or [1]
    het = so_trang or max(trang)
    print("mục lục có %d trang" % het, flush=True)
    tong = 0
    for p in range(1, het + 1):
        if p > 1:
            try:
                t = md("%s/findex.asp?page=%d" % (GOC, p), A, "raw")
            except Exception as e:
                print("  trang %d lỗi: %s" % (p, str(e)[:50]), flush=True)
                time.sleep(NHIP)
                continue
        ds = re.findall(r"\[([^\]]{3,80}?)\s*\((\d+)\)\]\((%s/categories/(\d+)/[^)]+)\)" % re.escape(GOC), t)
        for ten, so, url, ma in ds:
            con.execute("INSERT OR IGNORE INTO tv_nganh(ma,ten,url,so_dn) VALUES(?,?,?,?)",
                        (ma, ten.strip(), url, int(so)))
        con.commit()
        tong += len(ds)
        if p % 10 == 0 or p == het:
            print("  trang %d/%d · đã biết %d ngành" % (
                p, het, con.execute("SELECT count(*) FROM tv_nganh").fetchone()[0]), flush=True)
        time.sleep(NHIP)


def doc_dn(markdown, ten_nganh):
    """Tách các doanh nghiệp trong một trang danh mục."""
    ra = []
    khoi = re.split(r"\n##\s+", markdown)
    for k in khoi[1:]:
        m = re.match(r"\[([^\]]+)\]\((%s/listings/(\d+)/[^)]+)\)" % re.escape(GOC), k)
        if not m:
            continue
        ten, url, ma = m.group(1).strip(), m.group(2), m.group(3)
        than = k[m.end():]
        dia_chi = ""
        for d in than.split("\n"):
            d = d.strip()
            if re.search(r"(Đường|Phố|Quận|Huyện|Phường|Xã|Thành phố|Tỉnh|TP\.)", d) and 15 < len(d) < 220:
                dia_chi = d
                break
        gt = " ".join([x.strip() for x in than.split("\n")
                       if len(x.strip()) > 40 and x.strip() != dia_chi][:2])[:600]
        tinh = ""
        mt = re.search(r"([^,]+(?:Việt Nam)?)\s*$", dia_chi)
        if mt:
            phan = [p.strip() for p in dia_chi.split(",")]
            tinh = phan[-2] if len(phan) >= 2 and "Việt Nam" in phan[-1] else phan[-1]
        ra.append({"ma": ma, "ten": ten, "url": url, "dia_chi": bo_pii(dia_chi),
                   "gioi_thieu": bo_pii(gt), "tinh": tinh or "Việt Nam", "nganh": ten_nganh})
    return ra


def main():
    if not C4AI_TOKEN:
        raise SystemExit("Thiếu CRAWL4AI_API_TOKEN")
    con = sqlite3.connect(DB, timeout=180)
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript(SCHEMA)
    now = datetime.now(timezone.utc).isoformat()
    A = jwt()
    # Quét lại mục lục khi kho ngành còn mỏng (lần đầu, hoặc muốn bổ sung)
    if con.execute("SELECT count(*) FROM tv_nganh").fetchone()[0] < 200 or os.environ.get("QUET_MUC_LUC"):
        quet_nganh(con, A)

    ds = con.execute("SELECT ma,ten,url FROM tv_nganh WHERE da_lay=0 ORDER BY so_dn DESC LIMIT ?",
                     (SO_NGANH,)).fetchall()
    print("sẽ lấy %d ngành" % len(ds), flush=True)
    tong = 0
    for ma, ten, url in ds:
        try:
            t = md(url, A)
        except Exception as e:
            print("  %-40s lỗi: %s" % (ten[:40], str(e)[:50]), flush=True)
            time.sleep(NHIP)
            continue
        dn = doc_dn(t, ten)
        rows = []
        for d in dn:
            mo = ("**%s** — doanh nghiệp Việt Nam trong ngành %s.\n\n"
                  "- **Ngành:** %s\n- **Địa chỉ:** %s\n- **Tỉnh/Thành:** %s\n"
                  "- **Nguồn dữ liệu:** Trang Vàng Việt Nam · thông tin doanh nghiệp công khai\n\n%s") % (
                d["ten"], ten, ten, d["dia_chi"] or "chưa có", d["tinh"], d["gioi_thieu"])
            rows.append(("tv-" + d["ma"], d["ten"], d["url"], mo,
                         (d["gioi_thieu"] or ten)[:200], "Danh bạ doanh nghiệp", ten,
                         d["tinh"], ", ".join([ten, d["tinh"]])[:300], now))
        if rows:
            con.executemany(ITEM_SQL, rows)
        con.execute("UPDATE tv_nganh SET da_lay=1, lay_luc=? WHERE ma=?", (now, ma))
        con.commit()
        tong += len(rows)
        print("  %-45s +%d (tổng %d)" % (ten[:45], len(rows), tong), flush=True)
        time.sleep(NHIP)
    con_lai = con.execute("SELECT count(*) FROM tv_nganh WHERE da_lay=0").fetchone()[0]
    print("XONG: thêm %d doanh nghiệp. Còn %d ngành chưa lấy." % (tong, con_lai), flush=True)
    con.close()


if __name__ == "__main__":
    main()
