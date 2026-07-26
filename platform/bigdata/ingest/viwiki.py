# -*- coding: utf-8 -*-
"""Nạp tri thức tiếng Việt từ bản kết xuất Wikipedia tiếng Việt.

Nguồn: https://dumps.wikimedia.org/viwiki/latest/viwiki-latest-pages-articles.xml.bz2
Giấy phép: CC BY-SA 4.0 — ghi nhận "Wikipedia tiếng Việt".

Đọc theo luồng (không giải nén ra đĩa), mỗi bài lấy tiêu đề + đoạn mở đầu + thể loại.
Bỏ trang đổi hướng và các không gian tên phụ (chỉ giữ bài viết chính, ns0).
"""
import bz2
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
SRC = os.environ.get("VIWIKI", "/work/viwiki.xml.bz2")
GIOI_HAN = int(os.environ.get("GIOI_HAN", "0"))  # 0 = không giới hạn
BATCH = 4000

RE_COMMENT = re.compile(r"<!--.*?-->", re.S)
RE_REF = re.compile(r"<ref[^>]*?/>|<ref.*?</ref>", re.S | re.I)
RE_TAG = re.compile(r"<[^>]+>")
RE_FILE = re.compile(r"\[\[(?:Tập tin|Hình|File|Image|Tệp)\s*:.*?\]\]", re.S | re.I)
RE_CAT = re.compile(r"\[\[\s*(?:Thể loại|Category)\s*:\s*([^\]|]+)", re.I)
RE_LINK = re.compile(r"\[\[([^\]|]+)\|([^\]]+)\]\]")
RE_LINK2 = re.compile(r"\[\[([^\]]+)\]\]")
RE_BOLD = re.compile(r"'{2,5}")
RE_WS = re.compile(r"[ \t]+")


def bo_khuon(s):
    """Bỏ {{khuôn mẫu}} và {|bảng|} lồng nhau."""
    out, sau, i, n = [], 0, 0, len(s)
    do_sau = 0
    while i < n:
        if s.startswith("{{", i) or s.startswith("{|", i):
            if do_sau == 0:
                out.append(s[sau:i])
            do_sau += 1
            i += 2
        elif (s.startswith("}}", i) or s.startswith("|}", i)) and do_sau:
            do_sau -= 1
            i += 2
            if do_sau == 0:
                sau = i
        else:
            i += 1
    if do_sau == 0:
        out.append(s[sau:])
    return "".join(out)


def doan_mo_dau(wiki):
    t = RE_COMMENT.sub(" ", wiki)
    t = RE_REF.sub(" ", t)
    t = RE_FILE.sub(" ", t)
    t = bo_khuon(t)
    t = RE_TAG.sub(" ", t)
    t = RE_LINK.sub(r"\2", t)
    t = RE_LINK2.sub(r"\1", t)
    t = RE_BOLD.sub("", t)
    for dong in t.split("\n"):
        d = RE_WS.sub(" ", dong).strip()
        if len(d) < 40 or d.startswith(("|", "!", "*", "#", ":", ";", "=")):
            continue
        return d[:600]
    return ""


def the_loai(wiki):
    return [c.strip() for c in RE_CAT.findall(wiki)[:6] if c.strip()]


# ── Bộ lọc liên quan ────────────────────────────────────────────────────────
# Wikipedia tiếng Việt có hàng trăm nghìn bài do bot sinh (tiểu hành tinh, loài
# côn trùng, xã bên Pháp/Tây Ban Nha). Nạp hết chỉ làm phình con số mà không
# thêm giá trị nào cho một hệ điều hành kinh doanh — nên loại thẳng.
LOAI_BO = re.compile(
    r"tiểu hành tinh|thiên thể|chòm sao|ngôi sao |thiên hà"
    r"|^chi |^họ |^bộ |^phân họ |^tông |loài |động vật|thực vật|côn trùng|bò sát|lưỡng cư"
    r"|nhện|bọ |ruồi|muỗi|ong |bướm|kiến |cá |chim |nấm |tảo |rêu |dương xỉ|phong lan"
    r"|hymenoptera|coleoptera|lepidoptera|diptera|trichoptera|arachnida|mollusca"
    r"|xã của |xã ở |khu tự quản|đô thị của |đô thị ở |công xã |quận của "
    r"|danh sách nhân vật|nhân vật hư cấu|tập phim|đĩa đơn|album ", re.I)

# Giữ lại: bất cứ thứ gì gắn với Việt Nam, hoặc thuộc miền tri thức mà một
# Solo CEO thực sự dùng (kinh doanh · công nghệ · pháp lý · xã hội · kỹ năng).
GIU_LAI = re.compile(
    r"việt nam|hà nội|hồ chí minh|đà nẵng|hải phòng|cần thơ|huế|nha trang|đà lạt"
    r"|kinh tế|kinh doanh|doanh nghiệp|công ty|tập đoàn|thương hiệu|khởi nghiệp"
    r"|tài chính|ngân hàng|chứng khoán|đầu tư|bảo hiểm|kế toán|thuế|tiền tệ"
    r"|thương mại|xuất khẩu|nhập khẩu|bán lẻ|tiếp thị|marketing|quảng cáo|thương mại điện tử"
    r"|quản trị|quản lý|nhân sự|lãnh đạo|chiến lược|năng suất"
    r"|công nghệ|phần mềm|máy tính|internet|trí tuệ nhân tạo|dữ liệu|mật mã|viễn thông|điện tử"
    r"|luật|pháp luật|hiến pháp|hợp đồng|sở hữu trí tuệ|toà án"
    r"|giáo dục|đào tạo|đại học|y tế|sức khỏe|dược|bệnh"
    r"|nông nghiệp|thủy sản|lâm nghiệp|thực phẩm|ẩm thực"
    r"|du lịch|khách sạn|vận tải|logistics|hàng không|cảng "
    r"|năng lượng|điện lực|dầu khí|xây dựng|bất động sản|kiến trúc|vật liệu"
    r"|truyền thông|báo chí|xuất bản|điện ảnh|âm nhạc|thể thao"
    r"|xã hội|dân số|lao động|môi trường|khí hậu|đô thị hóa"
    r"|kỹ thuật|khoa học|toán học|thống kê|vật lý|hóa học|sinh học phân tử", re.I)


def dang_quan_tam(ten, mo, cats):
    """Bài có đáng đưa vào bộ não thứ 2 không?"""
    kho = (ten + " " + mo + " " + " ".join(cats)).lower()
    if "việt nam" in kho:          # ưu tiên tuyệt đối cho Việt Nam
        return True
    if LOAI_BO.search(kho):
        return False
    return bool(GIU_LAI.search(kho))


SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?, NULL,'','','',NULL,'',0,'',0,'',?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,url=excluded.url,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,tags=excluded.tags,
 updated_at=excluded.updated_at"""


def main():
    con = sqlite3.connect(DB, timeout=180)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    now = datetime.now(timezone.utc).isoformat()

    ns = "{http://www.mediawiki.org/xml/export-0.11/}"
    buf, total, doc = [], 0, 0
    fh = bz2.open(SRC, "rb")
    for _, el in ET.iterparse(fh, events=("end",)):
        if not el.tag.endswith("}page"):
            continue
        doc += 1
        try:
            if (el.findtext(ns + "ns") or "") != "0" or el.find(ns + "redirect") is not None:
                continue
            title = (el.findtext(ns + "title") or "").strip()
            rev = el.find(ns + "revision")
            wiki = (rev.findtext(ns + "text") if rev is not None else "") or ""
            if not title or len(wiki) < 200:
                continue
            mo = doan_mo_dau(wiki)
            if len(mo) < 40:
                continue
            cats = the_loai(wiki)
            if not dang_quan_tam(title, mo, cats):
                continue
            buf.append((
                "tri-thuc-vi", "wikipedia-vi", "viwiki-" + title, title,
                "https://vi.wikipedia.org/wiki/" + title.replace(" ", "_"),
                mo, mo[:200], cats[0] if cats else "Tri thức tổng hợp",
                cats[1] if len(cats) > 1 else "", "Việt Nam",
                ", ".join(cats)[:400], now,
            ))
        finally:
            el.clear()
        if len(buf) >= BATCH:
            con.executemany(SQL, buf)
            con.commit()
            total += len(buf)
            buf = []
            print("  đã ghi %d / đã đọc %d trang" % (total, doc), flush=True)
            if GIOI_HAN and total >= GIOI_HAN:
                break
    if buf:
        con.executemany(SQL, buf)
        con.commit()
        total += len(buf)
    print("XONG Wikipedia tiếng Việt: %d bài (đọc %d trang)" % (total, doc), flush=True)
    con.close()


if __name__ == "__main__":
    sys.exit(main())
