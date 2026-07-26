# -*- coding: utf-8 -*-
"""Đúc vấn đề · giải pháp · mô hình KD từ CƠ SỞ KINH DOANH VIỆT NAM có thật.

Vì sao cần bộ đúc thứ hai: bộ đúc từ dự án World Bank (duc_tu_du_an.py) cho ra dữ liệu có
số tiền và bề dày nhiều năm, nhưng nó kéo cả kho lệch sang chuyện tài chính công và viện
trợ phát triển. Hệ quả đo được: máy sinh ý tưởng đẻ ra "trợ lý tài chính cho người
Argentina", "nền tảng duy trì dịch vụ công trong khủng hoảng" — không dùng được cho một
Solo CEO Việt Nam, và cổng kiểm chứng ở sandbox đánh trượt gần hết vì kho không có căn cứ
nào thuộc thị trường Việt.

Nguồn ở đây ngược lại hoàn toàn: 44.000+ cơ sở kinh doanh thật tại Việt Nam (OSM/Trang
Vàng) cộng số liệu kinh tế Việt Nam từ World Bank. Một cụm = một (phân ngành × địa bàn).
Cụm cho ba thứ mà bộ đúc kia không có:

  - quy mô thị trường CÓ THẬT ĐẾM ĐƯỢC: bao nhiêu cơ sở, ở đâu — đây là TAM, không phải ước đoán
  - khách hàng cụ thể: tên cơ sở thật, có thể gọi điện bán hàng ngay
  - quy mô đúng tầm một người: cụm vài trăm cơ sở là thị trường vừa sức Solo CEO, khác hẳn
    một dự án 500 triệu USD

Nguyên tắc giữ nguyên: đúc lại từ dữ liệu thật, không sáng tác. Số cơ sở đưa vào prompt là
số đếm thật; mô hình không được phép bịa thêm con số nào khác.
"""
import json
import os
import re
import sqlite3
import time
import urllib.request
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
LLM_BASE = os.environ.get("LLM_BASE_URL", "https://llm.soloceo.vn/v1")
LLM_KEY = os.environ.get("LLM_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL_NAME", "soloceo-smart")
SO_VONG = int(os.environ.get("SO_VONG", "8"))
TOI_THIEU = int(os.environ.get("TOI_THIEU", "40"))   # cụm nhỏ hơn thì chưa đủ làm thị trường


def llm(prompt, max_tokens=4500):
    body = json.dumps({
        "model": LLM_MODEL, "max_tokens": max_tokens, "temperature": 0.35,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    rq = urllib.request.Request(
        LLM_BASE + "/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + LLM_KEY})
    with urllib.request.urlopen(rq, timeout=240) as r:
        return json.loads(r.read().decode())["choices"][0]["message"]["content"]


def json_tu(t):
    """Vá JSON bị cắt cuối thay vì bỏ cả lượt đúc (xem duc_tu_du_an.py — cùng lý do)."""
    i = t.find("{")
    if i < 0:
        raise ValueError("không thấy JSON")
    t = t[i:]
    try:
        return json.loads(t[:t.rfind("}") + 1])
    except Exception:
        pass
    for cat in range(len(t) - 1, max(len(t) - 2500, 0), -1):
        if t[cat] not in '",}]':
            continue
        for dong in ('"}}', '"}}}', '}}', '}}}', '}'):
            try:
                return json.loads(t[:cat + 1] + dong)
            except Exception:
                continue
    raise ValueError("JSON hỏng, không vá được")


def chon_cum(con):
    """Một cụm (phân ngành × địa bàn) chưa đúc, đủ lớn để thành thị trường."""
    return con.execute("""
        SELECT subcategory, region, count(*) n
        FROM items
        WHERE type='co-so-kinh-doanh' AND subcategory<>'' AND region<>''
        GROUP BY subcategory, region
        HAVING n >= ?
           AND (subcategory || ' @ ' || region) NOT IN
               (SELECT COALESCE(vi_du,'') FROM solutions WHERE can_cu LIKE 'Cụm VN%')
        ORDER BY n DESC, RANDOM() LIMIT 1""", (TOI_THIEU,)).fetchone()


def so_lieu_vn(con):
    """Vài chỉ số kinh tế Việt Nam mới nhất — để mô hình neo quy mô thị trường vào số thật."""
    rows = con.execute("""
        SELECT name FROM items
        WHERE type='so-lieu-kinh-te' AND region LIKE '%Việt%'
          AND (name LIKE '%GDP%' OR name LIKE '%Households%' OR name LIKE '%Internet%'
               OR name LIKE '%mobile%' OR name LIKE '%consumption%' OR name LIKE '%Urban%')
        ORDER BY year DESC LIMIT 10""").fetchall()
    return [r[0] for r in rows]


PROMPT = """Bạn đúc dữ liệu chuẩn cho SoloCEO — hệ điều hành cho doanh nghiệp một người ở Việt Nam.

THỊ TRƯỜNG CÓ THẬT (đếm được từ dữ liệu, KHÔNG phải ước đoán):
- Phân ngành: {nganh}
- Địa bàn: {dia_ban}
- Số cơ sở kinh doanh thật đã ghi nhận trong cụm này: {so_luong}
- Một số cơ sở cụ thể: {vi_du}

SỐ LIỆU KINH TẾ VIỆT NAM (World Bank, dùng để neo quy mô):
{so_lieu}

Đúc BA thứ cho một Solo CEO Việt Nam muốn phục vụ chính {so_luong} cơ sở này.

RÀNG BUỘC BẮT BUỘC:
- Quy mô phải VỪA MỘT NGƯỜI + AI: vốn khởi động dưới 50 triệu đồng, dựng được MVP trong
  vài ngày, vận hành không cần thuê nhân viên. KHÔNG đề xuất nền tảng quốc gia, không đề
  xuất thứ cần giấy phép ngân hàng hay đầu tư hàng tỷ.
- Con số duy nhất được dùng là {so_luong} và số liệu kinh tế nêu trên. Không bịa số khác;
  cần ước tính thì nói rõ "ước tính" và nêu cách suy ra.
- Khách hàng là các cơ sở thật ở trên — nêu rõ tiếp cận họ bằng cách nào (đi bộ tới tận nơi,
  Zalo, hội nhóm Facebook ngành, môi giới...). Viết như người đã đi bán hàng, không sáo rỗng.
- Giá bán phải hợp túi tiền hộ kinh doanh Việt Nam (thường 200k–2tr/tháng).

Trả về DUY NHẤT JSON:
{{"van_de":{{"tieu_de":"","mo_ta":"","khach_hang":"","do_dau":7,"goc_re":"","boi_canh":"Khi... muốn... để..."}},
"giai_phap":{{"ten":"","mo_ta":"","nguyen_ly":"","ap_dung":"","tai_chinh":"","cong_nghe":"","marketing":""}},
"mo_hinh":{{"ten":"","mo_ta":"","cach_kiem_tien":"","phan_khuc":"","kenh":"","chi_phi_chinh":"","bai_hoc":"","tai_chinh":"","cong_nghe":"","marketing":""}}}}"""


def duc_mot(con, now, so_lieu):
    cum = chon_cum(con)
    if not cum:
        return None
    nganh, dia_ban, n = cum
    ten_cs = [r[0] for r in con.execute("""
        SELECT name FROM items WHERE type='co-so-kinh-doanh' AND subcategory=? AND region=?
        ORDER BY RANDOM() LIMIT 8""", (nganh, dia_ban))]

    t = llm(PROMPT.format(nganh=nganh, dia_ban=dia_ban, so_luong=n,
                          vi_du=", ".join(ten_cs)[:400],
                          so_lieu="\n".join("- " + s for s in so_lieu) or "- (kho chưa có)"))
    d = json_tu(t)
    v, g, mh = d.get("van_de") or {}, d.get("giai_phap") or {}, d.get("mo_hinh") or {}
    cc = "Cụm VN — %d cơ sở %s tại %s (nguồn: cơ sở kinh doanh thật trong kho)" % (n, nganh, dia_ban)
    khoa = "%s @ %s" % (nganh, dia_ban)     # khoá chống đúc trùng cụm
    quy_mo = "thị trường đếm được: %d cơ sở" % n

    con.execute("""INSERT INTO problems(tieu_de,mo_ta,khach_hang,nganh,do_dau,can_cu,trang_thai,
                   created_at,boi_canh,goc_re,quy_mo_von,quoc_gia_da_lam)
                   VALUES(?,?,?,?,?,?,'moi',?,?,?,?,?)""",
                (v.get("tieu_de", "")[:300], v.get("mo_ta", ""), v.get("khach_hang", ""), nganh,
                 int(v.get("do_dau") or 5), cc, now, v.get("boi_canh", ""), v.get("goc_re", ""),
                 quy_mo, "Việt Nam"))

    con.execute("""INSERT INTO solutions(ten,mo_ta,nguyen_ly,vi_du,ap_dung,nganh,can_cu,created_at,
                   nguon_id,tai_chinh,cong_nghe,marketing,quy_mo_von,quoc_gia_da_lam)
                   VALUES(?,?,?,?,?,?,?,?,NULL,?,?,?,?,?)""",
                (g.get("ten", "")[:300], g.get("mo_ta", ""), g.get("nguyen_ly", ""), khoa,
                 g.get("ap_dung", ""), nganh, cc, now,
                 g.get("tai_chinh", ""), g.get("cong_nghe", ""), g.get("marketing", ""),
                 quy_mo, "Việt Nam"))

    con.execute("""INSERT INTO biz_models(ten,cong_ty,nguon_id,mo_ta,cach_kiem_tien,phan_khuc,kenh,
                   chi_phi_chinh,bai_hoc,nganh,created_at,tai_chinh,cong_nghe,marketing)
                   VALUES(?,?,NULL,?,?,?,?,?,?,?,?,?,?,?)""",
                (mh.get("ten", "")[:300], khoa[:200], mh.get("mo_ta", ""),
                 mh.get("cach_kiem_tien", ""), mh.get("phan_khuc", ""), mh.get("kenh", ""),
                 mh.get("chi_phi_chinh", ""), mh.get("bai_hoc", ""), nganh, now,
                 mh.get("tai_chinh", ""), mh.get("cong_nghe", ""), mh.get("marketing", "")))
    con.commit()
    return {"cum": khoa, "n": n, "van_de": v.get("tieu_de", "")[:64],
            "mo_hinh": mh.get("ten", "")[:64]}


def main():
    if not LLM_KEY:
        raise SystemExit("Thiếu LLM_API_KEY")
    con = sqlite3.connect(DB, timeout=900)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=900000")
    so_lieu = so_lieu_vn(con)

    dat = loi = 0
    for i in range(SO_VONG):
        now = datetime.now(timezone.utc).isoformat()
        try:
            r = duc_mot(con, now, so_lieu)
            if not r:
                print("  hết cụm chưa đúc", flush=True)
                break
            dat += 1
            print("  [%d/%d] %s — %d cơ sở\n        vấn đề: %s\n        mô hình: %s"
                  % (i + 1, SO_VONG, r["cum"], r["n"], r["van_de"], r["mo_hinh"]), flush=True)
        except Exception as e:
            loi += 1
            print("  [%d/%d] lỗi: %s" % (i + 1, SO_VONG, str(e)[:90]), flush=True)
        time.sleep(2)

    for b in ("problems", "solutions", "biz_models"):
        print("  %-12s %d mục" % (b, con.execute("SELECT count(*) FROM %s" % b).fetchone()[0]), flush=True)
    print("XONG: đúc %d bộ từ cụm Việt Nam, lỗi %d" % (dat, loi), flush=True)
    con.close()


if __name__ == "__main__":
    main()
