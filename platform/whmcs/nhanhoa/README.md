# Nhân Hòa — module đăng ký tên miền cho WHMCS (platform.soloceo.vn)

Module chính hãng của Nhân Hòa (bản 08/12/2022) dùng để **tìm kiếm và mua tên miền .vn**
trên `platform.soloceo.vn` (WHMCS 8.13.1, container `whmcs` trên tenant-03).

## Tệp trong thư mục này

| Tệp | Đích trên máy chủ |
|---|---|
| `nhanhoa.php`, `logo.gif` | `/var/www/html/modules/registrars/nhanhoa/` |
| `additionalfields.php` | `/var/www/html/resources/domains/additionalfields.php` — 15 trường bắt buộc cho tên miền .vn (loại chủ thể, công ty/MST, CMND/CCCD, ngày sinh…) |
| `whois.json` | **gộp** vào `/var/www/html/resources/domains/whois.json` cùng các mục của `dist.whois.json`, đặt mục .vn lên đầu |

Cài bằng `./install.sh` (chạy trên tenant-03).

## Hai điểm đã vá thêm so với bản gốc

1. **HTTPS**: bản gốc gọi `http://api.nhanhoa.com/` — gửi ResellerID/API key qua kết nối
   không mã hoá. Đã đổi sang `https://` (đã kiểm chứng máy chủ Nhân Hòa trả 200 qua TLS).
2. **Ghim IPv4** (`CURLOPT_IPRESOLVE = CURL_IPRESOLVE_V4`): Nhân Hòa lọc theo IP đại lý;
   nếu máy chủ đi ra bằng IPv6 thì API từ chối. Thêm cả `CURLOPT_TIMEOUT = 120`.
3. `nhanhoa_MetaData()` để WHMCS 8 hiển thị đúng tên module.

## Bốn cái bẫy đã mất công tìm ra (đọc trước khi sửa)

1. **Bản chính hãng KHÔNG có `CheckAvailability`.** Việc kiểm tra tên miền còn trống hay
   không đi qua `whois.json` → `https://zonedns.vn/whoisvn.php?domain=` (trả đúng chữ
   `true` = đã có chủ, `false` = còn trống). Vì vậy `whois.json` là bắt buộc, không phải tuỳ chọn.

2. **`domainLookupProvider` phải là `BasicWhois`.** Mặc định WHMCS đặt `WhmcsDomains`
   (dịch vụ tra cứu trả phí của WHMCS) — nó bỏ qua `whois.json` và trả kết quả rỗng.
   Đổi trong `tblconfiguration`.

3. **Giá TLD phải ghi qua API `CreateOrUpdateTLD`, không được ghi thẳng SQL.** WHMCS có
   bộ nhớ đệm riêng cho bảng giá; ghi/xoá bằng SQL làm ô tìm kiếm trả `tld` rỗng và ghi
   nhật ký `WHOIS Lookup Error for ''`. Tham số bắt buộc là `currency_code` (không phải
   `currencyid`).

4. **Tỷ giá USD phải đúng.** Tiền tệ mặc định là VND; nếu USD để `rate = 1.0` thì
   `CreateOrUpdateTLD` quy đổi 830.000đ thành 830.000 USD và ngược lại, phá sạch bảng giá.
   Đã đặt `rate = 0.00004` (~25.000đ/USD).

## Khoá API

Khoá đại lý (ResellerID / Username / Password) do chủ hệ thống nhập tại
**Setup → Products/Services → Domain Registrars → Nhân Hòa**, lấy từ
`https://customer.nhanhoa.com/?site=api` (nhớ khai báo IP máy chủ `82.197.71.41` vào
danh sách cho phép bên Nhân Hòa). Khoá đã nhập trước đây được giữ nguyên: các bản ghi
`tblregistrars` đã đổi tên trường `authId/authUser/authPwd` → `ResellerID/Username/Password`
cho khớp bản chính hãng, giá trị mã hoá không đụng tới.
