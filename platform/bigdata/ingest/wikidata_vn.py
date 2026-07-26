# -*- coding: utf-8 -*-
"""Mở rộng lớp dữ liệu Việt Nam từ Wikidata (CC0 — miền công cộng).

Bổ sung những nhóm mà bản nạp trong server.js chưa lấy: doanh nghiệp, thương hiệu,
tổ chức, ngân hàng, bệnh viện, công trình giao thông, sự kiện, tác phẩm, sản vật…
Dùng loại (type) riêng để KHÔNG bị bản nạp cũ xoá mất (server.js gọi delType cho
các loại dia-phuong / nhan-vat / giao-duc / bat-dong-san / du-lich / dac-san).

Truy vấn chia nhỏ theo lớp đối tượng để tránh vượt hạn mức 60 giây của máy chủ SPARQL.
"""
import json
import os
import sqlite3
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
EP = "https://query.wikidata.org/sparql"
UA = "SoloCEO-BigData/4.0 (https://bigdata.soloceo.vn; info@soloceo.vn)"

# (loại nội bộ, ngành, mô tả nền, mệnh đề WHERE, trần)
NHOM = [
    ("doanh-nghiep-vn", "Doanh nghiệp", "Doanh nghiệp Việt Nam",
     "?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q4830453 .", 20000),
    ("doanh-nghiep-vn", "Doanh nghiệp", "Doanh nghiệp có trụ sở tại Việt Nam",
     "?x wdt:P159 ?ts . ?ts wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q43229 .", 20000),
    ("thuong-hieu-vn", "Thương hiệu & sản phẩm", "Thương hiệu / sản phẩm gắn với Việt Nam",
     "?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q431289 .", 5000),
    ("to-chuc-vn", "Tổ chức", "Tổ chức tại Việt Nam",
     "?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q43229 . FILTER NOT EXISTS { ?x wdt:P31/wdt:P279* wd:Q4830453 }", 25000),
    ("y-te-vn", "Y tế & sức khỏe", "Cơ sở y tế Việt Nam",
     "?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q16917 .", 3000),
    ("tai-chinh-vn", "Tài chính & ngân hàng", "Ngân hàng / tổ chức tài chính Việt Nam",
     "?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q22687 .", 2000),
    ("ha-tang-vn", "Hạ tầng & giao thông", "Công trình giao thông Việt Nam",
     "?x wdt:P17 wd:Q881 . { ?x wdt:P31/wdt:P279* wd:Q12280 } UNION { ?x wdt:P31/wdt:P279* wd:Q34442 } UNION { ?x wdt:P31/wdt:P279* wd:Q1248784 } UNION { ?x wdt:P31/wdt:P279* wd:Q55488 }", 15000),
    ("su-kien-vn", "Sự kiện & lịch sử", "Sự kiện diễn ra tại Việt Nam",
     "?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q1656682 .", 15000),
    ("tac-pham-vn", "Văn hoá & tác phẩm", "Tác phẩm của Việt Nam",
     "?x wdt:P495 wd:Q881 . { ?x wdt:P31/wdt:P279* wd:Q11424 } UNION { ?x wdt:P31/wdt:P279* wd:Q7725634 } UNION { ?x wdt:P31/wdt:P279* wd:Q5398426 } UNION { ?x wdt:P31/wdt:P279* wd:Q2188189 }", 15000),
    ("nhan-vat-vn", "Nhân vật Việt Nam", "Người Việt Nam có hồ sơ công khai",
     "?x wdt:P27 wd:Q881 . ?x wdt:P31 wd:Q5 .", 60000),
    ("giao-duc-vn", "Giáo dục & đào tạo", "Cơ sở giáo dục Việt Nam",
     "?x wdt:P17 wd:Q881 . ?x wdt:P31/wdt:P279* wd:Q2385804 .", 8000),
    ("thien-nhien-vn", "Thiên nhiên & tài nguyên", "Đối tượng địa lý tự nhiên tại Việt Nam",
     "?x wdt:P17 wd:Q881 . { ?x wdt:P31/wdt:P279* wd:Q271669 } UNION { ?x wdt:P31/wdt:P279* wd:Q473972 }", 12000),
]

SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,'','','',NULL,'',0,'',0,'',?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,url=excluded.url,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,region=excluded.region,
 year=excluded.year,updated_at=excluded.updated_at"""


def sparql(q, thu=3):
    u = EP + "?format=json&query=" + urllib.parse.quote(q)
    for i in range(thu):
        try:
            rq = urllib.request.Request(u, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(rq, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))["results"]["bindings"]
        except Exception as e:
            if i == thu - 1:
                print("    bỏ qua: %s" % str(e)[:90], flush=True)
                return []
            time.sleep(5 * (i + 1))


def main():
    con = sqlite3.connect(DB, timeout=180)
    con.execute("PRAGMA journal_mode=WAL")
    now = datetime.now(timezone.utc).isoformat()
    tong = 0
    for typ, cat, nen, where, tran in NHOM:
        buoc = 8000
        for off in range(0, tran, buoc):
            q = """SELECT ?x ?xLabel ?xDesc ?nam WHERE {
  %s
  OPTIONAL { ?x schema:description ?xDesc . FILTER(LANG(?xDesc) IN ("vi","en")) }
  OPTIONAL { ?x wdt:P571 ?tl . BIND(YEAR(?tl) AS ?nam) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
} LIMIT %d OFFSET %d""" % (where, buoc, off)
            b = sparql(q)
            if not b:
                break
            rows = []
            for r in b:
                ten = (r.get("xLabel") or {}).get("value", "")
                if not ten or ten.startswith("Q") and ten[1:].isdigit():
                    continue
                qid = r["x"]["value"].rsplit("/", 1)[-1]
                mo = (r.get("xDesc") or {}).get("value") or nen
                nam = None
                try:
                    nam = int((r.get("nam") or {}).get("value"))
                except (TypeError, ValueError):
                    pass
                rows.append((
                    typ, "wikidata-vn", qid, ten, r["x"]["value"],
                    "%s — %s%s (nguồn Wikidata, %s)." % (
                        ten, mo, (" , thành lập/khởi đầu năm %d" % nam) if nam else "", cat.lower()),
                    mo[:200], cat, "", "Việt Nam", "", nam, now,
                ))
            if rows:
                con.executemany(SQL, rows)
                con.commit()
                tong += len(rows)
            print("  %-16s +%-5d (tổng %d)" % (typ, len(rows), tong), flush=True)
            if len(b) < buoc:
                break
            time.sleep(1)
    print("XONG Wikidata Việt Nam mở rộng: %d bản ghi" % tong, flush=True)
    con.close()


if __name__ == "__main__":
    main()
