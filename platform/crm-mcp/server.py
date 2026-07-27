"""SoloCEO CRM MCP server.

Cho phép mọi trợ lý AI / chat trong DeerFlow thao tác CRM (Perfex) ĐÚNG dữ liệu
của từng CEO. Mỗi lời gọi tool mang header `X-Ceo-Token` (do interceptor DeerFlow
ký từ user_id CEO đang chat). Server verify token → user_id → tenant deterministic
`c{sha256(user_id)[:15]}` → DB `tenant_{name}` → truy vấn/chèn có phạm vi.

Không cần quản lý API key REST per-tenant: server nối thẳng perfex-db (cùng mạng
docker `coolify` trên tenant-03) và tra `tblclient_plan.tenants_db` để chọn đúng DB.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import time

import pymysql
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_headers

MCP_SECRET = os.environ["CRM_MCP_SECRET"].encode()
DB_HOST = os.environ.get("PERFEX_DB_HOST", "perfex-db")
DB_PORT = int(os.environ.get("PERFEX_DB_PORT", "3306"))
DB_USER = os.environ.get("PERFEX_DB_USER", "root")
DB_PASS = os.environ["PERFEX_DB_PASS"]
MAIN_DB = os.environ.get("PERFEX_MAIN_DB", "perfex")

mcp = FastMCP("soloceo-crm")


# --------------------------------------------------------------------------- #
# Xác thực token + phân giải tenant                                           #
# --------------------------------------------------------------------------- #
class CrmError(Exception):
    pass


def _current_user_id() -> str:
    headers = get_http_headers()
    token = headers.get("x-ceo-token") or headers.get("X-Ceo-Token")
    if not token:
        raise CrmError("Thiếu danh tính CEO (X-Ceo-Token). Không xác định được CRM.")
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        user_id, exp_s, sig = raw.rsplit("|", 2)
    except Exception as exc:  # noqa: BLE001
        raise CrmError("Token CEO không hợp lệ.") from exc
    expected = hmac.new(MCP_SECRET, f"{user_id}|{exp_s}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise CrmError("Chữ ký token CEO sai.")
    if int(exp_s) < int(time.time()):
        raise CrmError("Token CEO đã hết hạn.")
    return user_id


def _tenant_name(user_id: str) -> str:
    return "c" + hashlib.sha256(user_id.encode()).hexdigest()[:15]


def _connect(db: str) -> pymysql.connections.Connection:
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS,
        database=db, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
        autocommit=True, connect_timeout=8,
    )


def _tenant_db(user_id: str) -> str:
    """Tra DB của CEO; nếu chưa provision thì báo lỗi thân thiện."""
    tname = _tenant_name(user_id)
    with _connect(MAIN_DB) as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT tenants_db FROM tblclient_plan WHERE tenants_name=%s LIMIT 1", (tname,)
        )
        row = cur.fetchone()
    if not row or not row["tenants_db"]:
        raise CrmError(
            "CRM của bạn chưa được khởi tạo. Hãy mở soloceo.vn/workspace/crm một lần "
            "để hệ thống tạo CRM riêng, rồi thử lại."
        )
    return row["tenants_db"]


def _q(user_id_db, sql, params=(), *, write=False):
    with _connect(user_id_db) as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        if write:
            return cur.lastrowid
        return cur.fetchall()


def _guard():
    """Trả (user_id, tenant_db) hoặc ném CrmError (được bọc thành text ở tool)."""
    uid = _current_user_id()
    return uid, _tenant_db(uid)


# --------------------------------------------------------------------------- #
# Tools — đọc                                                                  #
# --------------------------------------------------------------------------- #
@mcp.tool
def crm_summary() -> dict:
    """Tổng quan CRM của CEO: số khách hàng, lead, hoá đơn, task, dự án và doanh thu."""
    try:
        _, db = _guard()
    except CrmError as e:
        return {"error": str(e)}
    clients = _q(db, "SELECT COUNT(*) n FROM tblclients")[0]["n"]
    leads = _q(db, "SELECT COUNT(*) n FROM tblleads")[0]["n"]
    inv = _q(db, "SELECT COUNT(*) n, COALESCE(SUM(total),0) t FROM tblinvoices WHERE status!=5")[0]
    paid = _q(db, "SELECT COALESCE(SUM(total),0) t FROM tblinvoices WHERE status=2")[0]["t"]
    tasks = _q(db, "SELECT COUNT(*) n FROM tbltasks WHERE status!=5")[0]["n"]
    projects = _q(db, "SELECT COUNT(*) n FROM tblprojects")[0]["n"]
    return {
        "khach_hang": clients, "lead": leads,
        "hoa_don": inv["n"], "tong_hoa_don": float(inv["t"]), "da_thanh_toan": float(paid),
        "task_dang_mo": tasks, "du_an": projects,
    }


@mcp.tool
def crm_list_customers(limit: int = 20, search: str = "") -> list[dict]:
    """Liệt kê khách hàng (công ty). `search` lọc theo tên công ty."""
    try:
        _, db = _guard()
    except CrmError as e:
        return [{"error": str(e)}]
    limit = max(1, min(limit, 100))
    if search:
        rows = _q(db,
            "SELECT userid AS id, company, phonenumber, vat, city, active, datecreated "
            "FROM tblclients WHERE company LIKE %s ORDER BY userid DESC LIMIT %s",
            (f"%{search}%", limit))
    else:
        rows = _q(db,
            "SELECT userid AS id, company, phonenumber, vat, city, active, datecreated "
            "FROM tblclients ORDER BY userid DESC LIMIT %s", (limit,))
    return rows


@mcp.tool
def crm_list_leads(limit: int = 20) -> list[dict]:
    """Liệt kê lead (khách tiềm năng) mới nhất."""
    try:
        _, db = _guard()
    except CrmError as e:
        return [{"error": str(e)}]
    limit = max(1, min(limit, 100))
    return _q(db,
        "SELECT id, name, company, email, phonenumber, status, source, dateadded "
        "FROM tblleads ORDER BY id DESC LIMIT %s", (limit,))


@mcp.tool
def crm_list_invoices(limit: int = 20) -> list[dict]:
    """Liệt kê hoá đơn mới nhất (status: 1=nháp,2=đã thanh toán,3=chưa TT,4=quá hạn,5=huỷ,6=một phần)."""
    try:
        _, db = _guard()
    except CrmError as e:
        return [{"error": str(e)}]
    limit = max(1, min(limit, 100))
    return _q(db,
        "SELECT id, formatted_number AS so, total, currency, status, date, duedate "
        "FROM tblinvoices ORDER BY id DESC LIMIT %s", (limit,))


@mcp.tool
def crm_list_tasks(limit: int = 20) -> list[dict]:
    """Liệt kê công việc (task) mới nhất (status: 1=chưa bắt đầu,4=đang làm,5=hoàn tất)."""
    try:
        _, db = _guard()
    except CrmError as e:
        return [{"error": str(e)}]
    limit = max(1, min(limit, 100))
    return _q(db,
        "SELECT id, name, priority, status, startdate, duedate, dateadded "
        "FROM tbltasks ORDER BY id DESC LIMIT %s", (limit,))


@mcp.tool
def crm_list_projects(limit: int = 20) -> list[dict]:
    """Liệt kê dự án."""
    try:
        _, db = _guard()
    except CrmError as e:
        return [{"error": str(e)}]
    limit = max(1, min(limit, 100))
    return _q(db,
        "SELECT id, name, status, start_date, deadline, project_created "
        "FROM tblprojects ORDER BY id DESC LIMIT %s", (limit,))


# --------------------------------------------------------------------------- #
# Tools — ghi                                                                  #
# --------------------------------------------------------------------------- #
@mcp.tool
def crm_create_customer(company: str, email: str = "", phone: str = "", contact_name: str = "") -> dict:
    """Tạo khách hàng mới (công ty) + liên hệ chính. Trả id khách hàng."""
    try:
        _, db = _guard()
    except CrmError as e:
        return {"error": str(e)}
    if not company.strip():
        return {"error": "Cần tên công ty."}
    cid = _q(db,
        "INSERT INTO tblclients (company, phonenumber, active, datecreated) "
        "VALUES (%s,%s,1,NOW())", (company.strip(), phone), write=True)
    if email or contact_name:
        parts = (contact_name or company).split(" ", 1)
        fn, ln = parts[0], (parts[1] if len(parts) > 1 else "")
        _q(db,
            "INSERT INTO tblcontacts (userid, is_primary, firstname, lastname, email, "
            "phonenumber, datecreated) VALUES (%s,1,%s,%s,%s,%s,NOW())",
            (cid, fn, ln, email, phone), write=True)
    return {"ok": True, "id": cid, "company": company.strip()}


@mcp.tool
def crm_create_lead(name: str, email: str = "", phone: str = "", company: str = "", note: str = "") -> dict:
    """Tạo lead (khách tiềm năng) mới. Trả id lead."""
    try:
        _, db = _guard()
    except CrmError as e:
        return {"error": str(e)}
    if not name.strip():
        return {"error": "Cần tên lead."}
    st = _q(db, "SELECT id FROM tblleads_status ORDER BY statusorder ASC LIMIT 1")
    sr = _q(db, "SELECT id FROM tblleads_sources ORDER BY id ASC LIMIT 1")
    status = st[0]["id"] if st else 0
    source = sr[0]["id"] if sr else 0
    lid = _q(db,
        "INSERT INTO tblleads (name, company, email, phonenumber, description, status, "
        "source, addedfrom, dateadded, leadorder, hash) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,0,NOW(),0,%s)",
        (name.strip(), company, email, phone, note, status, source,
         hashlib.md5(f"{name}{time.time()}".encode()).hexdigest()), write=True)
    return {"ok": True, "id": lid, "name": name.strip()}


@mcp.tool
def crm_create_task(name: str, description: str = "", duedate: str = "") -> dict:
    """Tạo công việc (task). `duedate` dạng YYYY-MM-DD (tuỳ chọn). Trả id task."""
    try:
        _, db = _guard()
    except CrmError as e:
        return {"error": str(e)}
    if not name.strip():
        return {"error": "Cần tên công việc."}
    due = duedate.strip() or None
    tid = _q(db,
        "INSERT INTO tbltasks (name, description, priority, status, startdate, duedate, "
        "dateadded, addedfrom, is_added_from_contact, billable, visible_to_client) "
        "VALUES (%s,%s,2,1,CURDATE(),%s,NOW(),0,0,0,0)",
        (name.strip(), description, due), write=True)
    return {"ok": True, "id": tid, "name": name.strip()}


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000, path="/mcp")
