<?php
/**
 * SSO my.soloceo.vn (WoWonder) → Support Board (chat.soloceo.vn).
 * CEO bấm "Đăng nhập bằng my.soloceo.vn" → /oauth WoWonder → callback đây:
 * đổi code→token→user, tạo/tìm user Support Board rồi đăng nhập (set cookie sb-login).
 * App OAuth do chủ dự án cấp; app_secret giữ server-side.
 */
require_once(__DIR__ . '/include/functions.php');

$APP_ID     = '7534158a3ccf70314e64';
$APP_SECRET = '46fbb1bae9f394ad02a30cf7e272b7a48eeefb9';
$WO         = 'https://my.soloceo.vn';
$HOME       = 'https://chat.soloceo.vn/';

// Bước 1: chưa có code → chuyển sang trang duyệt OAuth của WoWonder
if (empty($_GET['code'])) {
    header('Location: ' . $WO . '/oauth?app_id=' . urlencode($APP_ID));
    exit;
}

function wo_fail($msg) {
    http_response_code(400);
    die('<meta charset="utf-8"><div style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center">'
        . '<h3>Đăng nhập bằng my.soloceo.vn thất bại</h3><p>' . htmlspecialchars($msg) . '</p>'
        . '<a href="https://chat.soloceo.vn/">Quay lại</a></div>');
}

// Bước 2: đổi code → access_token
$code = $_GET['code'];
$tok  = json_decode(@file_get_contents($WO . '/authorize?app_id=' . urlencode($APP_ID)
        . '&app_secret=' . urlencode($APP_SECRET) . '&code=' . urlencode($code)), true);
$access = $tok['access_token'] ?? null;
if (!$access) {
    wo_fail('Mã xác thực không hợp lệ hoặc đã hết hạn.');
}

// Bước 3: lấy thông tin user WoWonder
$ud = json_decode(@file_get_contents($WO . '/app_api?access_token=' . urlencode($access) . '&type=get_user_data'), true);
$u  = $ud['user_data'] ?? null;
if (!$u || empty($u['username'])) {
    wo_fail('Không lấy được thông tin tài khoản cộng đồng.');
}

$email  = !empty($u['email']) ? $u['email'] : ($u['username'] . '@my.soloceo.vn');
$first  = !empty($u['first_name']) ? $u['first_name'] : $u['username'];
$last   = $u['last_name'] ?? '';
$avatar = !empty($u['avatar']) ? $u['avatar'] : '';

// Bước 4: tìm user Support Board theo email → đăng nhập; chưa có → tạo + đăng nhập
$existing = sb_db_get('SELECT id, token FROM sb_users WHERE email = "' . sb_db_escape($email) . '" LIMIT 1');
if ($existing && !empty($existing['id'])) {
    sb_login('', '', $existing['id'], $existing['token']);
} else {
    $settings = ['first_name' => $first, 'last_name' => $last, 'email' => $email, 'user_type' => 'user'];
    if ($avatar) { $settings['profile_image'] = $avatar; }
    $res = sb_add_user_and_login($settings, ['wowonder-username' => $u['username']]);
    if (sb_is_validation_error($res) || $res === false) {
        wo_fail('Không tạo được tài khoản chat. Vui lòng thử lại.');
    }
}

// Bước 5: về trang chat — đã đăng nhập (cookie sb-login đã set)
header('Location: ' . $HOME);
exit;
