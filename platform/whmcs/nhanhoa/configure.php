<?php
/**
 * Cấu hình WHMCS cho việc bán tên miền qua Nhân Hòa.
 * Chạy BÊN TRONG container whmcs: `php /tmp/nh-configure.php`
 *
 * Mọi thay đổi bảng giá đều đi qua API CreateOrUpdateTLD — ghi thẳng SQL sẽ khiến
 * bộ nhớ đệm bảng giá của WHMCS lệch và ô tìm kiếm tên miền trả về kết quả rỗng.
 */
$_SERVER['HTTP_HOST'] = 'platform.soloceo.vn';
require '/var/www/html/init.php';

use WHMCS\Database\Capsule;

$admin = Capsule::table('tbladmins')->where('disabled', 0)->value('username');

// 1. Tra cứu tên miền phải dùng whois.json, không dùng dịch vụ trả phí của WHMCS
Capsule::table('tblconfiguration')->where('setting', 'domainLookupProvider')
    ->update(['value' => 'BasicWhois']);

// 2. Tiền tệ mặc định là VND — USD phải có tỷ giá thật, để 1.0 sẽ phá bảng giá khi quy đổi
Capsule::table('tblcurrencies')->where('code', 'USD')->update(['rate' => 0.00004]); // ~25.000đ/USD

// 3. Đổi tên trường cấu hình của module cũ sang tên của bản chính hãng (giữ nguyên khoá đã nhập)
foreach ([['authId', 'ResellerID'], ['authUser', 'Username'], ['authPwd', 'Password']] as [$cu, $moi]) {
    Capsule::table('tblregistrars')->where('registrar', 'nhanhoa')->where('setting', $cu)
        ->update(['setting' => $moi]);
}

// 4. Bảng giá bán (VND). USD do WHMCS tự quy đổi theo tỷ giá ở bước 2.
$bang = [
    // TLD        đăng ký   chuyển về  gia hạn
    '.com'    => [299000,   299000,   340000],
    '.net'    => [320000,   320000,   360000],
    '.vn'     => [830000,   480000,   480000],
    '.com.vn' => [700000,   450000,   450000],
];
Capsule::table('tblpricing')->where('type', 'like', 'domain%')->delete();
foreach ($bang as $ext => [$dk, $cv, $gh]) {
    $r = localAPI('CreateOrUpdateTLD', [
        'extension' => $ext, 'autoreg' => 'nhanhoa', 'currency_code' => 'VND',
        'register' => [1 => $dk], 'transfer' => [1 => $cv], 'renew' => [1 => $gh],
    ], $admin);
    printf("  %-10s %s\n", $ext, $r['result'] ?? json_encode($r));
}

// 5. Kiểm chứng ngay: một tên miền chắc chắn trống và một tên miền đã có chủ
foreach (['thu-nghiem-soloceo-9x7q2.vn' => 'available', 'soloceo.vn' => 'unavailable'] as $d => $mong) {
    $r = localAPI('DomainWhois', ['domain' => $d], $admin);
    printf("  %-32s %s (mong đợi %s)\n", $d, $r['status'] ?? '?', $mong);
}
