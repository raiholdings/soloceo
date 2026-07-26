# -*- coding: utf-8 -*-
"""Chuẩn hoá mô tả của mọi bản ghi sang Markdown tiếng Việt có bố cục.

Trước đây mỗi bộ nạp viết mô tả theo một kiểu (câu dài, tiếng Anh lẫn tiếng Việt,
không có cấu trúc). Kết quả là trang chi tiết đọc rất khó và trợ lý AI khó trích ý.

Cách làm: KHÔNG gọi AI (800 nghìn bản ghi thì không khả thi và dễ bịa), mà dựng lại
mô tả từ chính các trường đã có theo khuôn Markdown thống nhất cho từng loại:

    **<Tên>** — <một dòng nói rõ đây là gì>

    - **Ngành:** …
    - **Khu vực:** …
    - **Nguồn:** … (giấy phép)

    <mô tả gốc giữ nguyên, đã dọn khoảng trắng>

Chỉ ghi đè khi mô tả mới thực sự đầy đủ hơn; luôn giữ lại nội dung gốc.
"""
import os
import re
import sqlite3
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
LO = 5000
CHI_LOAI = set(filter(None, os.environ.get("CHI_LOAI", "").split(",")))

# Loại → (nhãn tiếng Việt, câu định danh)
NHAN = {
    "co-so-kinh-doanh": ("Cơ sở kinh doanh", "một cơ sở kinh doanh đang hoạt động"),
    "co-so-giao-duc": ("Cơ sở giáo dục", "một cơ sở giáo dục"),
    "co-so-y-te": ("Cơ sở y tế", "một cơ sở y tế"),
    "luu-tru": ("Cơ sở lưu trú", "một cơ sở lưu trú"),
    "diem-den": ("Điểm đến", "một điểm đến du lịch"),
    "dia-diem": ("Địa điểm", "một địa điểm"),
    "duong-pho": ("Đường phố", "một tuyến đường"),
    "ha-tang": ("Hạ tầng", "một công trình hạ tầng"),
    "hanh-chinh": ("Hành chính công", "một cơ quan hành chính"),
    "bat-dong-san-kcn": ("Bất động sản công nghiệp", "một khu đất công nghiệp/thương mại"),
    "nghien-cuu": ("Nghiên cứu", "một công trình nghiên cứu khoa học"),
    "chuyen-gia-vn": ("Chuyên gia", "một nhà nghiên cứu tại Việt Nam"),
    "to-chuc-nghien-cuu": ("Tổ chức nghiên cứu", "một tổ chức nghiên cứu"),
    "so-lieu-kinh-te": ("Số liệu kinh tế", "một quan sát thống kê"),
    "tri-thuc-vi": ("Tri thức", "một mục tri thức"),
    "doanh-nghiep-vn": ("Doanh nghiệp", "một doanh nghiệp Việt Nam"),
    "to-chuc-vn": ("Tổ chức", "một tổ chức tại Việt Nam"),
    "company": ("Doanh nghiệp", "một doanh nghiệp"),
    "startup": ("Startup", "một startup"),
    "technology": ("Công nghệ", "một dự án công nghệ mã nguồn mở"),
    "tai-lieu": ("Tài liệu", "một tài liệu thu thập từ nguồn công khai"),
}
GIAY_PHEP = {
    "osm-vietnam": "OpenStreetMap Việt Nam · ODbL 1.0, © những người đóng góp OpenStreetMap",
    "geonames-vn": "GeoNames · CC BY 4.0",
    "wikidata-vn": "Wikidata · CC0",
    "wikidata": "Wikidata · CC0",
    "wikipedia-vi": "Wikipedia tiếng Việt · CC BY-SA 4.0",
    "openalex": "OpenAlex · CC0",
    "worldbank": "World Bank Open Data · CC BY 4.0",
    "yc": "Y Combinator (yc-oss) · công khai",
    "github": "GitHub API · siêu dữ liệu công khai",
}


def gon(s):
    return re.sub(r"[ \t]+", " ", (s or "").replace("\r", "")).strip()


def dung(row):
    idr, typ, src, name, url, desc, one, cat, sub, region, tags, year = row
    if (desc or "").lstrip().startswith("**"):
        return None  # đã chuẩn hoá rồi
    nhan, dinh_nghia = NHAN.get(typ, ("Bản ghi", "một mục dữ liệu"))
    name = gon(name)
    dong = ["**%s** — %s%s." % (name, dinh_nghia, (" thuộc nhóm " + gon(sub).lower()) if sub else ""), ""]
    y = []
    if cat:
        y.append("- **Lĩnh vực:** %s" % gon(cat))
    if sub and gon(sub) != gon(cat):
        y.append("- **Phân nhóm:** %s" % gon(sub))
    if region:
        y.append("- **Khu vực:** %s" % gon(region))
    if year:
        y.append("- **Năm:** %s" % year)
    if url:
        y.append("- **Liên kết gốc:** %s" % gon(url))
    gp = GIAY_PHEP.get(src)
    y.append("- **Nguồn dữ liệu:** %s" % (gp or gon(src)))
    if tags:
        t = ", ".join([x.strip() for x in gon(tags).split(",") if x.strip()][:8])
        if t:
            y.append("- **Từ khoá:** %s" % t)
    dong += y
    goc = gon(desc)
    if goc:
        # bỏ phần lặp lại tên ở đầu mô tả gốc cho đỡ thừa
        goc = re.sub(r"^%s\s*[—-]\s*" % re.escape(name), "", goc)
        dong += ["", goc if goc.endswith((".", "!", "?")) else goc + "."]
    return "\n".join(dong)


def main():
    con = sqlite3.connect(DB, timeout=600)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    dk = ""
    ts = []
    if CHI_LOAI:
        dk = "WHERE type IN (%s)" % ",".join("?" * len(CHI_LOAI))
        ts = list(CHI_LOAI)
    tong = con.execute("SELECT count(*) FROM items %s" % dk, ts).fetchone()[0]
    print("cần rà: %s bản ghi" % format(tong, ",d").replace(",", "."), flush=True)
    doi, dem, cuoi = 0, 0, 0
    while True:
        rows = con.execute(
            "SELECT id,type,source,name,url,description,oneliner,category,subcategory,region,tags,year "
            "FROM items %s %s id>? ORDER BY id LIMIT ?" % (dk, "AND" if dk else "WHERE"),
            ts + [cuoi, LO]).fetchall()
        if not rows:
            break
        cap = []
        for r in rows:
            m = dung(r)
            if m:
                cap.append((m, r[0]))
        if cap:
            con.executemany("UPDATE items SET description=? WHERE id=?", cap)
            con.commit()
            doi += len(cap)
        dem += len(rows)
        cuoi = rows[-1][0]
        print("  đã rà %s · viết lại %s" % (format(dem, ",d").replace(",", "."),
                                            format(doi, ",d").replace(",", ".")), flush=True)
    print("XONG: chuẩn hoá %s mô tả sang Markdown" % format(doi, ",d").replace(",", "."), flush=True)
    con.close()


if __name__ == "__main__":
    main()
