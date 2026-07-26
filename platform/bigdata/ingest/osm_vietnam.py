# -*- coding: utf-8 -*-
"""Trích xuất điểm quan tâm (POI) Việt Nam từ bản trích OpenStreetMap của Geofabrik.

Nguồn: https://download.geofabrik.de/asia/vietnam-latest.osm.pbf
Giấy phép: ODbL 1.0 — © những người đóng góp OpenStreetMap (bắt buộc ghi nhận nguồn).

Chỉ lấy đối tượng CÓ TÊN và có thẻ phân loại có nghĩa với người kinh doanh
(cửa hàng, văn phòng, nhà hàng, trường, bệnh viện, khách sạn, điểm đến…).
Ghi thẳng vào SQLite của bigdata theo đúng lược đồ `items` (upsert theo type+ext_key).
"""
import os
import sqlite3
import sys
from datetime import datetime, timezone

import osmium

DB = os.environ.get("DB_PATH", "/data/bigdata.db")
PBF = os.environ.get("PBF", "/work/vn.osm.pbf")
BATCH = 5000

# ── Bản đồ thẻ OSM → (loại nội bộ, ngành tiếng Việt) ────────────────────────
AMENITY = {
    "restaurant": ("co-so-kinh-doanh", "Ẩm thực & đồ uống", "Nhà hàng"),
    "cafe": ("co-so-kinh-doanh", "Ẩm thực & đồ uống", "Quán cà phê"),
    "fast_food": ("co-so-kinh-doanh", "Ẩm thực & đồ uống", "Đồ ăn nhanh"),
    "bar": ("co-so-kinh-doanh", "Ẩm thực & đồ uống", "Quán bar"),
    "pub": ("co-so-kinh-doanh", "Ẩm thực & đồ uống", "Quán nhậu"),
    "food_court": ("co-so-kinh-doanh", "Ẩm thực & đồ uống", "Khu ẩm thực"),
    "ice_cream": ("co-so-kinh-doanh", "Ẩm thực & đồ uống", "Kem & tráng miệng"),
    "marketplace": ("co-so-kinh-doanh", "Chợ & bán lẻ", "Chợ"),
    "bank": ("co-so-kinh-doanh", "Tài chính & ngân hàng", "Ngân hàng"),
    "bureau_de_change": ("co-so-kinh-doanh", "Tài chính & ngân hàng", "Đổi ngoại tệ"),
    "atm": ("ha-tang", "Tài chính & ngân hàng", "Máy ATM"),
    "fuel": ("co-so-kinh-doanh", "Nhiên liệu & ô tô", "Trạm xăng dầu"),
    "charging_station": ("ha-tang", "Nhiên liệu & ô tô", "Trạm sạc xe điện"),
    "car_wash": ("co-so-kinh-doanh", "Nhiên liệu & ô tô", "Rửa xe"),
    "car_rental": ("co-so-kinh-doanh", "Nhiên liệu & ô tô", "Cho thuê xe"),
    "car_repair": ("co-so-kinh-doanh", "Nhiên liệu & ô tô", "Sửa chữa ô tô"),
    "driving_school": ("co-so-giao-duc", "Giáo dục & đào tạo", "Trường dạy lái xe"),
    "language_school": ("co-so-giao-duc", "Giáo dục & đào tạo", "Trung tâm ngoại ngữ"),
    "school": ("co-so-giao-duc", "Giáo dục & đào tạo", "Trường phổ thông"),
    "kindergarten": ("co-so-giao-duc", "Giáo dục & đào tạo", "Trường mầm non"),
    "college": ("co-so-giao-duc", "Giáo dục & đào tạo", "Cao đẳng"),
    "university": ("co-so-giao-duc", "Giáo dục & đào tạo", "Đại học"),
    "library": ("co-so-giao-duc", "Giáo dục & đào tạo", "Thư viện"),
    "hospital": ("co-so-y-te", "Y tế & sức khỏe", "Bệnh viện"),
    "clinic": ("co-so-y-te", "Y tế & sức khỏe", "Phòng khám"),
    "doctors": ("co-so-y-te", "Y tế & sức khỏe", "Phòng khám bác sĩ"),
    "dentist": ("co-so-y-te", "Y tế & sức khỏe", "Nha khoa"),
    "pharmacy": ("co-so-y-te", "Y tế & sức khỏe", "Nhà thuốc"),
    "veterinary": ("co-so-y-te", "Y tế & sức khỏe", "Thú y"),
    "place_of_worship": ("dia-diem", "Tôn giáo & tín ngưỡng", "Cơ sở thờ tự"),
    "police": ("hanh-chinh", "Hành chính công", "Công an"),
    "fire_station": ("hanh-chinh", "Hành chính công", "Phòng cháy chữa cháy"),
    "townhall": ("hanh-chinh", "Hành chính công", "Trụ sở hành chính"),
    "courthouse": ("hanh-chinh", "Hành chính công", "Tòa án"),
    "post_office": ("hanh-chinh", "Hành chính công", "Bưu điện"),
    "community_centre": ("hanh-chinh", "Hành chính công", "Nhà văn hóa"),
    "cinema": ("co-so-kinh-doanh", "Giải trí", "Rạp chiếu phim"),
    "theatre": ("co-so-kinh-doanh", "Giải trí", "Nhà hát"),
    "nightclub": ("co-so-kinh-doanh", "Giải trí", "Vũ trường"),
    "bus_station": ("ha-tang", "Giao thông vận tải", "Bến xe"),
    "ferry_terminal": ("ha-tang", "Giao thông vận tải", "Bến phà"),
    "parking": ("ha-tang", "Giao thông vận tải", "Bãi đỗ xe"),
    "taxi": ("co-so-kinh-doanh", "Giao thông vận tải", "Điểm taxi"),
    "fitness_centre": ("co-so-kinh-doanh", "Thể thao & rèn luyện", "Phòng tập"),
}
TOURISM = {
    "hotel": ("luu-tru", "Lưu trú", "Khách sạn"),
    "guest_house": ("luu-tru", "Lưu trú", "Nhà nghỉ"),
    "hostel": ("luu-tru", "Lưu trú", "Hostel"),
    "motel": ("luu-tru", "Lưu trú", "Motel"),
    "resort": ("luu-tru", "Lưu trú", "Khu nghỉ dưỡng"),
    "apartment": ("luu-tru", "Lưu trú", "Căn hộ cho thuê"),
    "attraction": ("diem-den", "Du lịch & di tích", "Điểm tham quan"),
    "museum": ("diem-den", "Du lịch & di tích", "Bảo tàng"),
    "viewpoint": ("diem-den", "Du lịch & di tích", "Điểm ngắm cảnh"),
    "artwork": ("diem-den", "Du lịch & di tích", "Tác phẩm nghệ thuật"),
    "theme_park": ("diem-den", "Du lịch & di tích", "Công viên chủ đề"),
    "zoo": ("diem-den", "Du lịch & di tích", "Vườn thú"),
    "information": ("diem-den", "Du lịch & di tích", "Điểm thông tin du lịch"),
}
OFFICE_VI = {
    "company": "Công ty", "government": "Cơ quan nhà nước", "insurance": "Bảo hiểm",
    "estate_agent": "Môi giới bất động sản", "lawyer": "Văn phòng luật",
    "accountant": "Kế toán", "it": "Công nghệ thông tin", "travel_agent": "Đại lý du lịch",
    "financial": "Tài chính", "educational_institution": "Tổ chức giáo dục",
    "logistics": "Logistics", "advertising_agency": "Quảng cáo",
    "employment_agency": "Tuyển dụng", "ngo": "Tổ chức phi chính phủ",
    "association": "Hiệp hội", "construction_company": "Công ty xây dựng",
    "telecommunication": "Viễn thông", "research": "Nghiên cứu",
}
SHOP_VI = {
    "supermarket": "Siêu thị", "convenience": "Cửa hàng tiện lợi", "clothes": "Thời trang",
    "hairdresser": "Cắt tóc & làm đẹp", "bakery": "Tiệm bánh", "mobile_phone": "Điện thoại",
    "car": "Ô tô", "car_repair": "Sửa chữa ô tô", "motorcycle": "Xe máy",
    "furniture": "Nội thất", "hardware": "Vật liệu & dụng cụ", "doityourself": "Vật liệu xây dựng",
    "electronics": "Điện tử", "computer": "Máy tính", "books": "Nhà sách",
    "jewelry": "Trang sức", "optician": "Kính mắt", "shoes": "Giày dép",
    "beauty": "Làm đẹp", "florist": "Hoa tươi", "pet": "Thú cưng",
    "butcher": "Thịt tươi", "greengrocer": "Rau quả", "seafood": "Hải sản",
    "alcohol": "Đồ uống có cồn", "beverages": "Đồ uống", "tea": "Trà",
    "coffee": "Cà phê", "confectionery": "Bánh kẹo", "department_store": "Bách hóa tổng hợp",
    "mall": "Trung tâm thương mại", "laundry": "Giặt là", "travel_agency": "Đại lý du lịch",
    "photo": "Nhiếp ảnh", "sports": "Thể thao", "toys": "Đồ chơi",
    "stationery": "Văn phòng phẩm", "gift": "Quà tặng", "variety_store": "Tạp hóa",
    "chemist": "Hóa mỹ phẩm", "houseware": "Đồ gia dụng", "bicycle": "Xe đạp",
    "tyres": "Lốp xe", "paint": "Sơn", "garden_centre": "Cây cảnh & làm vườn",
    "agrarian": "Vật tư nông nghiệp", "trade": "Vật tư & thương mại",
}
CRAFT_VI = {
    "carpenter": "Mộc", "electrician": "Điện", "plumber": "Nước", "tailor": "May đo",
    "shoemaker": "Đóng giày", "photographer": "Nhiếp ảnh", "painter": "Sơn sửa",
    "blacksmith": "Rèn", "pottery": "Gốm", "brewery": "Nấu bia", "winery": "Rượu vang",
    "beekeeper": "Nuôi ong", "jeweller": "Kim hoàn", "sawmill": "Xưởng cưa",
}
PLACE_VI = {
    "city": "Thành phố", "town": "Thị xã / thị trấn", "village": "Xã / làng",
    "hamlet": "Thôn / xóm", "suburb": "Phường / khu vực", "quarter": "Khu phố",
    "neighbourhood": "Tổ dân phố", "island": "Đảo", "islet": "Đảo nhỏ",
}
HEALTHCARE_VI = {
    "hospital": "Bệnh viện", "clinic": "Phòng khám", "doctor": "Bác sĩ",
    "dentist": "Nha khoa", "pharmacy": "Nhà thuốc", "laboratory": "Xét nghiệm",
    "physiotherapist": "Vật lý trị liệu", "alternative": "Y học cổ truyền",
}
LEISURE_VI = {
    "park": "Công viên", "sports_centre": "Trung tâm thể thao", "pitch": "Sân thể thao",
    "stadium": "Sân vận động", "swimming_pool": "Bể bơi", "fitness_centre": "Phòng tập",
    "golf_course": "Sân golf", "garden": "Vườn", "water_park": "Công viên nước",
}


def classify(t):
    """Trả về (loại, ngành, phân ngành) hoặc None nếu không đáng lưu."""
    v = t.get("amenity")
    if v in AMENITY:
        return AMENITY[v]
    v = t.get("tourism")
    if v in TOURISM:
        return TOURISM[v]
    v = t.get("shop")
    if v:
        return ("co-so-kinh-doanh", "Bán lẻ & dịch vụ", SHOP_VI.get(v, "Cửa hàng " + v.replace("_", " ")))
    v = t.get("office")
    if v:
        return ("co-so-kinh-doanh", "Doanh nghiệp & văn phòng", OFFICE_VI.get(v, "Văn phòng " + v.replace("_", " ")))
    v = t.get("craft")
    if v:
        return ("co-so-kinh-doanh", "Thủ công & sản xuất nhỏ", CRAFT_VI.get(v, v.replace("_", " ")))
    v = t.get("healthcare")
    if v:
        return ("co-so-y-te", "Y tế & sức khỏe", HEALTHCARE_VI.get(v, v.replace("_", " ")))
    v = t.get("leisure")
    if v in LEISURE_VI:
        return ("dia-diem", "Thể thao & giải trí", LEISURE_VI[v])
    v = t.get("place")
    if v in PLACE_VI:
        return ("dia-diem", "Địa phương", PLACE_VI[v])
    if t.get("aeroway") == "aerodrome":
        return ("ha-tang", "Giao thông vận tải", "Sân bay")
    if t.get("railway") == "station":
        return ("ha-tang", "Giao thông vận tải", "Ga đường sắt")
    if t.get("historic"):
        return ("diem-den", "Du lịch & di tích", "Di tích lịch sử")
    if t.get("man_made") in ("bridge", "lighthouse", "water_tower", "works"):
        return ("ha-tang", "Công trình", t.get("man_made"))
    b = t.get("building")
    if b in ("commercial", "retail", "office", "industrial", "warehouse", "hotel"):
        return ("co-so-kinh-doanh", "Bất động sản thương mại", {
            "commercial": "Tòa nhà thương mại", "retail": "Mặt bằng bán lẻ",
            "office": "Tòa nhà văn phòng", "industrial": "Nhà xưởng",
            "warehouse": "Kho bãi", "hotel": "Tòa khách sạn"}[b])
    if t.get("landuse") in ("industrial", "commercial", "retail"):
        return ("bat-dong-san-kcn", "Bất động sản công nghiệp", {
            "industrial": "Khu công nghiệp", "commercial": "Khu thương mại",
            "retail": "Khu bán lẻ"}[t.get("landuse")])
    return None


def region_of(t):
    for k in ("addr:province", "addr:city", "is_in:province", "addr:district", "is_in:city"):
        if t.get(k):
            return t[k]
    return "Việt Nam"


def describe(name, sub, t):
    bits = [sub]
    if t.get("addr:street"):
        addr = " ".join(x for x in (t.get("addr:housenumber"), t.get("addr:street")) if x)
        bits.append("địa chỉ " + addr)
    for k, lbl in (("addr:district", ""), ("addr:city", ""), ("addr:province", "")):
        if t.get(k):
            bits.append(t[k])
    if t.get("brand"):
        bits.append("thương hiệu " + t["brand"])
    if t.get("operator"):
        bits.append("đơn vị vận hành " + t["operator"])
    if t.get("cuisine"):
        bits.append("ẩm thực " + t["cuisine"].replace(";", ", "))
    if t.get("opening_hours"):
        bits.append("giờ mở cửa " + t["opening_hours"])
    if t.get("phone") or t.get("contact:phone"):
        bits.append("có số điện thoại công khai")
    return name + " — " + ", ".join(b for b in bits if b) + "."


class Collector(osmium.SimpleHandler):
    def __init__(self, sink):
        super().__init__()
        self.sink = sink
        self.buf = []
        self.n = 0
        self.seen = set()

    def take(self, o, kind):
        t = dict(o.tags)
        name = t.get("name:vi") or t.get("name")
        if not name or len(name) < 2 or len(name) > 200:
            return
        c = classify(t)
        if not c:
            return
        typ, cat, sub = c
        key = "osm-%s%d" % (kind, o.id)
        if key in self.seen:
            return
        self.seen.add(key)
        tags = [v for v in (t.get("brand"), t.get("operator"), t.get("cuisine"),
                            t.get("addr:district"), t.get("addr:city"), t.get("addr:province"),
                            sub) if v]
        self.buf.append((
            typ, "osm-vietnam", key, name,
            t.get("website") or t.get("contact:website") or "",
            describe(name, sub, t), sub, cat, sub, region_of(t),
            ", ".join(tags)[:400],
        ))
        self.n += 1
        if len(self.buf) >= BATCH:
            self.sink(self.buf)
            self.buf = []

    def node(self, o):
        self.take(o, "n")

    def way(self, o):
        self.take(o, "w")

    def relation(self, o):
        self.take(o, "r")


SQL = """INSERT INTO items(type,source,ext_key,name,url,description,oneliner,category,subcategory,region,tags,
                           year,batch,status,outcome,team_size,logo,top,stage,score,published,updated_at)
VALUES(?,?,?,?,?,?,?,?,?,?,?, NULL,'','','',NULL,'',0,'',0,'',?)
ON CONFLICT(type,ext_key) DO UPDATE SET
 name=excluded.name,url=excluded.url,description=excluded.description,oneliner=excluded.oneliner,
 category=excluded.category,subcategory=excluded.subcategory,region=excluded.region,tags=excluded.tags,
 updated_at=excluded.updated_at"""


def main():
    con = sqlite3.connect(DB, timeout=120)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    now = datetime.now(timezone.utc).isoformat()
    total = [0]

    def sink(rows):
        con.executemany(SQL, [r + (now,) for r in rows])
        con.commit()
        total[0] += len(rows)
        print("  đã ghi %d" % total[0], flush=True)

    h = Collector(sink)
    print("đọc %s …" % PBF, flush=True)
    h.apply_file(PBF, locations=False)
    if h.buf:
        sink(h.buf)
    print("XONG: %d bản ghi POI Việt Nam" % total[0], flush=True)
    con.close()


if __name__ == "__main__":
    sys.exit(main())
