# -*- coding: utf-8 -*-
"""Nạp toàn bộ địa danh Việt Nam từ GeoNames.

Nguồn: https://download.geonames.org/export/dump/VN.zip — giấy phép CC BY 4.0.
Mỗi dòng là một địa danh có toạ độ, mã phân loại (feature class/code), dân số,
đơn vị hành chính cấp 1/2 và các tên gọi khác (alternate names).
"""
import os
import sqlite3
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
SRC = os.environ.get("VN_TXT", "/work/VN.txt")

# Lớp đối tượng GeoNames → (loại nội bộ, ngành tiếng Việt)
FCLASS = {
    "P": ("dia-diem", "Địa phương"),        # thành phố, làng xã
    "A": ("dia-diem", "Đơn vị hành chính"),
    "S": ("co-so-kinh-doanh", "Công trình & cơ sở"),
    "H": ("dia-diem", "Sông ngòi & mặt nước"),
    "T": ("dia-diem", "Địa hình"),
    "L": ("dia-diem", "Khu vực"),
    "R": ("ha-tang", "Giao thông vận tải"),
    "V": ("dia-diem", "Rừng & thảm thực vật"),
    "U": ("dia-diem", "Địa hình đáy biển"),
}
FCODE = {
    "PPLC": "Thủ đô", "PPLA": "Tỉnh lỵ", "PPLA2": "Huyện lỵ", "PPLA3": "Xã lỵ",
    "PPL": "Khu dân cư", "ADM1": "Tỉnh/Thành phố", "ADM2": "Quận/Huyện", "ADM3": "Phường/Xã",
    "AIRP": "Sân bay", "PRT": "Cảng", "HTL": "Khách sạn", "MKT": "Chợ", "MFG": "Nhà máy",
    "SCH": "Trường học", "UNIV": "Đại học", "HSP": "Bệnh viện", "BLDG": "Tòa nhà",
    "BAN": "Ngân hàng", "RSTN": "Ga đường sắt", "BUSTN": "Bến xe", "STM": "Sông suối",
    "LK": "Hồ", "BAY": "Vịnh", "ISL": "Đảo", "MT": "Núi", "BCH": "Bãi biển",
    "PK": "Đỉnh núi", "RSV": "Hồ chứa", "CAVE": "Hang động", "FRST": "Rừng",
}

SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?, NULL,'','','',NULL,'',0,'',?,'',?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,region=excluded.region,
 tags=excluded.tags,score=excluded.score,updated_at=excluded.updated_at"""


def main():
    con = sqlite3.connect(DB, timeout=120)
    con.execute("PRAGMA journal_mode=WAL")
    now = datetime.now(timezone.utc).isoformat()
    buf, total = [], 0
    with open(SRC, encoding="utf-8") as fh:
        for line in fh:
            c = line.rstrip("\n").split("\t")
            if len(c) < 19:
                continue
            gid, name, ascii_name, alt = c[0], c[1], c[2], c[3]
            lat, lon, fclass, fcode = c[4], c[5], c[6], c[7]
            admin1, admin2 = c[10], c[11]
            try:
                pop = int(c[14] or 0)
            except ValueError:
                pop = 0
            if not name:
                continue
            typ, cat = FCLASS.get(fclass, ("dia-diem", "Địa danh"))
            sub = FCODE.get(fcode, fcode or "Địa danh")
            khac = [a for a in alt.split(",")[:4] if a and a != name]
            mo_ta = "%s — %s tại Việt Nam, toạ độ %s, %s." % (name, sub.lower(), lat, lon)
            if pop:
                mo_ta += " Dân số ghi nhận %s người." % format(pop, ",d").replace(",", ".")
            if khac:
                mo_ta += " Tên gọi khác: %s." % ", ".join(khac)
            buf.append((
                typ, "geonames-vn", "gn-" + gid, name,
                "https://www.geonames.org/" + gid,
                mo_ta, sub, cat, sub, "Việt Nam",
                ", ".join(filter(None, [sub, admin1, admin2] + khac))[:400],
                min(pop, 2_000_000_000), now,
            ))
            if len(buf) >= 5000:
                con.executemany(SQL, buf)
                con.commit()
                total += len(buf)
                buf = []
                print("  đã ghi %d" % total, flush=True)
    if buf:
        con.executemany(SQL, buf)
        con.commit()
        total += len(buf)
    print("XONG GeoNames Việt Nam: %d địa danh" % total, flush=True)
    con.close()


if __name__ == "__main__":
    main()
