"""Interceptor tiêm danh tính CEO vào mọi lời gọi MCP.

DeerFlow gọi builder này (khai báo trong extensions_config.json:
``soloceo_crm.interceptor:build_crm_interceptor``). Với mỗi tool-call MCP, ta
lấy user_id của CEO đang chat (ContextVar do auth middleware set), ký HMAC ngắn
hạn và gắn header ``X-Ceo-Token``. MCP server CRM dùng token này để phân giải
đúng tenant CRM của CEO. Các MCP server khác bỏ qua header — vô hại.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time


def build_crm_interceptor():
    secret_raw = os.environ.get("CRM_MCP_SECRET", "")
    if not secret_raw:
        return None
    secret = secret_raw.encode()

    async def interceptor(request, handler):
        uid = None
        try:
            from deerflow.runtime.user_context import get_effective_user_id

            uid = get_effective_user_id()
        except Exception:  # noqa: BLE001 — không chặn tool khác nếu lỗi
            uid = None
        if uid:
            exp = int(time.time()) + 300
            sig = hmac.new(secret, f"{uid}|{exp}".encode(), hashlib.sha256).hexdigest()
            tok = base64.urlsafe_b64encode(f"{uid}|{exp}|{sig}".encode()).decode()
            headers = dict(request.headers or {})
            headers["X-Ceo-Token"] = tok
            request = request.override(headers=headers)
        return await handler(request)

    return interceptor
