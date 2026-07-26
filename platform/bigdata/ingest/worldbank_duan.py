# -*- coding: utf-8 -*-
"""Nạp dự án phát triển thật của World Bank — nền cho Data Engine đúc mô hình kinh doanh.

Nguồn: https://search.worldbank.org/api/v3/projects — dữ liệu mở, CC BY 4.0.
Vì sao chọn nguồn này: đây là ~28.000 dự án CÓ THẬT, triển khai **nhiều năm** ở **nhiều
quốc gia**, và quan trọng nhất là **có số tiền cụ thể**. Ba chiều mà kho giải pháp trước
đây thiếu — tài chính, phạm vi triển khai, thời gian — đều nằm sẵn trong nguồn này.

Mỗi dự án trả lời được: ai bỏ tiền, bao nhiêu, giải quyết vấn đề gì, ở đâu, trong mấy năm.
Từ đó Data Engine mới đúc được vấn đề · giải pháp · mô hình kinh doanh có căn cứ tài chính,
thay vì mô tả suông.
"""
import json
import os
import re
import sqlite3
import time
import urllib.request
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
API = "https://search.worldbank.org/api/v3/projects"
LO = int(os.environ.get("LO", "500"))          # số dự án mỗi lượt gọi
TRAN = int(os.environ.get("TRAN", "30000"))
UA = "SoloCEO-DataEngine/1.0 (+https://bigdata.soloceo.vn; info@soloceo.vn)"

# Ngành World Bank → tiếng Việt. Giữ nguyên mã gốc trong tags để truy ngược.
NGANH = {
    "Health": "Y tế & sức khỏe",
    "Education": "Giáo dục & đào tạo",
    "Agriculture, Fishing and Forestry": "Nông nghiệp, thuỷ sản & lâm nghiệp",
    "Transportation": "Giao thông vận tải",
    "Energy and Extractives": "Năng lượng & khai khoáng",
    "Water, Sanitation and Waste Management": "Nước sạch & xử lý chất thải",
    "Information and Communications Technologies": "Công nghệ thông tin & truyền thông",
    "Financial Sector": "Tài chính & ngân hàng",
    "Industry, Trade and Services": "Công nghiệp, thương mại & dịch vụ",
    "Public Administration": "Hành chính công",
    "Social Protection": "An sinh xã hội",
    "Urban Development": "Phát triển đô thị",
    "Environment": "Môi trường",
    "Mining": "Khai khoáng",
}
# Nhóm có hàm lượng công nghệ cao — đánh dấu để bước đúc giải pháp ưu tiên
CONG_NGHE_CAO = {
    "Information and Communications Technologies", "Financial Sector",
    "Energy and Extractives", "Health", "Education", "Urban Development",
}

SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES('du-an-phat-trien','worldbank-projects',?,?,?,?,?,?,?,?,?, ?,?,?,?,NULL,'',0,'',?,?,?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,region=excluded.region,
 tags=excluded.tags,year=excluded.year,score=excluded.score,status=excluded.status,
 published=excluded.published,updated_at=excluded.updated_at"""


def lay(url, thu=4):
    for i in range(thu):
        try:
            rq = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(rq, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if i == thu - 1:
                print("    bỏ qua: %s" % str(e)[:80], flush=True)
                return None
            time.sleep(5 * (i + 1))


def tien(n):
    """Số tiền USD → chuỗi đọc được bằng tiếng Việt."""
    try:
        v = float(n or 0)
    except (TypeError, ValueError):
        return None
    if v <= 0:
        return None
    if v >= 1e9:
        return "%.2f tỷ USD" % (v / 1e9)
    if v >= 1e6:
        return "%.1f triệu USD" % (v / 1e6)
    return "%s USD" % format(int(v), ",d").replace(",", ".")


def nam(s):
    m = re.match(r"(\d{4})", str(s or ""))
    return int(m.group(1)) if m else None


def main():
    con = sqlite3.connect(DB, timeout=600)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=900000")
    con.execute("PRAGMA synchronous=NORMAL")
    now = datetime.now(timezone.utc).isoformat()

    fl = ("id,project_name,countryshortname,regionname,boardapprovaldate,closingdate,"
          "totalamt,lendprojectcost,grantamt,curr_ibrd_commitment,idacommamt,"
          "major_sector_name,sectorcode,theme_list,project_abstract,status,"
          "impagency,borrower,projectstatusdisplay")
    tong, off = 0, 0
    while off < TRAN:
        d = lay("%s?format=json&rows=%d&os=%d&fl=%s" % (API, LO, off, fl))
        if not d:
            break
        ds = d.get("projects") or {}
        if not ds:
            break
        rows = []
        for p in ds.values():
            ten = (p.get("project_name") or "").strip()
            ma = p.get("id") or p.get("proj_id")
            if not ten or not ma:
                continue
            quoc_gia = (p.get("countryshortname") or "").strip() or "Nhiều nước"
            vung = (p.get("regionname") or "").strip()
            nganh_en = (p.get("major_sector_name") or "").strip()
            nganh = NGANH.get(nganh_en, nganh_en or "Đa ngành")
            n_bd, n_kt = nam(p.get("boardapprovaldate")), nam(p.get("closingdate"))
            so_nam = (n_kt - n_bd) if (n_bd and n_kt and n_kt >= n_bd) else None

            # Tài chính — chiều mà kho giải pháp cũ hoàn toàn thiếu
            tien_tong = tien(p.get("totalamt")) or tien(p.get("lendprojectcost"))
            tien_chi = [x for x in [
                ("tổng vốn dự án", tien(p.get("lendprojectcost"))),
                ("cam kết IBRD", tien(p.get("curr_ibrd_commitment"))),
                ("cam kết IDA", tien(p.get("idacommamt"))),
                ("viện trợ không hoàn lại", tien(p.get("grantamt"))),
            ] if x[1]]

            chu_de = []
            tl = p.get("theme_list")
            if isinstance(tl, list):
                chu_de = [t.get("name") for t in tl if isinstance(t, dict) and t.get("name")][:4]

            tom_tat = re.sub(r"\s+", " ", (p.get("project_abstract") or "")).strip()
            trang_thai = (p.get("projectstatusdisplay") or p.get("status") or "").strip()
            don_vi = (p.get("impagency") or p.get("borrower") or "").strip()

            mo = ["**%s** — dự án phát triển tại %s, ngành %s." % (ten, quoc_gia, nganh.lower()), ""]
            mo.append("- **Quốc gia:** %s%s" % (quoc_gia, (" · vùng " + vung) if vung else ""))
            mo.append("- **Ngành:** %s" % nganh)
            if n_bd:
                mo.append("- **Thời gian:** duyệt %d%s%s" % (
                    n_bd, (" · kết thúc %d" % n_kt) if n_kt else "",
                    (" · kéo dài %d năm" % so_nam) if so_nam else ""))
            if tien_tong:
                mo.append("- **Quy mô vốn:** %s" % tien_tong)
            for nhan, v in tien_chi:
                mo.append("  - %s: %s" % (nhan, v))
            if don_vi:
                mo.append("- **Đơn vị thực hiện:** %s" % don_vi)
            if chu_de:
                mo.append("- **Chủ đề:** %s" % ", ".join(chu_de))
            if trang_thai:
                mo.append("- **Trạng thái:** %s" % trang_thai)
            mo.append("- **Nguồn dữ liệu:** World Bank Projects · CC BY 4.0 · mã %s" % ma)
            if tom_tat:
                mo += ["", tom_tat[:1800]]

            rows.append((
                "wb-" + ma, ten,
                "https://projects.worldbank.org/en/projects-operations/project-detail/" + ma,
                "\n".join(mo),
                (tom_tat[:200] or "%s tại %s" % (nganh, quoc_gia)),
                nganh,
                "Công nghệ cao" if nganh_en in CONG_NGHE_CAO else (chu_de[0] if chu_de else ""),
                quoc_gia,
                ", ".join(filter(None, [nganh, quoc_gia, vung] + chu_de))[:400],
                n_bd, str(n_kt or ""), trang_thai,
                "dang-hoat-dong" if "active" in trang_thai.lower() else
                ("thanh-cong" if "closed" in trang_thai.lower() else ""),
                min(int(float(p.get("totalamt") or 0) / 1000), 2_000_000_000),  # điểm = quy mô vốn (nghìn USD)
                (p.get("boardapprovaldate") or "")[:10], now,
            ))
        if rows:
            con.executemany(SQL, rows)
            con.commit()
            tong += len(rows)
        print("  đã nạp %s dự án (offset %d)" % (format(tong, ",d").replace(",", "."), off), flush=True)
        if len(ds) < LO:
            break
        off += LO
        time.sleep(0.5)

    print("XONG World Bank Projects: %s dự án" % format(tong, ",d").replace(",", "."), flush=True)
    # Vài con số để biết kho có gì
    for q, nhan in [
        ("SELECT count(DISTINCT region) FROM items WHERE type='du-an-phat-trien'", "số quốc gia"),
        ("SELECT count(DISTINCT category) FROM items WHERE type='du-an-phat-trien'", "số ngành"),
        ("SELECT min(year),max(year) FROM items WHERE type='du-an-phat-trien' AND year IS NOT NULL", "khoảng năm"),
    ]:
        print("  %s: %s" % (nhan, con.execute(q).fetchone()), flush=True)
    con.close()


if __name__ == "__main__":
    main()
