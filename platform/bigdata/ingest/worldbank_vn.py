# -*- coding: utf-8 -*-
"""Chuỗi số liệu kinh tế Việt Nam và khối ASEAN từ World Bank Open Data.

Nguồn: https://api.worldbank.org/v2 — giấy phép CC BY 4.0.
Mỗi bản ghi là một quan sát thật (chỉ số × quốc gia × năm) — dùng để định cỡ thị
trường, so sánh Việt Nam với các nước láng giềng, và làm căn cứ cho phần "thị trường"
trong mô hình kinh doanh. Không phải ước lượng, không phải suy diễn.
"""
import json
import os
import sqlite3
import time
import urllib.request
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
UA = "SoloCEO-BigData/4.0 (https://bigdata.soloceo.vn; info@soloceo.vn)"
BASE = "https://api.worldbank.org/v2"

NUOC = {
    "VNM": "Việt Nam", "THA": "Thái Lan", "IDN": "Indonesia", "MYS": "Malaysia",
    "PHL": "Philippines", "SGP": "Singapore", "KHM": "Campuchia", "LAO": "Lào",
    "MMR": "Myanmar", "BRN": "Brunei",
}
# Việt Nam lấy toàn bộ chỉ số; các nước còn lại chỉ lấy nhóm chỉ số hay dùng để so sánh
SO_SANH = [
    "NY.GDP.MKTP.CD", "NY.GDP.PCAP.CD", "NY.GDP.MKTP.KD.ZG", "SP.POP.TOTL",
    "SP.URB.TOTL.IN.ZS", "FP.CPI.TOTL.ZG", "SL.UEM.TOTL.ZS", "NE.EXP.GNFS.ZS",
    "NE.IMP.GNFS.ZS", "BX.KLT.DINV.CD.WD", "IT.NET.USER.ZS", "IT.CEL.SETS.P2",
    "SE.TER.ENRR", "SH.XPD.CHEX.GD.ZS", "EG.USE.ELEC.KH.PC", "IC.BUS.EASE.XQ",
    "NV.IND.MANF.ZS", "NV.AGR.TOTL.ZS", "NV.SRV.TOTL.ZS", "ST.INT.ARVL",
]

SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES('so-lieu-kinh-te','worldbank',?,?,?,?,?,?,?,?,?, ?,'','','',NULL,'',0,'',0,'',?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,region=excluded.region,
 year=excluded.year,updated_at=excluded.updated_at"""


def lay(url, thu=3):
    for i in range(thu):
        try:
            rq = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(rq, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if i == thu - 1:
                print("    bỏ qua: %s" % str(e)[:70], flush=True)
                return None
            time.sleep(3 * (i + 1))


def so_dep(v):
    if v is None:
        return "—"
    a = abs(v)
    if a >= 1e9:
        return "%.2f tỷ" % (v / 1e9)
    if a >= 1e6:
        return "%.2f triệu" % (v / 1e6)
    if a >= 1000:
        return format(int(v), ",d").replace(",", ".")
    return "%.2f" % v


def danh_muc_chi_so():
    """Bộ chỉ số Phát triển Thế giới (nguồn 2) — API không chấp nhận 'all',
    phải lấy danh mục trước rồi truy vấn theo lô."""
    ra, trang = [], 1
    while True:
        d = lay("%s/source/2/indicator?format=json&per_page=500&page=%d" % (BASE, trang))
        if not d or len(d) < 2 or not d[1]:
            break
        ra += [x["id"] for x in d[1] if x.get("id")]
        if trang >= (d[0].get("pages") or 1):
            break
        trang += 1
    print("danh mục chỉ số: %d" % len(ra), flush=True)
    return ra


def nap_lo(con, now, ma, ten_nuoc, chi_so):
    tong, trang = 0, 1
    ds = ";".join(chi_so)
    while True:
        u = "%s/country/%s/indicator/%s?source=2&format=json&per_page=10000&page=%d" % (BASE, ma, ds, trang)
        d = lay(u)
        if not d or len(d) < 2 or not d[1]:
            break
        rows = []
        for o in d[1]:
            gt = o.get("value")
            if gt is None:
                continue
            ind = (o.get("indicator") or {}).get("value") or ""
            ind_id = (o.get("indicator") or {}).get("id") or ""
            nam = o.get("date")
            if not ind or not nam:
                continue
            ten = "%s — %s (%s)" % (ten_nuoc, ind, nam)
            mo = "%s: %s vào năm %s, theo số liệu mở của Ngân hàng Thế giới (mã chỉ số %s)." % (
                ind, so_dep(gt), nam, ind_id)
            rows.append((
                "wb-%s-%s-%s" % (ma, ind_id, nam), ten,
                "https://data.worldbank.org/indicator/%s?locations=%s" % (ind_id, ma[:2]),
                mo, ind[:200], "Số liệu kinh tế - xã hội", ind[:120], ten_nuoc,
                ", ".join([ind, ten_nuoc, str(nam)])[:300],
                int(nam) if str(nam).isdigit() else None, now,
            ))
        if rows:
            con.executemany(SQL, rows)
            con.commit()
            tong += len(rows)
        meta = d[0] if isinstance(d[0], dict) else {}
        if trang >= (meta.get("pages") or 1):
            break
        trang += 1
        time.sleep(0.3)
    return tong


def main():
    con = sqlite3.connect(DB, timeout=180)
    con.execute("PRAGMA journal_mode=WAL")
    now = datetime.now(timezone.utc).isoformat()

    ds = danh_muc_chi_so()
    LO = 30  # API giới hạn số chỉ số trên một truy vấn
    t = 0
    for i in range(0, len(ds), LO):
        t += nap_lo(con, now, "VNM", "Việt Nam", ds[i:i + LO])
        print("  Việt Nam: %d/%d chỉ số, %d quan sát" % (min(i + LO, len(ds)), len(ds), t), flush=True)
    # Một mã chỉ số đã ngừng cũng đủ làm hỏng cả truy vấn nhiều chỉ số → lọc theo danh mục
    hop_le = [c for c in SO_SANH if c in set(ds)]
    print("chỉ số so sánh hợp lệ: %d/%d" % (len(hop_le), len(SO_SANH)), flush=True)
    for ma, ten in NUOC.items():
        if ma == "VNM":
            continue
        n = nap_lo(con, now, ma, ten, hop_le)
        t += n
        print("  %-12s +%d (tổng %d)" % (ten, n, t), flush=True)
    print("XONG World Bank: %d quan sát" % t, flush=True)
    con.close()


if __name__ == "__main__":
    main()
