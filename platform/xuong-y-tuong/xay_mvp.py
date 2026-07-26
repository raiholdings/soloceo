# -*- coding: utf-8 -*-
"""Subagent dựng MVP thật từ ý tưởng đã qua kiểm chứng.

Đây là khâu 3 của dây chuyền: bigdata (đúc ý tưởng) → xưởng (kiểm chứng → **dựng MVP** →
nghiệm thu) → marketplace. Không có khâu này thì sàn lại đầy mô tả không chạy được.

CÁCH LÀM: mô hình sinh ra một ứng dụng Node/Express **một tệp, tự chứa**, rồi script đóng
gói và chạy nó trong container có giới hạn cứng. Chọn một-tệp-tự-chứa vì nó là thứ duy nhất
vừa đủ nhỏ để sinh đúng trong một lượt, vừa chạy được thật mà không cần cài phụ thuộc.

AN TOÀN — đây là mã do AI sinh, phải coi như mã không tin được:
  - mạng riêng `mvp-net` đặt `internal` → container KHÔNG ra được Internet.
    (Hôm nay đã có sự cố một container demo bị chiếm để đào tiền ảo; ràng buộc này
     khiến kịch bản đó không lặp lại được: không gọi ra ngoài thì không đào được.)
  - `--cpus 0.4 --memory 192m --pids-limit 96` → không chiếm nổi máy dù có bị lợi dụng
  - `--read-only` + tmpfs /tmp → không ghi được xuống đĩa
  - `--security-opt no-new-privileges`, `--cap-drop ALL` → không leo thang đặc quyền
  - không mount gì của máy chủ, không có docker.sock
Không có đường ra Internet nên MVP chỉ phục vụ nội dung của chính nó — đúng mức một bản
demo cần có, và đó là đánh đổi có chủ ý.
"""
import json
import os
import re
import shutil
import sqlite3
import subprocess
import time
import urllib.request
from datetime import datetime, timezone

DB = os.environ.get("DB_PATH", "/data/sandbox.db")
GOC = os.environ.get("MVP_DIR", "/opt/xuong-y-tuong/mvp")
MANG = os.environ.get("MVP_NET", "mvp-net")
LLM_BASE = os.environ.get("LLM_BASE_URL", "https://llm.soloceo.vn/v1")
LLM_KEY = os.environ.get("LLM_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL_NAME", "soloceo-smart")
CONG_KHAI = os.environ.get("MVP_BASE_URL", "https://sandbox.soloceo.vn/mvp")
SO_DU_AN = int(os.environ.get("SO_DU_AN", "1"))


def now():
    return datetime.now(timezone.utc).isoformat()


def sh(cmd, timeout=600):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def llm(prompt, max_tokens=8000):
    body = json.dumps({
        "model": LLM_MODEL, "max_tokens": max_tokens, "temperature": 0.2,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    rq = urllib.request.Request(
        LLM_BASE + "/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + LLM_KEY})
    with urllib.request.urlopen(rq, timeout=420) as r:
        return json.loads(r.read().decode())["choices"][0]["message"]["content"]


PROMPT = """Bạn viết một MVP CHẠY ĐƯỢC THẬT cho ý tưởng dưới đây, dành cho Solo CEO Việt Nam.

Ý TƯỞNG: {ten}
MÔ TẢ: {tom_tat}
NGÀNH: {nganh}
{bmc}

RÀNG BUỘC KỸ THUẬT — bắt buộc tuân thủ, sai là MVP không chạy:
- MỘT tệp `server.js` duy nhất, chỉ dùng module lõi của Node 20 (`http`, `url`, `fs`,
  `crypto`). TUYỆT ĐỐI không require gói ngoài, không npm install.
- Nghe cổng `process.env.PORT || 8080`, bind `0.0.0.0`.
- **Không có Internet**: không fetch/gọi API ngoài. Mọi dữ liệu mẫu nhúng thẳng trong mã.
- Dữ liệu người dùng nhập giữ trong bộ nhớ (biến JS). Không ghi tệp.
- **So khớp route KHÔNG được dùng tiền tố.** Proxy đã cắt tiền tố trước khi chuyển tiếp,
  nên máy chủ luôn nhận đường dẫn trần: `/`, `/health`, `/dat-cho`... Nếu bạn kiểm tra
  `pathname.startsWith(BASE_PATH)` rồi trả 404 thì MVP chết ngay ở khâu nghiệm thu — đây
  là lỗi đã xảy ra thật một lần.
- `process.env.BASE_PATH` (vd "/mvp/abc") CHỈ dùng để **sinh liên kết** trong HTML —
  `action`, `href`, `fetch` — vì trình duyệt thì vẫn thấy tiền tố. Ví dụ đúng:
  `const B = process.env.BASE_PATH || ''` rồi `<form action="${{B}}/dat-cho">`, trong khi
  route vẫn so khớp `pathname === '/dat-cho'`.

YÊU CẦU SẢN PHẨM:
- Trang chủ HTML hoàn chỉnh, tiếng Việt, giao diện tối gọn gàng (nền #0b0b0c, chữ #e6e6e6,
  nhấn #3fb950), tự chứa CSS trong <style>. Không tải font/ảnh từ ngoài.
- Nêu rõ sản phẩm giải quyết vấn đề gì và cho ai.
- **Ít nhất MỘT chức năng lõi dùng thật được** (không phải nút giả): ví dụ máy tính báo
  giá, biểu mẫu đặt chỗ có xác thực và hiện lại danh sách đã đặt, bộ lọc danh mục, chấm
  điểm/khảo sát... Phải xử lý ở phía máy chủ và trả kết quả thật.
- Có `/health` trả JSON {{"ok":true}}.
- Trang chủ tối thiểu 1500 ký tự HTML.

Trả về DUY NHẤT mã JavaScript, bọc trong một khối ```javascript ... ```. Không giải thích."""


def lay_ma(t):
    m = re.search(r"```(?:javascript|js)?\s*\n(.*?)```", t, re.S)
    ma = m.group(1) if m else t
    return ma.strip()


def kiem_ma(ma):
    """Chặn trước những thứ chắc chắn làm MVP hỏng hoặc vi phạm ràng buộc."""
    loi = []
    if "require(" in ma:
        for m in re.findall(r"require\(['\"]([^'\"]+)['\"]\)", ma):
            if m not in ("http", "url", "fs", "crypto", "path", "querystring", "os", "zlib", "stream", "events", "util", "buffer"):
                loi.append("dùng gói ngoài: " + m)
    if not re.search(r"createServer", ma):
        loi.append("không tạo máy chủ HTTP")
    if "/health" not in ma:
        loi.append("thiếu /health")
    if len(ma) < 1500:
        loi.append("mã quá ngắn (%d ký tự)" % len(ma))
    # Bẫy đã sập một lần: mô hình dùng BASE_PATH để LỌC route rồi trả 404 cho mọi đường dẫn
    # trần, trong khi proxy đã cắt tiền tố. App chạy, log sạch, mà mọi request đều 404.
    # Bắt ngay từ khâu đọc mã rẻ hơn nhiều so với build image rồi mới phát hiện.
    if re.search(r"(startsWith|indexOf|match)\s*\(\s*(BASE_PATH|base|BASE)\b", ma) or \
       re.search(r"!\s*pathname\.startsWith\s*\(", ma):
        loi.append("dùng BASE_PATH để so khớp route (proxy đã cắt tiền tố — sẽ 404 toàn bộ)")
    return loi


DOCKERFILE = """FROM node:20-alpine
WORKDIR /app
COPY server.js ./
ENV PORT=8080
EXPOSE 8080
CMD ["node","server.js"]
"""


def bao_dam_mang():
    ma, out = sh("docker network inspect %s >/dev/null 2>&1" % MANG)
    if ma != 0:
        # internal: container không có route ra Internet
        sh("docker network create --internal %s" % MANG)
        print("  đã tạo mạng nội bộ %s (không ra Internet)" % MANG, flush=True)
    # xưởng phải cùng mạng để proxy tới được
    sh("docker network connect %s xuong-y-tuong 2>/dev/null" % MANG)


def dung_mvp(slug, ma_nguon):
    thu_muc = os.path.join(GOC, slug)
    shutil.rmtree(thu_muc, ignore_errors=True)
    os.makedirs(thu_muc, exist_ok=True)
    open(os.path.join(thu_muc, "server.js"), "w", encoding="utf-8").write(ma_nguon)
    open(os.path.join(thu_muc, "Dockerfile"), "w", encoding="utf-8").write(DOCKERFILE)

    anh = "mvp-" + slug
    rc, out = sh("cd %s && docker build -q -t %s ." % (thu_muc, anh), timeout=420)
    if rc != 0:
        return False, "build ảnh lỗi: " + out[-400:]

    ten_ct = "mvp-" + slug
    sh("docker rm -f %s 2>/dev/null" % ten_ct)
    # Giới hạn cứng — mã do AI sinh phải coi như mã không tin được
    rc, out = sh(
        "docker run -d --name %s --restart unless-stopped "
        "--network %s "
        "--cpus 0.4 --memory 192m --pids-limit 96 "
        "--read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m "
        "--security-opt no-new-privileges --cap-drop ALL "
        "-e PORT=8080 -e BASE_PATH=/mvp/%s "
        "%s" % (ten_ct, MANG, slug, anh))
    if rc != 0:
        return False, "chạy container lỗi: " + out[-400:]
    return True, ten_ct


def thu_trong_mang(slug, duong="/health"):
    rc, out = sh(
        "docker run --rm --network %s curlimages/curl:latest -s --max-time 15 "
        "-o /dev/null -w '%%{http_code}' http://mvp-%s:8080%s" % (MANG, slug, duong))
    return out.strip()


def main():
    if not LLM_KEY:
        raise SystemExit("Thiếu LLM_API_KEY")
    os.makedirs(GOC, exist_ok=True)
    bao_dam_mang()
    con = sqlite3.connect(DB, timeout=300)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=300000")

    ds = con.execute(
        "SELECT id,ten,slug,nganh,tom_tat,bmc FROM du_an "
        "WHERE trang_thai='dat' ORDER BY diem_kha_thi DESC LIMIT ?", (SO_DU_AN,)).fetchall()
    if not ds:
        print("Không có dự án nào ở trạng thái 'dat' để dựng.", flush=True)
        return

    for _id, ten, slug, nganh, tom_tat, bmc in ds:
        print("▸ dựng MVP cho #%d %s" % (_id, ten[:60]), flush=True)
        con.execute("UPDATE du_an SET trang_thai='dang-xay', cap_nhat=? WHERE id=?", (now(), _id))
        con.execute("INSERT INTO nhat_ky(du_an_id,buoc,trang_thai,chi_tiet,luc) VALUES(?,?,?,?,?)",
                    (_id, "xay-mvp", "bat-dau", "", now()))
        con.commit()

        tom_bmc = ""
        try:
            b = json.loads(bmc) if bmc else None
            if b:
                tom_bmc = "MÔ HÌNH KINH DOANH: " + json.dumps(b, ensure_ascii=False)[:900]
        except Exception:
            pass

        ok, chi_tiet = False, ""
        for lan in range(2):  # sinh lại một lần nếu mã không đạt
            try:
                ma = lay_ma(llm(PROMPT.format(ten=ten, tom_tat=tom_tat or "", nganh=nganh or "",
                                              bmc=tom_bmc)))
            except Exception as e:
                chi_tiet = "gọi mô hình lỗi: " + str(e)[:200]
                continue
            loi = kiem_ma(ma)
            if loi:
                chi_tiet = "mã không đạt: " + "; ".join(loi)
                print("  lần %d — %s" % (lan + 1, chi_tiet), flush=True)
                continue
            ok, chi_tiet = dung_mvp(slug, ma)
            if ok:
                break
            print("  lần %d — %s" % (lan + 1, chi_tiet[:150]), flush=True)

        if not ok:
            con.execute("UPDATE du_an SET trang_thai='hong', ly_do=?, cap_nhat=? WHERE id=?",
                        (chi_tiet[:500], now(), _id))
            con.execute("INSERT INTO nhat_ky(du_an_id,buoc,trang_thai,chi_tiet,luc) VALUES(?,?,?,?,?)",
                        (_id, "xay-mvp", "truot", chi_tiet[:1500], now()))
            con.commit()
            print("  ✗ %s" % chi_tiet[:160], flush=True)
            continue

        # Container lên chưa chắc app đã chạy. Chờ vài nhịp cho Node khởi động rồi mới thử.
        ma_health = ma_home = "000"
        for _ in range(6):
            time.sleep(4)
            ma_health = thu_trong_mang(slug, "/health")
            if ma_health == "200":
                break
        ma_home = thu_trong_mang(slug, "/")

        # ĐÂY LÀ CỔNG CHẤT LƯỢNG THẬT SỰ. Bản đầu tiên tôi viết ghi 'dat' bất kể mã trả về
        # bao nhiêu — nghĩa là một MVP trả 404 vẫn được coi là chạy được và đủ điều kiện đẩy
        # sang marketplace. Đúng lại cái bệnh mà cả xưởng này sinh ra để chữa.
        if ma_health != "200" or ma_home not in ("200", "304"):
            ly = "nghiệm thu trượt: /health %s · / %s (yêu cầu /health=200 và /=200)" % (ma_health, ma_home)
            nhat_ky_loi = sh("docker logs --tail 25 mvp-%s 2>&1" % slug)[1][:800]
            sh("docker rm -f mvp-%s" % slug)      # không để container hỏng chiếm tài nguyên
            con.execute("UPDATE du_an SET trang_thai='hong', ly_do=?, cap_nhat=? WHERE id=?",
                        (ly, now(), _id))
            con.execute("INSERT INTO nhat_ky(du_an_id,buoc,trang_thai,chi_tiet,luc) VALUES(?,?,?,?,?)",
                        (_id, "xay-mvp", "truot", ly + "\n--- log ---\n" + nhat_ky_loi, now()))
            con.commit()
            print("  ✗ %s\n    log: %s" % (ly, nhat_ky_loi[:300].replace("\n", " | ")), flush=True)
            continue

        demo = "%s/%s/" % (CONG_KHAI.rstrip("/"), slug)
        con.execute("UPDATE du_an SET trang_thai='nghiem-thu', demo_url=?, repo=?, cap_nhat=? WHERE id=?",
                    (demo, os.path.join(GOC, slug), now(), _id))
        con.execute("INSERT INTO nhat_ky(du_an_id,buoc,trang_thai,chi_tiet,luc) VALUES(?,?,?,?,?)",
                    (_id, "xay-mvp", "dat",
                     "container %s · /health %s · / %s · demo %s" % (chi_tiet, ma_health, ma_home, demo),
                     now()))
        con.commit()
        print("  ✓ %s | /health %s · / %s\n    %s" % (chi_tiet, ma_health, ma_home, demo), flush=True)

    con.close()


if __name__ == "__main__":
    main()
