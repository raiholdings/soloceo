# Sự cố bảo mật: các CEO bị gộp chung một tài khoản workspace

**Ngày phát hiện:** 26/07/2026 · **Người báo:** Thư (thấy hội thoại lạ trong workspace)
**Mức độ:** Nghiêm trọng — lộ nội dung hội thoại giữa các tài khoản.
**Trạng thái:** Đã chặn và vá.

## Điều gì đã xảy ra

Khi CEO đăng nhập workspace qua `my.soloceo.vn`, cầu OIDC ở api-core sinh danh tính
(`sub`) bằng `String(user.user_id)`. WoWonder **không phải lúc nào cũng trả `user_id`**
(có endpoint chỉ trả `id`), nên `String(undefined)` cho ra chuỗi **`"undefined"`**.

Workspace tra tài khoản theo cặp `(nhà cung cấp, sub)`. Vì mọi CEO đều nhận
`sub = "undefined"`, CEO đăng nhập sau **khớp đúng bản ghi tài khoản của CEO trước**
và vào thẳng workspace của người đó — thấy toàn bộ hội thoại.

## Bằng chứng

| Kiểm tra | Kết quả |
|---|---|
| `users.oauth_id` trong DeerFlow | `"undefined"` (chuỗi, không phải rỗng) |
| Tài khoản CEO trên my.soloceo.vn | **7** |
| Tài khoản trong workspace | **1** (`soloceo.vn@gmail.com`) |
| Hội thoại | 21, tất cả gắn vào 1 tài khoản đó |
| Mã nguồn | `apps/api-core/src/oidc/oidc.service.ts`: `sub: String(user.user_id)` — không có phương án dự phòng, dù chỗ khác trong cùng dự án đã dùng `user_id ?? id ?? username` |

Lưu ý: phần phân tách dữ liệu phía workspace **hoạt động đúng** — truy vấn luôn lọc
theo chủ sở hữu, và các khoá `user_id`/`owner_id` do client gửi lên đều bị tước bỏ.
Lỗi nằm ở chỗ mọi người **được cấp cùng một danh tính**.

## Đã xử lý

1. **Chặn ngay (dữ liệu):** gán lại `oauth_id = "1"` cho tài khoản hiện có (đúng
   `user_id` của tài khoản `soloceo` trên WoWonder), có sao lưu
   `deerflow.db.bak-<timestamp>`. Từ thời điểm này, CEO khác đăng nhập sẽ không còn
   khớp vào tài khoản cũ.
2. **Vá mã nguồn** (`apps/api-core/src/oidc/oidc.service.ts`):
   - danh tính lấy theo `user_id → id → username`; thiếu cả ba thì **từ chối đăng nhập**;
   - chốt chặn ở `/token`: `sub` rỗng / `"undefined"` / `"null"` → trả lỗi 400.
3. **Vá nóng bản đang chạy** trong container api-core + khởi động lại (đã kiểm chứng
   `api.soloceo.vn` và OIDC discovery trả 200).

## Việc cần làm tiếp

- [ ] Build lại api-core từ nhánh chính để bản vá nóng được thay bằng bản build chuẩn.
- [ ] Mỗi CEO đăng nhập lại một lượt → xác nhận mỗi người sinh **một tài khoản riêng**
      (kiểm tra bảng `users` phải tăng dần theo số CEO).
- [ ] Thêm ràng buộc dữ liệu: chặn ghi `oauth_id` rỗng/`"undefined"` ở tầng lưu trữ.
- [ ] Cân nhắc thông báo cho các CEO đã đăng nhập trong giai đoạn lỗi, vì hội thoại
      của họ có thể đã hiển thị cho người khác.

## Nơi lưu dữ liệu (trả lời câu hỏi kèm theo)

| Dữ liệu | Nơi lưu |
|---|---|
| Tài khoản + hội thoại workspace | **SQLite** `deerflow.db` trên tenant-02, gắn ngoài tại `/opt/deerflow/backend/.deer-flow/` (bền vững qua rebuild) |
| Tài khoản cộng đồng (CEO gốc) | **MariaDB** WoWonder trên tenant-01 |
| Nghiệp vụ nền tảng (org, venture, giao dịch) | **PostgreSQL** của api-core trên core-01 |
| CRM từng CEO | **MariaDB** Perfex trên tenant-03 (mỗi CEO một cơ sở dữ liệu) |
| Bộ não thứ 2 | **SQLite** `bigdata.db` trên tenant-03 (volume `bigdata-data-v3`) |
| Supabase (`supabase.soloceo.vn`) | Có chạy, thuộc **lớp dữ liệu dùng chung** — workspace **không** dùng để lưu tài khoản/hội thoại |
