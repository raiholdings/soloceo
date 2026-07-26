# -*- coding: utf-8 -*-
"""Đúc vấn đề · giải pháp · mô hình kinh doanh TỪ dự án phát triển có thật.

Vì sao cần: kho đúc cũ chỉ có 16 vấn đề, 46 giải pháp, 42 mô hình — quá mỏng nên cổng
kiểm chứng ở sandbox đánh trượt gần như mọi ý tưởng vì không tìm được căn cứ. Mà cổng
chặn tất cả thì vô dụng ngang cổng cho qua tất cả.

Nguồn đúc: ~28.000 dự án World Bank có thật, ở 194 quốc gia, giai đoạn 1996-2027, **có số
tiền cụ thể**. Ba chiều mà kho cũ thiếu — tài chính, công nghệ, marketing — nay rút được
từ chính dữ liệu dự án chứ không phải bịa:

  - tài chính  ← quy mô vốn thật của dự án, cơ cấu nguồn (vay/viện trợ), thời gian hoàn vốn
  - công nghệ  ← ngành và chủ đề của dự án, hạ tầng nó phải dựng
  - marketing  ← ai là người thụ hưởng, tiếp cận họ qua kênh nào

Nguyên tắc bất biến giữ nguyên: **đúc lại, không sáng tác**. Mỗi mục đều lưu `nguon_id`
trỏ về đúng dự án gốc; không có dự án thì không có mục.
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
SO_VONG = int(os.environ.get("SO_VONG", "10"))     # mỗi vòng đúc 1 bộ từ 1 dự án
NGANH_UU_TIEN = os.environ.get("NGANH_UU_TIEN", "")  # lọc ngành, để trống = mọi ngành


def llm(prompt, max_tokens=4500):
    body = json.dumps({
        "model": LLM_MODEL, "max_tokens": max_tokens, "temperature": 0.3,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    rq = urllib.request.Request(
        LLM_BASE + "/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + LLM_KEY})
    with urllib.request.urlopen(rq, timeout=240) as r:
        return json.loads(r.read().decode())["choices"][0]["message"]["content"]


def json_tu(t):
    """Mô hình thỉnh thoảng trả JSON bị cắt cuối. Thử vá bằng cách đóng dần
    các ngoặc còn thiếu thay vì bỏ cả lượt đúc."""
    i = t.find("{")
    if i < 0:
        raise ValueError("không thấy JSON")
    t = t[i:]
    try:
        return json.loads(t[:t.rfind("}") + 1])
    except Exception:
        pass
    # vá: cắt tới dấu phẩy cuối cùng ở mức hợp lệ rồi đóng ngoặc
    for cat in range(len(t) - 1, max(len(t) - 2500, 0), -1):
        if t[cat] not in '",}]':
            continue
        for dong in ('"}}', '"}}}', '}}', '}}}', '}'):
            try:
                return json.loads(t[:cat + 1] + dong)
            except Exception:
                continue
    raise ValueError("JSON hỏng, không vá được")


def bo_sung_cot(con):
    """Ba chiều mới. Thêm cột thay vì tạo bảng riêng để mọi API sẵn có tự trả kèm."""
    for bang, cot in [
        ("solutions", ["tai_chinh", "cong_nghe", "marketing", "quy_mo_von", "quoc_gia_da_lam"]),
        ("biz_models", ["tai_chinh", "cong_nghe", "marketing"]),
        ("problems", ["quy_mo_von", "quoc_gia_da_lam"]),
    ]:
        co = {r[1] for r in con.execute("PRAGMA table_info(%s)" % bang)}
        for c in cot:
            if c not in co:
                con.execute("ALTER TABLE %s ADD COLUMN %s TEXT" % (bang, c))
    con.commit()


def chon_du_an(con):
    """Một dự án THẬT chưa được đúc. Ưu tiên dự án lớn (vốn nhiều = bài học đắt giá)."""
    dk = "AND category LIKE ?" if NGANH_UU_TIEN else ""
    ts = ["%" + NGANH_UU_TIEN + "%"] if NGANH_UU_TIEN else []
    return con.execute("""
        SELECT id,name,description,category,region,year,score,url
        FROM items
        WHERE type='du-an-phat-trien'
          AND id NOT IN (SELECT COALESCE(nguon_id,-1) FROM solutions)
          AND length(description) > 600
          %s
        ORDER BY score DESC, RANDOM() LIMIT 1""" % dk, ts).fetchone()


PROMPT = """Bạn đúc dữ liệu chuẩn cho hệ điều hành khởi nghiệp SoloCEO, dành cho người
Việt Nam làm doanh nghiệp một người.

DỰ ÁN CÓ THẬT (nguồn World Bank, đây là DUY NHẤT nguồn bạn được dùng):
Tên: {ten}
Quốc gia: {quoc_gia} · Ngành: {nganh} · Năm duyệt: {nam}
Hồ sơ:
{mo_ta}

Từ dự án này, đúc ra BA thứ. Yêu cầu chung: viết tiếng Việt tự nhiên, cụ thể, không sáo rỗng.
Mọi con số phải lấy TỪ hồ sơ trên; không có thì ghi "hồ sơ không nêu" chứ KHÔNG được bịa.

1. VẤN ĐỀ mà dự án này sinh ra để giải — nêu theo góc nhìn thị trường, không phải góc nhìn
   nhà tài trợ. Kèm: ai chịu vấn đề, đau đến mức nào (1-10), vì sao tồn tại (gốc rễ).

2. GIẢI PHÁP mà dự án đã dùng, chuẩn hoá thành mẫu áp dụng lại được. Bắt buộc có ba chiều:
   - tai_chinh: cần bao nhiêu tiền, cơ cấu vốn, bao lâu hoàn vốn (suy từ quy mô và thời gian dự án)
   - cong_nghe: hạ tầng/công nghệ phải có, một người + AI có làm nổi phần nào
   - marketing: ai là người dùng cuối, tiếp cận họ qua kênh nào

3. MÔ HÌNH KINH DOANH: nếu một Solo CEO Việt Nam làm phiên bản thu nhỏ của dự án này thì
   kiếm tiền bằng cách nào. Cũng phải có ba chiều tai_chinh / cong_nghe / marketing.

Trả về DUY NHẤT JSON:
{{"van_de":{{"tieu_de":"","mo_ta":"","khach_hang":"","do_dau":7,"goc_re":"","boi_canh":"Khi... muốn... để..."}},
"giai_phap":{{"ten":"","mo_ta":"","nguyen_ly":"","ap_dung":"","tai_chinh":"","cong_nghe":"","marketing":""}},
"mo_hinh":{{"ten":"","mo_ta":"","cach_kiem_tien":"","phan_khuc":"","kenh":"","chi_phi_chinh":"","bai_hoc":"","tai_chinh":"","cong_nghe":"","marketing":""}}}}"""


def duc_mot(con, now):
    da = chon_du_an(con)
    if not da:
        return None
    _id, ten, mo_ta, nganh, quoc_gia, nam, diem, url = da
    von = "hồ sơ không nêu"
    m = re.search(r"\*\*Quy mô vốn:\*\* ([^\n]+)", mo_ta or "")
    if m:
        von = m.group(1).strip()

    t = llm(PROMPT.format(ten=ten, quoc_gia=quoc_gia, nganh=nganh, nam=nam or "?",
                          mo_ta=(mo_ta or "")[:2600]))
    d = json_tu(t)
    v, g, mh = d.get("van_de") or {}, d.get("giai_phap") or {}, d.get("mo_hinh") or {}
    cc = "Dự án #%d — %s (%s, %s)" % (_id, ten[:70], quoc_gia, nam or "?")

    con.execute("""INSERT INTO problems(tieu_de,mo_ta,khach_hang,nganh,do_dau,can_cu,trang_thai,
                   created_at,boi_canh,goc_re,quy_mo_von,quoc_gia_da_lam)
                   VALUES(?,?,?,?,?,?,'moi',?,?,?,?,?)""",
                (v.get("tieu_de", "")[:300], v.get("mo_ta", ""), v.get("khach_hang", ""), nganh,
                 int(v.get("do_dau") or 5), cc, now, v.get("boi_canh", ""), v.get("goc_re", ""),
                 von, quoc_gia))

    con.execute("""INSERT INTO solutions(ten,mo_ta,nguyen_ly,vi_du,ap_dung,nganh,can_cu,created_at,
                   nguon_id,tai_chinh,cong_nghe,marketing,quy_mo_von,quoc_gia_da_lam)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (g.get("ten", "")[:300], g.get("mo_ta", ""), g.get("nguyen_ly", ""), ten[:300],
                 g.get("ap_dung", ""), nganh, cc, now, _id,
                 g.get("tai_chinh", ""), g.get("cong_nghe", ""), g.get("marketing", ""),
                 von, quoc_gia))

    con.execute("""INSERT INTO biz_models(ten,cong_ty,nguon_id,mo_ta,cach_kiem_tien,phan_khuc,kenh,
                   chi_phi_chinh,bai_hoc,nganh,created_at,tai_chinh,cong_nghe,marketing)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (mh.get("ten", "")[:300], ten[:200], _id, mh.get("mo_ta", ""),
                 mh.get("cach_kiem_tien", ""), mh.get("phan_khuc", ""), mh.get("kenh", ""),
                 mh.get("chi_phi_chinh", ""), mh.get("bai_hoc", ""), nganh, now,
                 mh.get("tai_chinh", ""), mh.get("cong_nghe", ""), mh.get("marketing", "")))
    con.commit()
    return {"du_an": ten[:60], "quoc_gia": quoc_gia, "von": von,
            "van_de": v.get("tieu_de", "")[:60], "giai_phap": g.get("ten", "")[:60]}


def main():
    if not LLM_KEY:
        raise SystemExit("Thiếu LLM_API_KEY")
    con = sqlite3.connect(DB, timeout=900)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=900000")
    bo_sung_cot(con)

    dat = loi = 0
    for i in range(SO_VONG):
        now = datetime.now(timezone.utc).isoformat()
        try:
            r = duc_mot(con, now)
            if not r:
                print("  hết dự án chưa đúc", flush=True)
                break
            dat += 1
            print("  [%d/%d] %s (%s · %s)\n        vấn đề: %s\n        giải pháp: %s"
                  % (i + 1, SO_VONG, r["du_an"], r["quoc_gia"], r["von"], r["van_de"], r["giai_phap"]),
                  flush=True)
        except Exception as e:
            loi += 1
            print("  [%d/%d] lỗi: %s" % (i + 1, SO_VONG, str(e)[:90]), flush=True)
        time.sleep(2)

    for b in ("problems", "solutions", "biz_models"):
        print("  %-12s %d mục" % (b, con.execute("SELECT count(*) FROM %s" % b).fetchone()[0]), flush=True)
    print("XONG: đúc %d bộ, lỗi %d" % (dat, loi), flush=True)
    con.close()


if __name__ == "__main__":
    main()
