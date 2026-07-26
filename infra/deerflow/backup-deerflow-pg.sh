#!/bin/bash
D=/opt/backups/deerflow-pg
F=$D/deerflow-$(date +%Y%m%d-%H%M).sql.gz
docker exec supabase-db pg_dump -U postgres -d deerflow --no-owner 2>/dev/null | gzip > "$F"
# giữ 14 bản gần nhất
ls -1t $D/deerflow-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
# cảnh báo nếu file quá nhỏ (dump lỗi)
SZ=$(stat -c%s "$F" 2>/dev/null || echo 0)
[ "$SZ" -lt 10000 ] && echo "$(date) CẢNH BÁO: dump deerflow chỉ $SZ bytes" >> $D/backup.log
