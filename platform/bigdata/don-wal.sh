#!/bin/bash
# Dồn WAL của bigdata định kỳ.
# Nhiều tiến trình nạp ghi thẳng vào SQLite nên WAL phình rất nhanh (đã thấy 750 MB),
# khiến truy vấn đọc chậm từ 0,2 giây lên 16 giây dù bản thân truy vấn vẫn nhanh.
docker run --rm -v bigdata-data-v3:/data python:3.12-slim python -c "
import sqlite3
c=sqlite3.connect('/data/bigdata.db',timeout=600)
c.execute('PRAGMA wal_checkpoint(TRUNCATE)')
c.close()" 2>/dev/null
