"""SoloCEO BigData MCP — "Bộ não thứ 2" cho trợ lý AI DeerFlow.

Cho agent CEO KHAI THÁC dữ liệu thực từ Data Engine bigdata.soloceo.vn:
startup toàn cầu, doanh nghiệp 57 quốc gia, nhà sáng lập & CEO, công nghệ,
tin tức, dataset, và tri thức Việt Nam (luật, chuẩn mực kế toán VAS, ngành
VSIC, địa phương, đặc sản, du lịch) — phục vụ phân tích thị trường, ngách,
thương hiệu, đối thủ cho doanh nghiệp một người.

Dữ liệu CÔNG KHAI (không PII cá nhân) → MCP không cần token per-CEO.
Proxy sang HTTP API của Data Engine (đã chuẩn hóa + chấm chất lượng).
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request

from fastmcp import FastMCP

BASE = os.environ.get("BIGDATA_BASE", "https://bigdata.soloceo.vn").rstrip("/")
UA = "SoloCEO-BigData-MCP/1.0"

mcp = FastMCP("soloceo-bigdata")


def _get(path: str) -> dict:
    req = urllib.request.Request(BASE + path, headers={"user-agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))


def _post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"user-agent": UA, "content-type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


LOAI = ("startup", "company", "founder", "ceo", "technology", "news", "dataset",
        "dia-phuong", "dac-san", "du-lich", "luat", "ke-toan", "nganh-vsic")


@mcp.tool
def tra_cuu_du_lieu(tu_khoa: str = "", loai: str = "", quoc_gia: str = "",
                    nganh: str = "", gioi_han: int = 20) -> dict:
    """Tra cứu Bộ não thứ 2 (bigdata.soloceo.vn) — tìm startup, doanh nghiệp, nhà sáng lập,
    CEO, công nghệ, tin tức, luật VN, chuẩn mực kế toán VAS, ngành VSIC, địa phương/đặc sản/du lịch VN.

    Dùng khi CEO cần: khảo sát đối thủ/thị trường, tìm mô hình tương tự, tra ngành/luật/kế toán VN,
    hiểu ngách. Trả về danh sách bản ghi (tên, mô tả, ngành, quốc gia, năm, trạng thái, nguồn).

    tu_khoa: từ khóa tìm (vd "fintech", "logistics", "Luật Doanh nghiệp", "SABECO").
    loai: lọc theo loại — một trong: startup, company, founder, ceo, technology, news, dataset,
          dia-phuong, dac-san, du-lich, luat, ke-toan, nganh-vsic (để trống = tất cả).
    quoc_gia: lọc theo quốc gia (vd "Việt Nam", "Hoa Kỳ").
    nganh: lọc theo ngành/danh mục.
    gioi_han: số kết quả tối đa (mặc định 20, tối đa 200).
    """
    if loai and loai not in LOAI:
        return {"error": f"loai không hợp lệ. Chọn: {', '.join(LOAI)}"}
    q = urllib.parse.urlencode({
        "q": tu_khoa or "", "type": loai or "", "region": quoc_gia or "",
        "category": nganh or "", "limit": min(int(gioi_han or 20), 200),
    })
    try:
        d = _get("/api/search?" + q)
        return {"so_ket_qua": d.get("count", 0), "ket_qua": d.get("results", [])}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


@mcp.tool
def xem_chi_tiet(id: int) -> dict:
    """Xem hồ sơ chi tiết một bản ghi (theo id lấy từ tra_cuu_du_lieu) — kèm nội dung
    làm giàu: README GitHub (công nghệ), trích Wikipedia tiếng Việt (DN/người), và các
    mục liên quan cùng ngành. Dùng khi cần đào sâu 1 công ty/người/công nghệ cụ thể."""
    try:
        d = _get(f"/api/item/{int(id)}")
        return d
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


@mcp.tool
def phan_tich_y_tuong(y_tuong: str) -> dict:
    """AI phân tích một Ý TƯỞNG khởi nghiệp so với các startup tương tự trong CSDL:
    đã có ai làm chưa, bài học thành/bại, mức độ cạnh tranh & khoảng trống, khuyến nghị cho Solo CEO.
    Dùng khi CEO đưa ra ý tưởng và muốn thẩm định nhanh dựa trên dữ liệu thực."""
    if not y_tuong or len(y_tuong.strip()) < 3:
        return {"error": "Nhập ý tưởng dài hơn."}
    try:
        d = _post("/api/ask", {"idea": y_tuong.strip()})
        return {"phan_tich": d.get("answer", ""),
                "startup_tuong_tu": [{"ten": m.get("name"), "nganh": m.get("category"),
                                      "trang_thai": m.get("status")} for m in d.get("matches", [])]}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


@mcp.tool
def thong_ke_data_engine() -> dict:
    """Xem phương pháp + số liệu của SoloCEO Data Engine: tổng bản ghi, nguồn & giấy phép,
    điểm chất lượng, độ phủ (quốc gia/ngành/loại), lịch cập nhật. Dùng để hiểu phạm vi
    dữ liệu đang có trước khi tra cứu."""
    try:
        d = _get("/api/engine")
        return {
            "ten": d.get("ten"), "khau_hieu": d.get("khau_hieu"),
            "tong_ban_ghi": d.get("tong_ban_ghi"),
            "nguon": [{"ten": s.get("ten"), "so_luong": s.get("so_luong"), "giay_phep": s.get("license")}
                      for s in d.get("nguon", [])],
            "chat_luong": d.get("chat_luong"), "do_phu": d.get("do_phu"),
            "cap_nhat": d.get("cap_nhat"),
        }
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000, path="/mcp")
