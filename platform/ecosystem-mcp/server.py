"""SoloCEO Ecosystem MCP server.

Cho trợ lý AI DeerFlow "thao tác toàn hệ sinh thái" — biến MỘT ý tưởng của CEO
thành kế hoạch công việc tận dụng tối đa 7 nền tảng lõi đồng bộ với soloceo.vn.

Xác thực per-CEO giống crm-mcp / mkt-mcp: mỗi lời gọi mang header `X-Ceo-Token`
(interceptor DeerFlow ký từ user_id CEO đang chat) → verify HMAC → user_id.

Nền tảng lõi:
  1. Cộng đồng   my.soloceo.vn        (WoWonder)   — mạng xã hội Solo CEO
  2. Học viện    edu.soloceo.vn       (Academy)    — 94 khoá + chứng chỉ  [đọc DB thật]
  3. Chat        chat.soloceo.vn      (SupportBoard) — CSKH đa kênh
  4. Họp video   meeting.soloceo.vn   (LiveSmart)  — họp/hội thảo
  5. Group chat  groupchat.soloceo.vn (Grupo)      — nhóm trao đổi
  6. Video       video.soloceo.vn     (PlayTube)   — kênh video thương hiệu
  7. Chợ ứng dụng + PaaS (App Store)                — cài nền tảng riêng cho venture
  (+ CRM crm.soloceo.vn và Thị trường đã có crm-mcp / mkt-mcp riêng)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import urllib.request

import pymysql
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_headers

MCP_SECRET = os.environ["ECO_MCP_SECRET"].encode()
DB_HOST = os.environ.get("PERFEX_DB_HOST", "perfex-db")
DB_PORT = int(os.environ.get("PERFEX_DB_PORT", "3306"))
DB_USER = os.environ.get("PERFEX_DB_USER", "root")
DB_PASS = os.environ["PERFEX_DB_PASS"]
ACADEMY_DB = os.environ.get("ACADEMY_DB", "academy")

LLM_BASE = os.environ.get("LLM_BASE", "https://llm.soloceo.vn/v1").rstrip("/")
LLM_KEY = os.environ.get("LLM_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "soloceo-smart")

mcp = FastMCP("soloceo-ecosystem")


# --------------------------------------------------------------------------- #
# Danh mục 7 nền tảng lõi (kiến thức nền cho agent)                            #
# --------------------------------------------------------------------------- #
PLATFORMS = [
    {"key": "cong_dong", "ten": "Cộng đồng", "url": "https://my.soloceo.vn",
     "engine": "WoWonder", "dung_de": "Mạng xã hội Solo CEO: xây thương hiệu cá nhân, đăng bài, kết nối đối tác/khách, tìm co-founder & nhà đầu tư.",
     "khi_nao": "Cần lan toả ý tưởng, xây uy tín, gọi vốn, tuyển cộng sự, thu hút khách hàng đầu tiên."},
    {"key": "hoc_vien", "ten": "Học viện", "url": "https://edu.soloceo.vn",
     "engine": "Academy", "dung_de": "94 khoá đào tạo 2 giờ + chứng chỉ SoloCEO: lãnh đạo, chiến lược, marketing, tài chính, AI, vận hành.",
     "khi_nao": "CEO thiếu kỹ năng/khung tư duy để thực thi ý tưởng — học nhanh khoá liên quan trước khi làm."},
    {"key": "chat", "ten": "Chat đa kênh", "url": "https://chat.soloceo.vn",
     "engine": "Support Board", "dung_de": "Hộp thoại CSKH hợp nhất (web, mạng xã hội): tư vấn, chốt đơn, hỗ trợ, thu lead.",
     "khi_nao": "Có khách/traffic cần tư vấn & chốt realtime; nhúng widget lên landing/website venture."},
    {"key": "hop_video", "ten": "Họp video", "url": "https://meeting.soloceo.vn",
     "engine": "LiveSmart", "dung_de": "Họp & hội thảo trực tuyến (kiểu Zoom): demo sản phẩm, tư vấn 1-1, webinar bán hàng, họp đội.",
     "khi_nao": "Cần gặp khách/đối tác/đội trực tuyến, tổ chức webinar ra mắt, tư vấn có phí."},
    {"key": "groupchat", "ten": "Group chat", "url": "https://groupchat.soloceo.vn",
     "engine": "Grupo", "dung_de": "Nhóm trao đổi realtime cho cộng đồng khách hàng / đội ngũ / lớp học.",
     "khi_nao": "Xây nhóm khách VIP, cộng đồng học viên, kênh vận hành đội cộng tác."},
    {"key": "video", "ten": "Video", "url": "https://video.soloceo.vn",
     "engine": "PlayTube", "dung_de": "Kênh video thương hiệu: đăng video sản phẩm, hướng dẫn, review — nội dung dài hạn.",
     "khi_nao": "Cần content video để marketing, dạy khách dùng sản phẩm, xây kênh thương hiệu."},
    {"key": "nen_tang", "ten": "Nền tảng (dịch vụ PaaS + tên miền)", "url": "https://platform.soloceo.vn",
     "engine": "WHMCS", "dung_de": "Đăng ký nền tảng dạng dịch vụ (ERPNext, Odoo, OpenClaw, Hermes Agent, nền tảng Việt hoá) + mua tên miền (.com/.vn qua Nhân Hòa) — hệ thống tự cấp hạ tầng riêng cho venture.",
     "khi_nao": "Ý tưởng cần một sản phẩm/hạ tầng thật (ERP, web bán hàng, tự động hoá, trợ lý AI) hoặc tên miền — đặt mua ở Nền tảng, hệ thống tự provision."},
]


# --------------------------------------------------------------------------- #
# Xác thực token                                                              #
# --------------------------------------------------------------------------- #
class EcoError(Exception):
    pass


def _current_user_id() -> str:
    headers = get_http_headers()
    token = headers.get("x-ceo-token") or headers.get("X-Ceo-Token")
    if not token:
        raise EcoError("Thiếu danh tính CEO (X-Ceo-Token).")
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        user_id, exp_s, sig = raw.rsplit("|", 2)
    except Exception as exc:  # noqa: BLE001
        raise EcoError("Token CEO không hợp lệ.") from exc
    expected = hmac.new(MCP_SECRET, f"{user_id}|{exp_s}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise EcoError("Chữ ký token CEO sai.")
    if int(exp_s) < int(time.time()):
        raise EcoError("Token CEO đã hết hạn.")
    return user_id


def _connect(db: str):
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS,
        database=db, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        autocommit=True, connect_timeout=8,
    )


def _q(db, sql, params=()):
    with _connect(db) as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def _llm(system: str, user: str, max_tokens: int = 2200) -> str:
    if not LLM_KEY:
        raise EcoError("Chưa cấu hình cổng AI.")
    body = json.dumps({
        "model": LLM_MODEL,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.6, "max_tokens": max_tokens,
    }).encode()
    req = urllib.request.Request(
        f"{LLM_BASE}/chat/completions", data=body,
        headers={"Authorization": f"Bearer {LLM_KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["choices"][0]["message"]["content"]


# --------------------------------------------------------------------------- #
# Bộ não điều phối                                                             #
# --------------------------------------------------------------------------- #
@mcp.tool
def ecosystem_catalog() -> list[dict]:
    """Danh mục 7 nền tảng lõi của hệ sinh thái SoloCEO: mỗi nền tảng dùng để làm gì và khi nào nên dùng.
    Gọi tool này trước khi tư vấn để bám đúng năng lực thực tế của hệ thống."""
    return PLATFORMS


@mcp.tool
def ecosystem_plan(idea: str, muc_tieu: str = "") -> dict:
    """★ Bộ não điều phối. Nhận MỘT ý tưởng/kế hoạch kinh doanh của CEO và trả về
    KẾ HOẠCH HÀNH ĐỘNG tận dụng tối đa cả 7 nền tảng lõi: mỗi nền tảng nên làm gì,
    theo thứ tự ưu tiên, kèm việc cụ thể + đường dẫn. Dùng ngay khi CEO nêu ý tưởng."""
    idea = (idea or "").strip()
    if not idea:
        return {"error": "Hãy cho biết ý tưởng/mục tiêu của bạn."}
    cat = "\n".join(
        f"- {p['ten']} ({p['url']}, {p['engine']}): {p['dung_de']} DÙNG KHI: {p['khi_nao']}"
        for p in PLATFORMS
    )
    system = (
        "Bạn là Giám đốc Vận hành AI của SoloCEO — nền tảng điều hành doanh nghiệp một người. "
        "Nhiệm vụ: biến ý tưởng của Solo CEO thành kế hoạch hành động THỰC CHIẾN tận dụng tối đa "
        "7 nền tảng lõi dưới đây. CHỈ đề xuất việc dùng đúng nền tảng có thật. "
        "Trả về JSON hợp lệ (không markdown) theo schema:\n"
        '{ "tom_tat": "1-2 câu định hướng", '
        '"buoc": [ { "thu_tu": 1, "nen_tang": "tên nền tảng", "url": "url", '
        '"muc_dich": "vì sao dùng nền tảng này cho ý tưởng", '
        '"viec_can_lam": ["2-4 việc cụ thể, hành động được ngay"], '
        '"ket_qua": "kết quả kỳ vọng" } ], '
        '"khoa_hoc_nen_hoc": ["1-3 chủ đề khoá học trên Học viện liên quan"], '
        '"luu_y": "1 lời khuyên ưu tiên nguồn lực cho Solo CEO một mình" }\n'
        "Sắp xếp bước theo trình tự triển khai hợp lý (học/chuẩn bị → xây → lan toả → chốt → vận hành). "
        "Dùng 4-6 nền tảng phù hợp nhất, không nhồi cả 7 nếu không cần.\n\n"
        f"7 NỀN TẢNG LÕI:\n{cat}"
    )
    u = f"Ý TƯỞNG CỦA CEO: {idea}"
    if muc_tieu.strip():
        u += f"\nMỤC TIÊU: {muc_tieu.strip()}"
    try:
        raw = _llm(system, u)
        s = raw.strip()
        if s.startswith("```"):
            s = s.split("```", 2)[1]
            s = s[s.find("{"):]
        a, b = s.find("{"), s.rfind("}")
        plan = json.loads(s[a:b + 1])
    except Exception as exc:  # noqa: BLE001
        return {"error": f"Chưa lập được kế hoạch: {exc}", "goi_y": "Thử mô tả ý tưởng chi tiết hơn."}
    plan["_nen_tang_kha_dung"] = [p["ten"] for p in PLATFORMS]
    return plan


# --------------------------------------------------------------------------- #
# Học viện (đọc Academy DB thật)                                              #
# --------------------------------------------------------------------------- #
@mcp.tool
def edu_recommend(chu_de: str = "", limit: int = 6) -> list[dict]:
    """Gợi ý khoá học trên Học viện theo chủ đề (vd 'marketing', 'tài chính', 'AI', 'lãnh đạo').
    Trả tên khoá + trình độ + link học. Bỏ trống chu_de để lấy khoá mới nhất."""
    limit = max(1, min(limit, 20))
    try:
        if chu_de.strip():
            kw = f"%{chu_de.strip()}%"
            rows = _q(ACADEMY_DB,
                "SELECT c.id, c.title, c.level, c.short_description AS mo_ta, cat.name AS danh_muc "
                "FROM course c LEFT JOIN category cat ON cat.id=c.category_id "
                "WHERE c.status='active' AND (c.title LIKE %s OR c.short_description LIKE %s OR cat.name LIKE %s) "
                "ORDER BY c.id DESC LIMIT %s", (kw, kw, kw, limit))
        else:
            rows = _q(ACADEMY_DB,
                "SELECT c.id, c.title, c.level, c.short_description AS mo_ta, cat.name AS danh_muc "
                "FROM course c LEFT JOIN category cat ON cat.id=c.category_id "
                "WHERE c.status='active' ORDER BY c.id DESC LIMIT %s", (limit,))
    except Exception as exc:  # noqa: BLE001
        return [{"error": f"Không truy vấn được Học viện: {exc}"}]
    out = []
    for r in rows:
        slug = _slugify(r["title"])
        out.append({
            "id": r["id"], "ten_khoa": r["title"], "trinh_do": r["level"],
            "danh_muc": r.get("danh_muc"), "mo_ta": r.get("mo_ta"),
            "link_hoc": f"https://edu.soloceo.vn/home/course/{slug}/{r['id']}",
        })
    return out


@mcp.tool
def edu_catalog() -> dict:
    """Tổng quan Học viện: các lĩnh vực đào tạo và số khoá mỗi lĩnh vực."""
    try:
        cats = _q(ACADEMY_DB,
            "SELECT cat.name AS linh_vuc, COUNT(*) AS so_khoa "
            "FROM course c JOIN category cat ON cat.id=c.category_id "
            "WHERE c.status='active' GROUP BY cat.id ORDER BY so_khoa DESC")
        total = _q(ACADEMY_DB, "SELECT COUNT(*) n FROM course WHERE status='active'")[0]["n"]
    except Exception as exc:  # noqa: BLE001
        return {"error": f"Không truy vấn được Học viện: {exc}"}
    return {"tong_so_khoa": total, "linh_vuc": cats,
            "trang": "https://edu.soloceo.vn", "ghi_chu": "Hoàn thành khoá → nhận chứng chỉ SoloCEO."}


def _slugify(text: str) -> str:
    m = {"à":"a","á":"a","ạ":"a","ả":"a","ã":"a","â":"a","ầ":"a","ấ":"a","ậ":"a","ẩ":"a","ẫ":"a",
         "ă":"a","ằ":"a","ắ":"a","ặ":"a","ẳ":"a","ẵ":"a","è":"e","é":"e","ẹ":"e","ẻ":"e","ẽ":"e",
         "ê":"e","ề":"e","ế":"e","ệ":"e","ể":"e","ễ":"e","ì":"i","í":"i","ị":"i","ỉ":"i","ĩ":"i",
         "ò":"o","ó":"o","ọ":"o","ỏ":"o","õ":"o","ô":"o","ồ":"o","ố":"o","ộ":"o","ổ":"o","ỗ":"o",
         "ơ":"o","ờ":"o","ớ":"o","ợ":"o","ở":"o","ỡ":"o","ù":"u","ú":"u","ụ":"u","ủ":"u","ũ":"u",
         "ư":"u","ừ":"u","ứ":"u","ự":"u","ử":"u","ữ":"u","ỳ":"y","ý":"y","ỵ":"y","ỷ":"y","ỹ":"y","đ":"d"}
    t = "".join(m.get(ch, ch) for ch in text.lower())
    out = []
    for ch in t:
        if ch.isalnum() and ord(ch) < 128:
            out.append(ch)
        elif ch in " -_":
            out.append("-")
    s = "".join(out)
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-") or "khoa-hoc"


# --------------------------------------------------------------------------- #
# Nội dung + deep-link các nền tảng (soạn sẵn, CEO 1-click đăng)              #
# --------------------------------------------------------------------------- #
@mcp.tool
def community_draft_post(chu_de: str, muc_tieu: str = "thu hút khách hàng") -> dict:
    """Soạn bài đăng Cộng đồng (my.soloceo.vn) cho một chủ đề + trả link để CEO đăng ngay."""
    try:
        content = _llm(
            "Bạn là chuyên gia xây thương hiệu cá nhân cho Solo CEO. Viết 1 bài đăng mạng xã hội "
            "tiếng Việt, tự nhiên, có móc mở đầu, giá trị thật, kêu gọi tương tác. 120-180 từ, "
            "kèm 3-5 hashtag. Chỉ trả nội dung bài.",
            f"Chủ đề: {chu_de}. Mục tiêu: {muc_tieu}.", max_tokens=700)
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)}
    return {"nen_tang": "Cộng đồng", "bai_dang": content.strip(),
            "link_dang": "https://my.soloceo.vn", "huong_dan": "Sao chép nội dung, đăng lên tường của bạn."}


@mcp.tool
def video_plan(chu_de: str) -> dict:
    """Lập dàn ý video thương hiệu (video.soloceo.vn / PlayTube) cho một chủ đề + link tải lên."""
    try:
        outline = _llm(
            "Bạn là biên tập viên nội dung video cho Solo CEO. Lập dàn ý 1 video ngắn 3-5 phút: "
            "tiêu đề hấp dẫn, hook 10 giây, 3-4 ý chính, lời kêu gọi hành động. Tiếng Việt, súc tích.",
            f"Chủ đề video: {chu_de}", max_tokens=700)
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)}
    return {"nen_tang": "Video", "dan_y": outline.strip(),
            "link_tai_len": "https://video.soloceo.vn", "huong_dan": "Quay theo dàn ý rồi tải lên kênh."}


@mcp.tool
def meeting_create(chu_de: str) -> dict:
    """Chuẩn bị một buổi họp/hội thảo trực tuyến (meeting.soloceo.vn / LiveSmart): trả link bắt đầu + agenda gợi ý."""
    agenda = None
    try:
        agenda = _llm(
            "Lập agenda ngắn (4-6 mục, kèm phút) cho một buổi họp/webinar của Solo CEO. Tiếng Việt.",
            f"Chủ đề buổi họp: {chu_de}", max_tokens=500).strip()
    except Exception:  # noqa: BLE001
        agenda = None
    return {"nen_tang": "Họp video", "chu_de": chu_de, "agenda": agenda,
            "link_bat_dau": "https://meeting.soloceo.vn",
            "huong_dan": "Đăng nhập bằng tài khoản SoloCEO, tạo phòng và gửi link cho khách/đội."}


@mcp.tool
def chat_setup() -> dict:
    """Hướng dẫn bật Chat đa kênh (chat.soloceo.vn) cho website/landing của venture + đoạn nhúng widget."""
    snippet = '<script id="chat-init" src="https://chat.soloceo.vn/script/js/main.js"></script>'
    return {"nen_tang": "Chat đa kênh", "widget_nhung": snippet,
            "quan_tri": "https://chat.soloceo.vn/admin",
            "huong_dan": "Dán đoạn nhúng vào cuối trang web của bạn để nhận & tư vấn khách realtime, thu lead vào CRM."}


@mcp.tool
def groupchat_open() -> dict:
    """Trả link Group chat (groupchat.soloceo.vn) để lập nhóm khách VIP / cộng đồng học viên / đội ngũ."""
    return {"nen_tang": "Group chat", "link": "https://groupchat.soloceo.vn",
            "goi_y": ["Nhóm khách hàng thân thiết", "Cộng đồng học viên khoá học", "Kênh vận hành đội cộng tác"]}


@mcp.tool
def apps_catalog() -> list[dict]:
    """Chợ ứng dụng PaaS: các nền tảng mã nguồn mở CEO có thể cài riêng cho venture (mỗi CEO 1 hạ tầng)."""
    return [
        {"ten": "Website / Landing bán hàng", "dung_de": "Trang bán hàng, thu lead cho venture."},
        {"ten": "Cửa hàng thương mại điện tử", "dung_de": "Bán hàng online, giỏ hàng, thanh toán."},
        {"ten": "Tự động hoá quy trình", "dung_de": "Nối các app, tự động hoá marketing/vận hành."},
        {"ten": "Trợ lý AI / Chatbot riêng", "dung_de": "Chatbot RAG theo tài liệu sản phẩm của venture."},
        {"ten": "Văn phòng 3D / Không gian ảo", "dung_de": "Không gian làm việc & gặp gỡ ảo cho đội."},
        {"_link": "https://soloceo.vn/workspace/cho-ung-dung",
         "_ghi_chu": "Vào Chợ ứng dụng trong workspace để cài 1-click; hệ thống tự cấp hạ tầng riêng."},
    ]


@mcp.tool
def ecosystem_footprint() -> dict:
    """Bức tranh nhanh: các nền tảng lõi đang sẵn sàng cho CEO + số khoá học khả dụng."""
    try:
        uid = _current_user_id()
    except EcoError as e:
        return {"error": str(e)}
    try:
        n_courses = _q(ACADEMY_DB, "SELECT COUNT(*) n FROM course WHERE status='active'")[0]["n"]
    except Exception:  # noqa: BLE001
        n_courses = None
    return {
        "ceo": uid,
        "nen_tang_san_sang": [{"ten": p["ten"], "url": p["url"]} for p in PLATFORMS],
        "so_khoa_hoc": n_courses,
        "goi_y": "Nêu một ý tưởng và gọi ecosystem_plan để nhận kế hoạch tận dụng cả hệ sinh thái.",
    }


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000, path="/mcp")
