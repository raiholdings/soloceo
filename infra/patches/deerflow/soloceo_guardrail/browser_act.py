"""
N3 Midscene — browser_act: AI thao tác web hộ (chế độ Assist).

Triết lý Midscene (VLM điều khiển thao tác web) được hiện thực NATIVE trên browser
CHẠY TRONG AIO Sandbox (`/v1/browser/*`) — giữ nguyên bảo đảm an ninh của SoloCEO:
egress qua g3, cô lập per-tenant, godlp che dữ liệu. VLM = Claude-vision qua LiteLLM.

Vòng lặp: điều hướng → tri giác (ảnh chụp + văn bản + phần tử tương tác) → VLM chọn
1 hành động → thực thi → lặp tới khi xong / hết bước. Guardrail cứng: TỪ CHỐI mọi
tác vụ chạm CAPTCHA / OTP / chữ ký số / VNeID / định danh điện tử — chỉ con người làm.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

import httpx
from langchain.tools import tool

from deerflow.tools.types import Runtime

logger = logging.getLogger(__name__)

# ── Guardrail cứng (không bao giờ tự động) ─────────────────────────────────
FORBIDDEN = [
    "captcha", "recaptcha", "hcaptcha", "turnstile",
    "otp", "mã otp", "ma otp", "one-time", "one time password", "smart otp", "soft otp",
    "chữ ký số", "chu ky so", "ký số", "ky so", "chữ ký điện tử", "digital signature",
    "vneid", "vneid", "định danh điện tử", "dinh danh dien tu",
    "xác thực 2 lớp", "2fa", "two-factor", "mã pin", "ma pin", "mật khẩu một lần",
]
FORBIDDEN_MSG = (
    "TỪ CHỐI: tác vụ liên quan CAPTCHA / OTP / chữ ký số / VNeID / định danh điện tử — "
    "theo chính sách an toàn SoloCEO, những thao tác này CHỈ con người thực hiện. "
    "Vui lòng tự làm bước xác thực rồi giao lại phần còn lại cho tôi."
)

LITELLM_BASE = os.environ.get("LSV_LITELLM_BASE", "https://llm.soloceo.vn/v1")
VISION_MODEL = os.environ.get("SOLOCEO_VISION_MODEL", "soloceo-claude-smart")


def _has_forbidden(text: str) -> bool:
    low = (text or "").lower()
    return any(k in low for k in FORBIDDEN)


def _sandbox_base_url(runtime: Runtime) -> str | None:
    """Lấy base_url của sandbox thread hiện tại (browser chạy trong đó)."""
    sandbox_id = None
    try:
        if runtime.state:
            sb = runtime.state.get("sandbox") or {}
            sandbox_id = sb.get("sandbox_id") if isinstance(sb, dict) else None
    except Exception:  # noqa: BLE001
        pass
    if not sandbox_id:
        return None
    try:
        from deerflow.sandbox import get_sandbox_provider

        provider = get_sandbox_provider()
        boxes = getattr(provider, "_sandboxes", {}) or {}
        sb_obj = boxes.get(sandbox_id)
        base = getattr(sb_obj, "base_url", None)
        return base
    except Exception as e:  # noqa: BLE001
        logger.warning("browser_act: không lấy được sandbox base_url: %s", e)
        return None


def _client(base: str) -> httpx.Client:
    key = os.environ.get("SANDBOX_API_KEY", "")
    return httpx.Client(base_url=base, headers={"X-AIO-API-Key": key}, timeout=90)


def _perceive(cli: httpx.Client) -> tuple[str, list[dict], str | None]:
    """Trả về (text trang, danh sách phần tử tương tác, ảnh base64)."""
    text, elements, shot_b64 = "", [], None
    try:
        r = cli.get("/v1/browser/page/markdown")
        text = ((r.json().get("data") or {}).get("markdown") or "")[:4000]
    except Exception:  # noqa: BLE001
        pass
    try:
        r = cli.get("/v1/browser/page/elements")
        raw = r.json().get("data") or []
        for e in raw[:40]:
            elements.append({
                "index": e.get("index"),
                "tag": e.get("tag"),
                "text": (e.get("text") or "")[:80],
                "placeholder": e.get("placeholder"),
                "href": (e.get("href") or "")[:120],
                "type": e.get("type"),
            })
    except Exception:  # noqa: BLE001
        pass
    try:
        r = cli.get("/v1/browser/page/screenshot")
        if r.headers.get("content-type", "").startswith("image"):
            shot_b64 = base64.b64encode(r.content).decode()
    except Exception:  # noqa: BLE001
        pass
    return text, elements, shot_b64


DECIDE_SYS = (
    "Bạn là tác nhân thao tác web của SoloCEO (chế độ Assist). Nhìn ẢNH CHỤP + văn bản + "
    "danh sách phần tử tương tác của trang, chọn ĐÚNG MỘT hành động tiếp theo để hoàn thành "
    "nhiệm vụ. TUYỆT ĐỐI KHÔNG xử lý CAPTCHA/OTP/chữ ký số/VNeID — nếu trang đòi những thứ đó, "
    "trả action 'stop_human'. Chỉ trả JSON hợp lệ, không giải thích:\n"
    '{"action":"navigate|click|fill|finish|stop_human","index":<số phần tử nếu click/fill>,'
    '"text":"<nội dung nếu fill>","url":"<nếu navigate>","reason":"<1 câu tiếng Việt>",'
    '"answer":"<kết quả cuối nếu finish>"}'
)


def _decide(instruction: str, text: str, elements: list[dict], shot_b64: str | None, history: list[str]) -> dict:
    user_content: list[dict[str, Any]] = [{
        "type": "text",
        "text": (
            f"NHIỆM VỤ: {instruction}\n\n"
            f"ĐÃ LÀM: {' | '.join(history) if history else '(chưa có)'}\n\n"
            f"VĂN BẢN TRANG:\n{text}\n\n"
            f"PHẦN TỬ TƯƠNG TÁC (index — tag — text):\n"
            + "\n".join(f"{e['index']} — {e['tag']} — {e['text']} {e.get('href') or ''}" for e in elements)
            + "\n\nChọn hành động tiếp theo (JSON)."
        ),
    }]
    if shot_b64:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{shot_b64}"},
        })
    body = {
        "model": VISION_MODEL,
        "max_tokens": 600,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": DECIDE_SYS},
            {"role": "user", "content": user_content},
        ],
    }
    key = os.environ.get("LITELLM_KEY", "")
    r = httpx.post(f"{LITELLM_BASE}/chat/completions",
                   headers={"Authorization": f"Bearer {key}"}, json=body, timeout=120)
    r.raise_for_status()
    raw = r.json()["choices"][0]["message"]["content"].strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw[raw.find("{"): raw.rfind("}") + 1])


def _execute(cli: httpx.Client, act: dict) -> str:
    a = act.get("action")
    if a == "navigate":
        cli.post("/v1/browser/page/navigate", json={"url": act.get("url", "")})
        return f"mở {act.get('url')}"
    if a == "click":
        cli.post("/v1/browser/page/click", json={"index": act.get("index")})
        return f"bấm phần tử #{act.get('index')}"
    if a == "fill":
        cli.post("/v1/browser/page/fill", json={"index": act.get("index"), "text": act.get("text", "")})
        return f"điền '{act.get('text','')[:30]}' vào #{act.get('index')}"
    return a or "?"


@tool("browser_act", parse_docstring=True)
def browser_act(runtime: Runtime, instruction: str, url: str = "", max_steps: int = 6) -> str:
    """AI thao tác web hộ bạn (chế độ Assist) — tra cứu, điền form trên trang không có API.

    Trình duyệt chạy TRONG máy tính ảo (sandbox) của bạn: mọi truy cập ra internet đi qua
    lớp bảo mật, dữ liệu cá nhân được che tự động. TỰ ĐỘNG TỪ CHỐI CAPTCHA/OTP/chữ ký số/VNeID
    — những bước đó bạn phải tự làm. Dùng cho việc web công khai: tra thông tin, điền biểu mẫu
    không nhạy cảm, khảo sát trang đối thủ.

    Args:
        instruction: Việc cần làm, mô tả rõ bằng tiếng Việt (vd: "mở trang X, tìm giá sản phẩm Y").
        url: (tuỳ chọn) URL bắt đầu. Nếu để trống, dùng trang hiện tại của trình duyệt.
        max_steps: Số bước thao tác tối đa (mặc định 6).
    """
    if _has_forbidden(instruction) or _has_forbidden(url):
        return FORBIDDEN_MSG

    base = _sandbox_base_url(runtime)
    if not base:
        return ("Chưa có máy tính ảo (sandbox) cho phiên này. Hãy giao cho tôi một việc bất kỳ "
                "trước để khởi động môi trường, rồi thử lại thao tác web.")

    try:
        cli = _client(base)
    except Exception as e:  # noqa: BLE001
        return f"Không kết nối được trình duyệt trong sandbox: {e}"

    history: list[str] = []
    try:
        if url:
            cli.post("/v1/browser/page/navigate", json={"url": url})
            history.append(f"mở {url}")

        for step in range(max_steps):
            text, elements, shot = _perceive(cli)
            if _has_forbidden(text):
                return FORBIDDEN_MSG + "\n\n(Trang hiện tại yêu cầu xác thực người thật.)"
            try:
                act = _decide(instruction, text, elements, shot, history)
            except Exception as e:  # noqa: BLE001
                return f"Đã làm: {', '.join(history) or 'chưa có bước nào'}.\nLỗi khi phân tích trang: {e}"

            if _has_forbidden(json.dumps(act, ensure_ascii=False)):
                return FORBIDDEN_MSG
            if act.get("action") == "stop_human":
                return (f"Dừng lại — cần bạn tự làm: {act.get('reason','bước xác thực người thật')}. "
                        f"Đã làm: {', '.join(history) or 'chưa có'}.")
            if act.get("action") == "finish":
                return (f"✅ Xong: {act.get('answer') or act.get('reason','hoàn thành')}\n\n"
                        f"Các bước đã làm: {', '.join(history) or '(đọc trang)'}")

            done = _execute(cli, act)
            history.append(f"{done} ({act.get('reason','')})".strip())

        return (f"Đã chạy {max_steps} bước nhưng chưa kết thúc rõ ràng. Đã làm: {', '.join(history)}. "
                f"Bạn có thể nói rõ hơn mục tiêu để tôi tiếp tục.")
    finally:
        try:
            cli.close()
        except Exception:  # noqa: BLE001
            pass
