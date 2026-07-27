"""SoloCEO Marketplace MCP server.

Khung connector hợp nhất cho các sàn bán hàng (TikTok Shop, Shopee, Lazada…),
cho đội AI DeerFlow đồng bộ sản phẩm/đơn/tồn ĐÚNG shop của từng CEO.

- Auth per-CEO: mỗi lời gọi mang header `X-Ceo-Token` (interceptor DeerFlow ký từ
  user_id CEO đang chat) — verify HMAC → user_id.
- Token sàn lưu mã hoá (Fernet) trong DB `marketplace` trên perfex-db, khoá theo
  (user_id, platform).
- Kết nối: CEO bấm "Nhờ đội AI kết nối" → tool `mkt_connect_url` trả link OAuth;
  sàn redirect về `/oauth/<platform>/callback` (route dưới) → đổi code→token→lưu.
- Mỗi sàn = 1 connector cắm-rút (dict CONNECTORS). Hôm nay có TikTok Shop; thêm sàn
  = thêm 1 class theo interface MarketplaceConnector.

BẮT BUỘC cấu hình (env) trước khi đồng bộ thật: TIKTOK_APP_KEY, TIKTOK_APP_SECRET
(đăng ký TikTok Shop Partner App). Chưa có → tool trả hướng dẫn, không lỗi.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import urllib.parse

import pymysql
import requests
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_headers
from starlette.requests import Request
from starlette.responses import HTMLResponse, RedirectResponse

# --------------------------------------------------------------------------- #
# Cấu hình                                                                     #
# --------------------------------------------------------------------------- #
MCP_SECRET = os.environ["MKT_MCP_SECRET"].encode()
DB_HOST = os.environ.get("PERFEX_DB_HOST", "perfex-db")
DB_PORT = int(os.environ.get("PERFEX_DB_PORT", "3306"))
DB_USER = os.environ.get("PERFEX_DB_USER", "root")
DB_PASS = os.environ["PERFEX_DB_PASS"]
STORE_DB = os.environ.get("MKT_STORE_DB", "marketplace")

# URL công khai của chính service này (để TikTok redirect callback về)
PUBLIC_BASE = os.environ.get("MKT_PUBLIC_BASE", "https://mkt-mcp.soloceo.vn").rstrip("/")
# Sau khi kết nối xong redirect CEO về đâu
WORKSPACE_URL = os.environ.get("MKT_WORKSPACE_URL", "https://soloceo.vn/workspace/thi-truong")

# Khoá mã hoá token sàn (Fernet base64 32-byte). Nếu thiếu → lưu thô (chỉ dev).
_ENC_KEY = os.environ.get("MKT_ENC_KEY", "")
try:
    from cryptography.fernet import Fernet

    _FERNET = Fernet(_ENC_KEY.encode()) if _ENC_KEY else None
except Exception:  # noqa: BLE001
    _FERNET = None


def _enc(s: str) -> str:
    if not s:
        return ""
    return _FERNET.encrypt(s.encode()).decode() if _FERNET else "plain:" + s


def _dec(s: str) -> str:
    if not s:
        return ""
    if s.startswith("plain:"):
        return s[6:]
    return _FERNET.decrypt(s.encode()).decode() if _FERNET else s


mcp = FastMCP("soloceo-marketplace")


class MktError(Exception):
    pass


# --------------------------------------------------------------------------- #
# Auth + state OAuth                                                           #
# --------------------------------------------------------------------------- #
def _current_user_id() -> str:
    headers = get_http_headers()
    token = headers.get("x-ceo-token") or headers.get("X-Ceo-Token")
    if not token:
        raise MktError("Thiếu danh tính CEO (X-Ceo-Token).")
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        user_id, exp_s, sig = raw.rsplit("|", 2)
    except Exception as exc:  # noqa: BLE001
        raise MktError("Token CEO không hợp lệ.") from exc
    expected = hmac.new(MCP_SECRET, f"{user_id}|{exp_s}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise MktError("Chữ ký token CEO sai.")
    if int(exp_s) < int(time.time()):
        raise MktError("Token CEO đã hết hạn.")
    return user_id


def _sign_state(user_id: str) -> str:
    exp = int(time.time()) + 1800  # 30 phút để CEO hoàn tất OAuth
    sig = hmac.new(MCP_SECRET, f"{user_id}|{exp}".encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{user_id}|{exp}|{sig}".encode()).decode()


def _verify_state(state: str) -> str:
    raw = base64.urlsafe_b64decode(state.encode()).decode()
    user_id, exp_s, sig = raw.rsplit("|", 2)
    expected = hmac.new(MCP_SECRET, f"{user_id}|{exp_s}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise MktError("state sai chữ ký.")
    if int(exp_s) < int(time.time()):
        raise MktError("Liên kết kết nối đã hết hạn, thử lại.")
    return user_id


# --------------------------------------------------------------------------- #
# Kho token sàn (DB marketplace.mkt_connections)                              #
# --------------------------------------------------------------------------- #
def _connect(db: str | None = None) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS,
        database=db, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        autocommit=True, connect_timeout=8,
    )


def _init_store() -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{STORE_DB}` CHARACTER SET utf8mb4")
        cur.execute(f"USE `{STORE_DB}`")
        cur.execute(
            """CREATE TABLE IF NOT EXISTS mkt_connections (
                user_id VARCHAR(64) NOT NULL,
                platform VARCHAR(32) NOT NULL,
                shop_id VARCHAR(64), shop_cipher VARCHAR(255), shop_name VARCHAR(255),
                region VARCHAR(16),
                access_token TEXT, refresh_token TEXT,
                access_expires_at BIGINT, refresh_expires_at BIGINT,
                meta TEXT, updated_at BIGINT,
                PRIMARY KEY (user_id, platform)
            ) CHARACTER SET utf8mb4"""
        )


def _save_conn(user_id: str, platform: str, data: dict) -> None:
    with _connect(STORE_DB) as conn, conn.cursor() as cur:
        cur.execute(
            """REPLACE INTO mkt_connections
               (user_id, platform, shop_id, shop_cipher, shop_name, region,
                access_token, refresh_token, access_expires_at, refresh_expires_at,
                meta, updated_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (user_id, platform, data.get("shop_id"), data.get("shop_cipher"),
             data.get("shop_name"), data.get("region"),
             _enc(data.get("access_token", "")), _enc(data.get("refresh_token", "")),
             data.get("access_expires_at"), data.get("refresh_expires_at"),
             json.dumps(data.get("meta", {}), ensure_ascii=False), int(time.time())),
        )


def _get_conn(user_id: str, platform: str) -> dict | None:
    with _connect(STORE_DB) as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM mkt_connections WHERE user_id=%s AND platform=%s",
            (user_id, platform),
        )
        row = cur.fetchone()
    if not row:
        return None
    row["access_token"] = _dec(row.get("access_token") or "")
    row["refresh_token"] = _dec(row.get("refresh_token") or "")
    return row


def _list_conns(user_id: str) -> list[dict]:
    with _connect(STORE_DB) as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT platform, shop_name, region, access_expires_at, updated_at "
            "FROM mkt_connections WHERE user_id=%s", (user_id,)
        )
        return cur.fetchall()


def _delete_conn(user_id: str, platform: str) -> None:
    with _connect(STORE_DB) as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM mkt_connections WHERE user_id=%s AND platform=%s",
            (user_id, platform),
        )


# --------------------------------------------------------------------------- #
# Interface connector                                                          #
# --------------------------------------------------------------------------- #
class MarketplaceConnector:
    key = "base"
    name = "Base"

    def configured(self) -> bool:
        raise NotImplementedError

    def authorize_url(self, state: str) -> str:
        raise NotImplementedError

    def exchange_code(self, code: str) -> dict:
        """Đổi auth code → dict lưu vào kho (access_token, shop…)."""
        raise NotImplementedError

    def list_products(self, conn: dict, limit: int) -> list[dict]:
        raise NotImplementedError

    def list_orders(self, conn: dict, limit: int) -> list[dict]:
        raise NotImplementedError

    def update_stock(self, conn: dict, sku_id: str, quantity: int) -> dict:
        raise NotImplementedError


# --------------------------------------------------------------------------- #
# TikTok Shop Partner API connector                                           #
# --------------------------------------------------------------------------- #
class TikTokShop(MarketplaceConnector):
    key = "tiktok_shop"
    name = "TikTok Shop"

    APP_KEY = os.environ.get("TIKTOK_APP_KEY", "")
    APP_SECRET = os.environ.get("TIKTOK_APP_SECRET", "")
    # Base URL API (Partner v2). Version endpoint có thể đổi — kiểm chứng với app thật.
    API_BASE = os.environ.get("TIKTOK_API_BASE", "https://open-api.tiktokglobalshop.com")
    AUTH_TOKEN_URL = os.environ.get(
        "TIKTOK_TOKEN_URL", "https://auth.tiktok-shops.com/api/v2/token/get"
    )
    # URL authorize copy từ Partner Center (dạng services.tiktokshop.com/open/authorize?service_id=…)
    AUTHORIZE_URL = os.environ.get("TIKTOK_AUTHORIZE_URL", "")

    def configured(self) -> bool:
        return bool(self.APP_KEY and self.APP_SECRET and self.AUTHORIZE_URL)

    def authorize_url(self, state: str) -> str:
        sep = "&" if "?" in self.AUTHORIZE_URL else "?"
        return f"{self.AUTHORIZE_URL}{sep}state={urllib.parse.quote(state)}"

    def exchange_code(self, code: str) -> dict:
        r = requests.get(self.AUTH_TOKEN_URL, params={
            "app_key": self.APP_KEY, "app_secret": self.APP_SECRET,
            "auth_code": code, "grant_type": "authorized_code",
        }, timeout=20)
        d = r.json()
        data = d.get("data") or {}
        if not data.get("access_token"):
            raise MktError(f"Đổi token TikTok thất bại: {d.get('message') or d}")
        out = {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", ""),
            "access_expires_at": data.get("access_token_expire_in"),
            "refresh_expires_at": data.get("refresh_token_expire_in"),
            "shop_name": data.get("seller_name", ""),
            "meta": {"seller_base_region": data.get("seller_base_region", "")},
        }
        # Lấy shop_cipher (bắt buộc cho hầu hết endpoint) qua get authorized shops
        try:
            shops = self._request("GET", "/authorization/202309/shops",
                                  out["access_token"], params={}, body=None)
            arr = (shops.get("data") or {}).get("shops") or []
            if arr:
                out["shop_id"] = arr[0].get("id")
                out["shop_cipher"] = arr[0].get("cipher")
                out["shop_name"] = out["shop_name"] or arr[0].get("name")
                out["region"] = arr[0].get("region")
        except Exception:  # noqa: BLE001 — vẫn lưu token dù chưa lấy được shop
            pass
        return out

    # -- ký chữ ký v2: sort params (trừ sign/access_token) → path+{k}{v}… +body,
    #    bọc app_secret 2 đầu, HMAC-SHA256 hex ------------------------------- #
    def _sign(self, path: str, params: dict, body_str: str) -> str:
        keys = sorted(k for k in params if k not in ("sign", "access_token"))
        base = path + "".join(f"{k}{params[k]}" for k in keys)
        if body_str:
            base += body_str
        base = self.APP_SECRET + base + self.APP_SECRET
        return hmac.new(self.APP_SECRET.encode(), base.encode(), hashlib.sha256).hexdigest()

    def _request(self, method: str, path: str, access_token: str,
                 params: dict | None = None, body: dict | None = None,
                 shop_cipher: str | None = None) -> dict:
        params = dict(params or {})
        params["app_key"] = self.APP_KEY
        params["timestamp"] = str(int(time.time()))
        if shop_cipher:
            params["shop_cipher"] = shop_cipher
        body_str = json.dumps(body, separators=(",", ":")) if body is not None else ""
        params["sign"] = self._sign(path, params, body_str)
        headers = {"x-tts-access-token": access_token, "content-type": "application/json"}
        url = self.API_BASE + path
        r = requests.request(method, url, params=params,
                             data=body_str if body is not None else None,
                             headers=headers, timeout=25)
        return r.json()

    def list_products(self, conn: dict, limit: int) -> list[dict]:
        d = self._request("POST", "/product/202309/products/search",
                          conn["access_token"], params={"page_size": min(limit, 100)},
                          body={"page_size": min(limit, 100)},
                          shop_cipher=conn.get("shop_cipher"))
        return ((d.get("data") or {}).get("products")) or [{"raw": d}]

    def list_orders(self, conn: dict, limit: int) -> list[dict]:
        d = self._request("POST", "/order/202309/orders/search",
                          conn["access_token"], params={"page_size": min(limit, 50)},
                          body={"page_size": min(limit, 50)},
                          shop_cipher=conn.get("shop_cipher"))
        return ((d.get("data") or {}).get("orders")) or [{"raw": d}]

    def update_stock(self, conn: dict, sku_id: str, quantity: int) -> dict:
        # product_id cần tra từ sku; ở scaffold gọi endpoint inventory update trực tiếp.
        d = self._request("POST", f"/product/202309/products/{sku_id}/inventory/update",
                          conn["access_token"],
                          body={"skus": [{"id": sku_id, "inventory": [{"quantity": quantity}]}]},
                          shop_cipher=conn.get("shop_cipher"))
        return d


CONNECTORS: dict[str, MarketplaceConnector] = {
    "tiktok_shop": TikTokShop(),
}


def _get_connector(platform: str) -> MarketplaceConnector:
    c = CONNECTORS.get(platform)
    if not c:
        raise MktError(f"Sàn '{platform}' chưa được hỗ trợ. Hiện có: {', '.join(CONNECTORS)}")
    return c


# --------------------------------------------------------------------------- #
# MCP tools                                                                    #
# --------------------------------------------------------------------------- #
@mcp.tool
def mkt_platforms() -> list[dict]:
    """Danh sách sàn đã hỗ trợ connector + trạng thái cấu hình (đã có app_key chưa)."""
    return [{"platform": c.key, "name": c.name, "san_sang": c.configured()}
            for c in CONNECTORS.values()]


@mcp.tool
def mkt_list_connections() -> list[dict]:
    """Liệt kê các sàn CEO đã kết nối (đã cấp quyền shop)."""
    try:
        uid = _current_user_id()
    except MktError as e:
        return [{"error": str(e)}]
    conns = _list_conns(uid)
    return conns or [{"info": "Chưa kết nối sàn nào. Dùng mkt_connect_url để lấy link kết nối."}]


@mcp.tool
def mkt_connect_url(platform: str) -> dict:
    """Trả link để CEO bấm cấp quyền cho SoloCEO trên sàn `platform` (vd 'tiktok_shop').
    CEO mở link → đăng nhập sàn → đồng ý → hệ thống tự lưu kết nối."""
    try:
        uid = _current_user_id()
        c = _get_connector(platform)
    except MktError as e:
        return {"error": str(e)}
    if not c.configured():
        return {"error": f"{c.name} chưa được cấu hình app_key/app_secret trên hệ thống. "
                         "Chủ nền tảng cần đăng ký App trên Open Platform của sàn và nạp khoá."}
    return {"platform": platform, "url": c.authorize_url(_sign_state(uid)),
            "huong_dan": "Gửi link này cho CEO bấm để cấp quyền; xong sẽ tự kết nối."}


@mcp.tool
def mkt_status(platform: str) -> dict:
    """Trạng thái kết nối 1 sàn của CEO (đã kết nối chưa, tên shop, hết hạn khi nào)."""
    try:
        uid = _current_user_id()
        _get_connector(platform)
    except MktError as e:
        return {"error": str(e)}
    conn = _get_conn(uid, platform)
    if not conn:
        return {"platform": platform, "da_ket_noi": False}
    return {"platform": platform, "da_ket_noi": True,
            "shop": conn.get("shop_name"), "region": conn.get("region"),
            "access_het_han": conn.get("access_expires_at")}


@mcp.tool
def mkt_list_products(platform: str, limit: int = 20) -> list[dict]:
    """Liệt kê sản phẩm trên shop của CEO ở sàn `platform`."""
    try:
        uid = _current_user_id()
        c = _get_connector(platform)
    except MktError as e:
        return [{"error": str(e)}]
    conn = _get_conn(uid, platform)
    if not conn:
        return [{"error": f"Chưa kết nối {c.name}. Dùng mkt_connect_url('{platform}')."}]
    try:
        return c.list_products(conn, limit)
    except Exception as e:  # noqa: BLE001
        return [{"error": f"Lỗi gọi API {c.name}: {e}"}]


@mcp.tool
def mkt_list_orders(platform: str, limit: int = 20) -> list[dict]:
    """Liệt kê đơn hàng mới trên shop của CEO ở sàn `platform`."""
    try:
        uid = _current_user_id()
        c = _get_connector(platform)
    except MktError as e:
        return [{"error": str(e)}]
    conn = _get_conn(uid, platform)
    if not conn:
        return [{"error": f"Chưa kết nối {c.name}. Dùng mkt_connect_url('{platform}')."}]
    try:
        return c.list_orders(conn, limit)
    except Exception as e:  # noqa: BLE001
        return [{"error": f"Lỗi gọi API {c.name}: {e}"}]


@mcp.tool
def mkt_update_stock(platform: str, sku_id: str, quantity: int) -> dict:
    """Cập nhật tồn kho 1 SKU trên sàn `platform`. RỦI RO: đổi dữ liệu shop thật —
    chỉ chạy khi CEO đã xác nhận."""
    try:
        uid = _current_user_id()
        c = _get_connector(platform)
    except MktError as e:
        return {"error": str(e)}
    conn = _get_conn(uid, platform)
    if not conn:
        return {"error": f"Chưa kết nối {c.name}."}
    try:
        return {"ok": True, "result": c.update_stock(conn, sku_id, quantity)}
    except Exception as e:  # noqa: BLE001
        return {"error": f"Lỗi cập nhật tồn {c.name}: {e}"}


@mcp.tool
def mkt_disconnect(platform: str) -> dict:
    """Ngắt kết nối 1 sàn của CEO (xoá token đã lưu)."""
    try:
        uid = _current_user_id()
        _get_connector(platform)
    except MktError as e:
        return {"error": str(e)}
    _delete_conn(uid, platform)
    return {"ok": True, "platform": platform}


# --------------------------------------------------------------------------- #
# OAuth callback (HTTP route thường, không phải MCP)                          #
# --------------------------------------------------------------------------- #
@mcp.custom_route("/oauth/{platform}/callback", methods=["GET"])
async def oauth_callback(request: Request):
    platform = request.path_params["platform"]
    code = request.query_params.get("code") or request.query_params.get("auth_code")
    state = request.query_params.get("state", "")
    try:
        uid = _verify_state(state)
        c = _get_connector(platform)
        if not code:
            raise MktError("Sàn không trả code.")
        data = c.exchange_code(code)
        _save_conn(uid, platform, data)
    except Exception as e:  # noqa: BLE001
        return HTMLResponse(
            f"<h3>Kết nối thất bại</h3><p>{e}</p><a href='{WORKSPACE_URL}'>Quay lại</a>",
            status_code=400)
    return RedirectResponse(WORKSPACE_URL + "?connected=" + platform)


@mcp.custom_route("/health", methods=["GET"])
async def health(_request: Request):
    return HTMLResponse("ok")


if __name__ == "__main__":
    try:
        _init_store()
    except Exception as exc:  # noqa: BLE001
        print("WARN init store:", exc)
    mcp.run(transport="http", host="0.0.0.0", port=8000, path="/mcp")
