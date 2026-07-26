# Sự cố bảo mật: mã độc đào tiền ảo trên tenant-01

**Ngày phát hiện:** 26/07/2026 · **Trạng thái:** đã chặn và dọn sạch
**Mức độ:** Nghiêm trọng — thực thi mã từ xa trong container, chiếm 14/18 nhân CPU suốt ~2 ngày

## Phát hiện thế nào

Không ai báo. Nó lộ ra khi thêm phần **đo tài nguyên máy chủ** cho Admin Console: tenant-01
có tải 58,66 trên 18 nhân trong khi RAM chỉ 18% và ổ đĩa 31%. Ngưỡng cảnh báo lúc đó chỉ xét
RAM và ổ đĩa nên không bắt được — **bài học đầu tiên: tải CPU phải là một ngưỡng riêng.**

## Mã độc

| Hạng mục | Chi tiết |
|---|---|
| Tiến trình | 5 bản `cpu-logind` — **giả tên** `systemd-logind` của hệ thống |
| CPU | ~1.400% tổng cộng (14/18 nhân) |
| Tệp thực thi | `/var/tmp/cpu-logind` — **đã xoá khỏi ổ nhưng vẫn chạy** (né quét tệp) |
| Tham số | `-c config.json` |
| Chạy từ | Bản lâu nhất 1 ngày 15 giờ 57 phút → khoảng 24/07 |
| Máy chủ đào | `45.86.86.254:443` (giả cổng HTTPS) |
| Ví / worker | `checknit1111` |
| Thuật toán | `rx/0` (RandomX → Monero) |

## Đường vào

Tiến trình cha là `next-server` **bên trong container**
`s10dbc12f56ognj08tc6n1t2` — ảnh `localhost:5000/soloceo/commerce-starter:latest`,
**Next.js 15.1.6**, phục vụ `solo-ceo-demo-shop.app.soloceo.vn`, khởi chạy 23/07 13:26.
Kẻ tấn công thực thi mã từ xa qua ứng dụng demo này rồi thả miner vào `/var/tmp`.

**Điều may:** container **không có đặc quyền** (`Privileged=false`), **không mount
`docker.sock`**, **không mount thư mục nào của máy chủ** → không có đường thoát ra máy chủ
qua các lối thông thường. Kiểm tra máy chủ xác nhận: cron sạch, không có systemd unit lạ,
`authorized_keys` chỉ có 2 khoá hợp lệ (khoá triển khai + khoá Coolify), `/tmp` `/var/tmp`
`/dev/shm` không còn tệp lạ. **Ba máy còn lại (core-01, tenant-02, tenant-03) không nhiễm.**

Rủi ro còn lại cần lưu ý: container nằm trên mạng `coolify` nên **về lý thuyết** chạm được
các container khác trên tenant-01 (MariaDB của my.soloceo.vn, news, chat). Không thấy dấu
hiệu truy cập, nhưng đây là lý do phải đổi mật khẩu (xem phần còn lại).

## Đã xử lý (26/07/2026)

1. **Giữ bằng chứng** trước khi diệt — tệp thực thi chỉ còn trong bộ nhớ nên sao từ
   `/proc/<pid>/exe`. Lưu tại `/root/su-co-2026-07-26/` trên tenant-01: 2 bản binary
   (8,35 MB), `config.json`, log container, thông tin tiến trình.
2. **Cắt mạng container** khỏi `coolify` trước, rồi mới dừng — tránh nó kịp phản ứng.
3. **Diệt 5 tiến trình**, xoá container.
4. **Xoá hẳn ứng dụng khỏi Coolify** (id 18) để không tự dựng lại; tên miền trả 503.
5. **Xoá ảnh Docker độc** khỏi registry nội bộ.
6. **Chặn máy chủ đào ở tường lửa** trên **cả 4 máy** (OUTPUT + FORWARD), giữ qua khởi
   động lại bằng dịch vụ systemd `chan-pool-dao.service`.
7. **Thêm phát hiện vào giám sát**: `infra/monitor/thu-thap-tai-nguyen.sh` nay đếm tiến
   trình đào (`cpu-logind|xmrig|kdevtmpfsi|kinsing|masscan`) và **báo nguy cấp ngay** khi
   thấy, không cần chờ vượt ngưỡng; đồng thời thêm ngưỡng tải CPU (2× số nhân = cảnh báo,
   4× = nguy cấp).

**Kết quả:** tải tenant-01 từ **59 xuống 7,8**. Không còn tiến trình đào trên cả 4 máy.

## Việc còn lại (cần chủ hệ thống quyết)

- [ ] **Đổi mật khẩu/khoá mà container đó có thể chạm tới** trên mạng `coolify` của
      tenant-01: MariaDB WoWonder, DB của news và chat. Chưa thấy dấu hiệu bị truy cập
      nhưng nguyên tắc xử lý xâm nhập là coi như đã lộ.
- [ ] **Rà các ảnh Next.js khác** trong hệ thống — nếu cùng nền `commerce-starter` hoặc
      cùng phiên bản Next.js thì có cùng lỗ hổng.
- [ ] Cân nhắc **giới hạn CPU cho container demo** (`--cpus`) để lần sau mã độc không thể
      chiếm cả máy, và **tách mạng** container demo khỏi mạng có CSDL.

## Bài học ghi lại

1. **Giám sát chỉ đo RAM và ổ đĩa là chưa đủ.** Máy này RAM 18%, ổ đĩa 31% — mọi chỉ số
   "xanh" trong khi 14/18 nhân đang đào coin cho người khác suốt 2 ngày.
2. **Tên tiến trình giống hệ thống là dấu hiệu, không phải bằng chứng vô tội.**
   `cpu-logind` khác `systemd-logind` đúng một chữ.
3. **Tệp bị xoá mà tiến trình vẫn chạy** = cố tình né. Phải sao bằng chứng từ
   `/proc/<pid>/exe` TRƯỚC khi diệt, nếu không mất sạch dấu vết.
4. **Ứng dụng demo cũng là bề mặt tấn công thật.** Đây chỉ là shop mẫu, không có dữ liệu
   gì, nhưng nó là cửa vào.
