#!/bin/bash
# Danh bạ doanh nghiệp Việt Nam theo ngành — giữ đúng Crawl-delay 5s của trangvangvietnam.com
exec docker run --rm --name tv-sync --network coolify \
  -v /opt/crawl-sync:/work -v bigdata-data-v3:/data \
  -e DB_PATH=/data/bigdata.db \
  -e CRAWL4AI_API_TOKEN="$(cat /opt/crawl4ai/.token)" \
  -e REFRESH_TOKEN="$(cat /opt/bigdata/.refreshtoken)" \
  -e SO_NGANH="${1:-40}" -e NHIP=5 \
  python:3.12-slim python /work/trangvang.py
