# -*- coding: utf-8 -*-
"""Nạp công trình nghiên cứu và tổ chức khoa học có yếu tố Việt Nam từ OpenAlex.

Nguồn: https://api.openalex.org — dữ liệu CC0 (miền công cộng).
Ý nghĩa với Solo CEO: đây là tín hiệu đổi mới sáng tạo — ai đang nghiên cứu gì,
ở trường/viện nào, hợp tác với ai; dùng để tìm chuyên gia và công nghệ nền cho ý tưởng.
"""
import json
import os
import sqlite3
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
MAIL = os.environ.get("OPENALEX_MAIL", "info@soloceo.vn")
TRAN = int(os.environ.get("TRAN", "250000"))  # trần số bản ghi công trình
UA = "SoloCEO-BigData/4.0 (https://bigdata.soloceo.vn; %s)" % MAIL

LINH_VUC = {
    "Computer Science": "Công nghệ thông tin", "Medicine": "Y tế & sức khỏe",
    "Biology": "Sinh học", "Chemistry": "Hóa học", "Physics": "Vật lý",
    "Engineering": "Kỹ thuật", "Materials Science": "Vật liệu",
    "Environmental Science": "Môi trường", "Agricultural and Food Sciences": "Nông nghiệp & thực phẩm",
    "Economics": "Kinh tế", "Business": "Kinh doanh", "Mathematics": "Toán học",
    "Psychology": "Tâm lý học", "Sociology": "Xã hội học", "Education": "Giáo dục",
    "Political Science": "Chính trị học", "Geology": "Địa chất", "Geography": "Địa lý",
    "Art": "Nghệ thuật", "History": "Lịch sử", "Philosophy": "Triết học",
}

SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,'','','',?,'',0,'',?,?,?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,url=excluded.url,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,tags=excluded.tags,
 year=excluded.year,score=excluded.score,updated_at=excluded.updated_at"""


def lay(url, thu=4):
    for i in range(thu):
        try:
            rq = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(rq, timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if i == thu - 1:
                raise
            time.sleep(2 * (i + 1))
            print("    thử lại (%s)" % str(e)[:60], flush=True)


def nap(con, rows):
    con.executemany(SQL, rows)
    con.commit()


def to_chuc(con, now):
    """Trường, viện, bệnh viện, doanh nghiệp có hoạt động nghiên cứu tại Việt Nam."""
    cur, tong = "*", 0
    while cur:
        u = ("https://api.openalex.org/institutions?filter=country_code:VN"
             "&per-page=200&cursor=%s&mailto=%s" % (urllib.parse.quote(cur), MAIL))
        d = lay(u)
        rows = []
        for it in d.get("results", []):
            ten = it.get("display_name") or ""
            if not ten:
                continue
            loai = (it.get("type") or "").replace("_", " ")
            tp = ((it.get("geo") or {}).get("city")) or "Việt Nam"
            mo = "%s — tổ chức %s tại %s. Đã công bố %s công trình, được trích dẫn %s lần." % (
                ten, loai or "nghiên cứu", tp,
                format(it.get("works_count") or 0, ",d").replace(",", "."),
                format(it.get("cited_by_count") or 0, ",d").replace(",", "."))
            rows.append((
                "to-chuc-nghien-cuu", "openalex", it["id"].rsplit("/", 1)[-1], ten,
                it.get("homepage_url") or it["id"], mo, loai,
                "Nghiên cứu & đào tạo", loai, tp,
                ", ".join([x.get("display_name", "") for x in (it.get("topics") or [])[:5]])[:400],
                None, None, min(it.get("cited_by_count") or 0, 2_000_000_000), "", now,
            ))
        if rows:
            nap(con, rows)
            tong += len(rows)
            print("  tổ chức: %d" % tong, flush=True)
        cur = (d.get("meta") or {}).get("next_cursor")
        if not d.get("results"):
            break
    return tong


def cong_trinh(con, now):
    cur, tong = "*", 0
    while cur and tong < TRAN:
        u = ("https://api.openalex.org/works?filter=institutions.country_code:VN"
             "&per-page=200&cursor=%s&mailto=%s" % (urllib.parse.quote(cur), MAIL))
        d = lay(u)
        rows = []
        for w in d.get("results", []):
            ten = (w.get("display_name") or "").strip()
            if not ten or len(ten) > 300:
                continue
            tac_gia = [a["author"]["display_name"] for a in (w.get("authorships") or [])[:5]
                       if a.get("author", {}).get("display_name")]
            vien = []
            for a in (w.get("authorships") or []):
                for ins in a.get("institutions") or []:
                    if ins.get("country_code") == "VN" and ins.get("display_name"):
                        vien.append(ins["display_name"])
            vien = list(dict.fromkeys(vien))[:3]
            chu_de = [t.get("display_name", "") for t in (w.get("topics") or [])[:4]]
            nganh_en = ((w.get("primary_topic") or {}).get("field") or {}).get("display_name") or ""
            nganh = LINH_VUC.get(nganh_en, nganh_en or "Nghiên cứu")
            nam = w.get("publication_year")
            mo = "%s — công trình nghiên cứu%s%s. %s%sĐược trích dẫn %s lần." % (
                ten,
                (" năm %d" % nam) if nam else "",
                (" của " + ", ".join(tac_gia)) if tac_gia else "",
                ("Đơn vị Việt Nam: " + ", ".join(vien) + ". ") if vien else "",
                ("Chủ đề: " + ", ".join(c for c in chu_de if c) + ". ") if any(chu_de) else "",
                format(w.get("cited_by_count") or 0, ",d").replace(",", "."))
            rows.append((
                "nghien-cuu", "openalex", w["id"].rsplit("/", 1)[-1], ten,
                (w.get("doi") or w["id"]), mo, nganh, nganh,
                chu_de[0] if chu_de else "", "Việt Nam",
                ", ".join(filter(None, chu_de + vien + tac_gia))[:400],
                nam, len(w.get("authorships") or []) or None,
                min(w.get("cited_by_count") or 0, 2_000_000_000),
                w.get("publication_date") or "", now,
            ))
        if rows:
            nap(con, rows)
            tong += len(rows)
            if tong % 4000 < 200:
                print("  công trình: %d" % tong, flush=True)
        cur = (d.get("meta") or {}).get("next_cursor")
        if not d.get("results"):
            break
    return tong


def main():
    con = sqlite3.connect(DB, timeout=180)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    now = datetime.now(timezone.utc).isoformat()
    a = to_chuc(con, now)
    b = cong_trinh(con, now)
    print("XONG OpenAlex Việt Nam: %d tổ chức + %d công trình" % (a, b), flush=True)
    con.close()


if __name__ == "__main__":
    main()
