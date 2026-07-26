# -*- coding: utf-8 -*-
"""Lượt nạp thứ hai từ OpenStreetMap Việt Nam: đường phố có tên.

Lượt đầu (osm_vietnam.py) lấy điểm kinh doanh và địa điểm; lượt này lấy mạng lưới
đường có tên — nền tảng để chuẩn hoá địa chỉ khách hàng và phân tích vùng phục vụ.
Giấy phép ODbL 1.0 — © những người đóng góp OpenStreetMap.
"""
import os
import sqlite3
from datetime import datetime, timezone

import osmium

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
PBF = os.environ.get("PBF", "/work/vn.osm.pbf")
BATCH = 5000

LOAI = {
    "motorway": "Đường cao tốc", "trunk": "Quốc lộ chính", "primary": "Đường trục chính",
    "secondary": "Đường trục phụ", "tertiary": "Đường liên khu vực",
    "residential": "Đường khu dân cư", "unclassified": "Đường chưa phân loại",
    "living_street": "Đường nội bộ", "pedestrian": "Phố đi bộ",
    "service": "Đường nội bộ / ngõ", "track": "Đường đất / nông thôn",
    "motorway_link": "Nhánh cao tốc", "trunk_link": "Nhánh quốc lộ",
    "primary_link": "Nhánh trục chính", "secondary_link": "Nhánh trục phụ",
}

SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES('duong-pho','osm-vietnam',?,?,'',?,?,'Giao thông & đường phố',?,?,?, NULL,'','','',NULL,'',0,'',0,'',?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,description=excluded.description,oneliner=excluded.oneliner,
 subcategory=excluded.subcategory,region=excluded.region,tags=excluded.tags,updated_at=excluded.updated_at"""


class Duong(osmium.SimpleHandler):
    def __init__(self, sink):
        super().__init__()
        self.sink = sink
        self.buf = []
        self.n = 0

    def way(self, w):
        t = dict(w.tags)
        hw = t.get("highway")
        if hw not in LOAI:
            return
        ten = t.get("name:vi") or t.get("name")
        if not ten or len(ten) < 3 or len(ten) > 160:
            return
        loai = LOAI[hw]
        vung = t.get("addr:district") or t.get("addr:city") or t.get("addr:province") or "Việt Nam"
        chi_tiet = []
        if t.get("ref"):
            chi_tiet.append("ký hiệu " + t["ref"])
        if t.get("lanes"):
            chi_tiet.append(t["lanes"] + " làn")
        if t.get("maxspeed"):
            chi_tiet.append("tốc độ tối đa " + t["maxspeed"])
        if t.get("surface"):
            chi_tiet.append("mặt đường " + t["surface"])
        if t.get("oneway") == "yes":
            chi_tiet.append("một chiều")
        mo = "%s — %s tại %s%s." % (
            ten, loai.lower(), vung,
            (", " + ", ".join(chi_tiet)) if chi_tiet else "")
        self.buf.append((
            "osm-w%d" % w.id, ten, mo, loai, loai, vung,
            ", ".join(filter(None, [loai, t.get("ref"), vung]))[:300],
        ))
        self.n += 1
        if len(self.buf) >= BATCH:
            self.sink(self.buf)
            self.buf = []


def main():
    con = sqlite3.connect(DB, timeout=180)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    now = datetime.now(timezone.utc).isoformat()
    total = [0]

    def sink(rows):
        con.executemany(SQL, [r + (now,) for r in rows])
        con.commit()
        total[0] += len(rows)
        print("  đã ghi %d" % total[0], flush=True)

    h = Duong(sink)
    h.apply_file(PBF, locations=False)
    if h.buf:
        sink(h.buf)
    print("XONG đường phố Việt Nam: %d" % total[0], flush=True)
    con.close()


if __name__ == "__main__":
    main()
