# -*- coding: utf-8 -*-
"""Nhập một tệp HTML có sẵn vào kho Báo cáo.

Dùng: ADMIN_TOKEN=... python3 nhap-bao-cao.py <tệp.html> [--dang]

Báo cáo bên ngoài thường là một trang HTML đầy đủ (<html><head><style>…). Kho chỉ cần
PHẦN THÂN cộng CSS của nó — nhét cả <html> lồng trong trang khác thì trình duyệt tự sửa
lỗi theo cách khó lường và bố cục vỡ. Script này bóc <style> và <body> ra rồi gói lại
trong một <article> có tiền tố lớp riêng.

Ảnh đại diện: dựng SVG cùng phong cách với báo cáo do Đội AI sinh, để danh sách nhìn đều.
"""
import base64
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request

API = os.environ.get("API_CORE_URL", "https://api.soloceo.vn")
TOKEN = os.environ.get("ADMIN_TOKEN") or sys.exit("Thiếu ADMIN_TOKEN")


def slugify(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")[:88]


def anh_bia(tieu_de, nhan, ngay):
    """Cùng thuật toán với bao-cao.mau.ts — giữ hai bên trông như một."""
    h = 0
    for c in tieu_de:
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    cot = [18 + (((h >> (i % 24)) ^ (i * 2654435761)) & 0xFFFFFFFF) % 150 for i in range(26)]
    chu = tieu_de if len(tieu_de) <= 58 else tieu_de[:56] + "…"
    e = lambda t: (t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    thanh = "".join(
        '<rect x="%d" y="%d" width="22" height="%d" rx="3" fill="%s" opacity="%.3f"/>'
        % (40 + i * 44, 470 - c, c, "#e3b341" if i % 5 == 0 else "#3fb950", 0.16 + (i % 7) * 0.045)
        for i, c in enumerate(cot))
    cx = 52 if len(chu) > 40 else 62
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="#0b0b0c"/><stop offset="1" stop-color="#14161a"/></linearGradient></defs>'
        '<rect width="1200" height="630" fill="url(#g)"/>'
        '<g opacity="0.5">%s</g><rect x="0" y="0" width="1200" height="6" fill="#3fb950"/>'
        '<text x="64" y="120" font-family="ui-monospace,Menlo,monospace" font-size="19" '
        'letter-spacing="4" fill="#e3b341">%s</text>'
        '<text x="64" y="228" font-family="system-ui,sans-serif" font-size="%d" font-weight="700" fill="#f5f5f6">%s</text>'
        '<text x="64" y="300" font-family="system-ui,sans-serif" font-size="%d" font-weight="700" fill="#f5f5f6">%s</text>'
        '<text x="64" y="556" font-family="ui-monospace,Menlo,monospace" font-size="21" fill="#8b8b92">'
        'soloceo.vn · %s</text></svg>'
        % (thanh, e(nhan.upper()), cx, e(chu[:34]), cx, e(chu[34:]), e(ngay)))
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


def boc(html):
    """Bóc <style> và <body>, đổi tên lớp gốc để không đụng CSS của trang chứa."""
    styles = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S))
    m = re.search(r"<body[^>]*>(.*?)</body>", html, re.S)
    than = m.group(1) if m else html
    # Bỏ link font ngoài: trang chứa đã có font riêng, và tải font ngoài làm chậm + lộ referer.
    than = re.sub(r"<link[^>]+fonts\.(googleapis|gstatic)[^>]*>", "", than)
    styles = re.sub(r"@import[^;]+;", "", styles)
    # Giới hạn mọi luật CSS vào trong .bc-nhap để không rò ra toàn trang.
    return '<article class="bc-nhap"><style>\n%s\n</style>\n%s\n</article>' % (
        re.sub(r"(^|\})\s*([^@{}]+)\{", lambda x: "%s .bc-nhap %s{" % (x.group(1), x.group(2).strip()), styles),
        than)


def main():
    if len(sys.argv) < 2:
        sys.exit("Dùng: nhap-bao-cao.py <tệp.html> [--dang]")
    tep = sys.argv[1]
    dang = "--dang" in sys.argv
    raw = io.open(tep, encoding="utf-8", errors="replace").read()

    m = re.search(r"<title>(.*?)</title>", raw, re.S)
    tieu_de = re.sub(r"\s+", " ", m.group(1)).strip() if m else os.path.basename(tep)
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', raw)
    tom_tat = m.group(1).strip() if m else ""
    if not tom_tat:
        # Không có mô tả thì lấy đoạn văn đầu tiên đủ dài làm tóm tắt.
        for p in re.findall(r"<p[^>]*>(.*?)</p>", raw, re.S):
            t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", p)).strip()
            if len(t) > 80:
                tom_tat = t[:400]
                break

    body = json.dumps({
        "title": tieu_de,
        "slug": slugify(tieu_de),
        "summary": tom_tat,
        "html": boc(raw),
        "coverUrl": anh_bia(tieu_de, "Báo cáo chuyên đề", "2026"),
        "category": "thi-truong",
        "sources": {"nhap_tu": os.path.basename(tep)},
        "publish": dang,
    }).encode()

    rq = urllib.request.Request(API + "/v1/admin/eco/bao-cao/nhap", data=body,
                                headers={"Content-Type": "application/json", "X-Admin-Token": TOKEN})
    with urllib.request.urlopen(rq, timeout=90) as r:
        d = json.loads(r.read().decode())
    print("  ✓ %s" % tieu_de)
    print("    slug: %s · trạng thái: %s" % (d.get("slug"), d.get("status")))
    print("    https://soloceo.vn/bao-cao/%s" % d.get("slug"))


if __name__ == "__main__":
    main()
