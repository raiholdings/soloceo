#!/bin/bash
# Thu thập định kỳ: nguồn công khai → Crawl4AI → Markdown → bigdata
exec docker run --rm --name crawl-sync --network coolify \
  -v /opt/crawl-sync:/work -v bigdata-data-v3:/data \
  -e DB_PATH=/data/bigdata.db \
  -e CRAWL4AI_API_TOKEN="$(cat /opt/crawl4ai/.token)" \
  -e REFRESH_TOKEN="$(cat /opt/bigdata/.refreshtoken)" \
  -e MOI_NGUON="${1:-10}" -e CHI_NHOM="${2:-}" \
  python:3.12-slim python /work/sync.py
