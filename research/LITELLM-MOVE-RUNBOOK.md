# Dời LiteLLM core-01 → tenant-02 (gỡ nghẽn RAM) — RUNBOOK

**Trạng thái:** CHỜ việc tay chủ dự án (đổi DNS). Chưa chạy.
**Lý do:** core-01 chỉ ~11GB RAM + swap; LiteLLM ngốn ~3.9GB. tenant-02 (94GB) rộng hơn.

## Chặn cứng (§2.A — việc tay chủ dự án)
Đổi DNS `llm.soloceo.vn` A-record: **194.233.72.150 (core-01) → 194.233.85.255 (tenant-02)**.
Cloudflare proxy: TẮT khi cấp SSL lần đầu trên tenant-02, bật lại sau.
→ Claude Code KHÔNG có Cloudflare credential nên không tự đổi được. Đây là mắt xích bắt buộc.

## Thứ tự (sau khi DNS trỏ tenant-02)
1. **Backup DB LiteLLM** (virtual keys + budget) trên core-01:
   ```bash
   docker exec postgres-in0rczajeip1r7y4081msker pg_dump -U litellm litellm > /root/litellm-db-$(date +%s).sql
   ```
   (kiểm tra tên user/db thực tế: `docker exec postgres-in0rcz... env | grep POSTGRES`)
2. **Dựng LiteLLM trên tenant-02** (Coolify hoặc docker-compose): cùng image, cùng `config.yaml`
   (`infra/litellm/config.yaml`), cùng env (`LITELLM_MASTER_KEY`, `ANTHROPIC_API_KEY`, `LITELLM_DB_URL`,
   `LANGFUSE_*`, `DLP_HOOK_MODE`, `SVC_DLP_URL`). Restore DB dump vào Postgres tenant-02.
3. **Đưa svc-dlp + svc-rules-engine sang tenant-02** (2 image Go nhẹ) hoặc trỏ chéo qua mạng nội bộ.
   Hook DLP `SVC_DLP_URL` phải reachable.
4. **Cấp SSL** llm.soloceo.vn trên tenant-02 (Traefik/Let's Encrypt).
5. **Verify TỪNG service gọi LLM còn chạy:**
   - DeerFlow gateway: gửi 1 tin nhắn → có phản hồi.
   - Sandbox tool call → LLM OK.
   - Dolphin (dolphin-docs) đọc CCCD → JSON.
   - Langfuse nhận trace mới.
   - Virtual key `org-openclawos` còn budget/metadata (key/info).
6. **Tắt LiteLLM cũ trên core-01** (giữ container stopped 7 ngày trước khi xoá).

## Rollback
Đổi DNS về core-01 + bật lại LiteLLM cũ (chưa xoá). Vì mọi service trỏ theo domain
`llm.soloceo.vn`, chỉ cần DNS quay lại là khôi phục — không sửa code service.

## Rủi ro
- Trong lúc chuyển, mọi lời gọi LLM gián đoạn → làm giờ thấp điểm.
- Virtual key budget phải khớp DB restore (nếu lệch, key mới sinh lại + cập nhật secrets api-core).
