# -*- coding: utf-8 -*-
"""Chốt sổ sau khi nạp dữ liệu: dựng lại chỉ mục tìm kiếm và dọn dẹp.

Các bộ nạp ghi thẳng vào SQLite nên chỉ mục toàn văn (FTS5, kiểu external-content)
không tự cập nhật. Phải dựng lại thì ô tra cứu mới thấy dữ liệu mới.
Việc dựng lại mạng tri thức (edges) do endpoint /api/admin/build-graph của dịch vụ lo.
"""
import os
import sqlite3
import time

DB = os.environ.get("DB_PATH", "/data/bigdata.db")

con = sqlite3.connect(DB, timeout=600)
con.execute("PRAGMA journal_mode=WAL")

tong = con.execute("SELECT count(*) FROM items").fetchone()[0]
print("tổng bản ghi: %s" % format(tong, ",d").replace(",", "."), flush=True)

print("→ dọn bản ghi rỗng (không tên)", flush=True)
n = con.execute("DELETE FROM items WHERE name IS NULL OR trim(name)=''").rowcount
con.commit()
print("  đã xoá %d" % n, flush=True)

print("→ dựng lại chỉ mục toàn văn (có thể mất vài phút)", flush=True)
t0 = time.time()
con.execute("INSERT INTO items_fts(items_fts) VALUES('rebuild')")
con.commit()
print("  xong sau %.0f giây" % (time.time() - t0), flush=True)

print("→ tối ưu tệp cơ sở dữ liệu", flush=True)
con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
con.execute("ANALYZE")
con.commit()

print("\nPhân bố theo nguồn:")
for src, n in con.execute("SELECT source,count(*) c FROM items GROUP BY source ORDER BY c DESC LIMIT 20"):
    print("  %-22s %s" % (src, format(n, ",d").replace(",", ".")))

print("\nPhân bố theo loại (10 nhóm lớn nhất):")
for t, n in con.execute("SELECT type,count(*) c FROM items GROUP BY type ORDER BY c DESC LIMIT 10"):
    print("  %-22s %s" % (t, format(n, ",d").replace(",", ".")))

vn = con.execute("SELECT count(*) FROM items WHERE region LIKE '%iệt Nam%' OR source LIKE '%-vn' OR source LIKE '%vietnam%' OR source='wikipedia-vi'").fetchone()[0]
print("\nBản ghi thuộc lớp Việt Nam: %s (%.0f%%)" % (
    format(vn, ",d").replace(",", "."), 100.0 * vn / max(tong, 1)))
con.close()
