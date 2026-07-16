<?php
/**
 * PayOS (QR VN) cho Support Board SaaS (chat.soloceo.vn) — thanh toán GÓI MEMBERSHIP.
 * File webroot ĐỘC LẬP trong thư mục account/ (bootstrap như verifone.php:
 * require('functions.php')). Đặt: /var/www/html/account/payos.php
 *   payos.php?action=plans                       (CEO đăng nhập) → chọn gói
 *   payos.php?action=create&membership_id=<id>   (CEO đăng nhập) → tạo QR, redirect
 *   payos.php?action=webhook                      (PayOS gọi)     → verify + kích hoạt gói
 *   payos.php?action=return                                       → về portal
 *   payos.php?action=admin                        (super admin)   → form nhập 3 khoá
 * Webhook URL kênh PayOS: https://chat.soloceo.vn/account/payos.php?action=webhook
 *
 * SB Cloud dùng 1 cổng qua hằng PAYMENT_PROVIDER (thiết kế single-provider) nên
 * KHÔNG nhét PayOS vào cơ chế cổng gốc — dùng endpoint độc lập này. account()
 * đọc cookie sb-cloud (CEO), membership_get() lấy giá/kỳ hạn, membership_update()
 * cập nhật users.membership + membership_expiration đúng cloud_user_id.
 */
error_reporting(0);
require('functions.php');

$action = isset($_GET['action']) ? preg_replace('/[^a-z]/', '', $_GET['action']) : '';

// Bảng config + pending trên CLOUD DB (db_query dùng CLOUD_CONNECTION).
db_query("CREATE TABLE IF NOT EXISTS payos_config (name VARCHAR(64) PRIMARY KEY, value TEXT) ENGINE=InnoDB");
db_query("CREATE TABLE IF NOT EXISTS payos_pending (id INT AUTO_INCREMENT PRIMARY KEY, order_code BIGINT, cloud_user_id INT, membership_id VARCHAR(64), period VARCHAR(20), amount INT, email VARCHAR(190), referral VARCHAR(190) DEFAULT '', status VARCHAR(20) DEFAULT 'PENDING', created INT, INDEX(order_code)) ENGINE=InnoDB");

function payos_cfg($n) {
    $conn = $GLOBALS['CLOUD_CONNECTION'];
    if (!$conn) { db_connect(); $conn = $GLOBALS['CLOUD_CONNECTION']; }
    $n = $conn->real_escape_string($n);
    $res = $conn->query("SELECT value FROM payos_config WHERE name = '$n' LIMIT 1");
    if ($res && ($row = $res->fetch_assoc())) return $row['value'];
    return '';
}
function payos_cfg_set($n, $v) {
    $conn = $GLOBALS['CLOUD_CONNECTION'];
    if (!$conn) { db_connect(); $conn = $GLOBALS['CLOUD_CONNECTION']; }
    $n = $conn->real_escape_string($n);
    $v = $conn->real_escape_string($v);
    $conn->query("INSERT INTO payos_config (name, value) VALUES ('$n', '$v') ON DUPLICATE KEY UPDATE value = '$v'");
}

$client_id = payos_cfg('payos_client_id');
$api_key = payos_cfg('payos_api_key');
$checksum_key = payos_cfg('payos_checksum_key');
$site = 'https://' . preg_replace('/[^a-zA-Z0-9\.\-]/', '', $_SERVER['HTTP_HOST'] ?? 'chat.soloceo.vn');

// ---------- PLANS (chọn gói) ----------
if ($action == 'plans') {
    $account = account();
    if (!$account || empty($account['user_id'])) { header('Location: ' . $site . '/account/'); exit; }
    $memberships = function_exists('memberships') ? memberships() : [];
    $h = function ($v) { return htmlspecialchars((string) $v); };
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thanh toán PayOS — SoloCEO Chat</title>';
    echo '<div style="font-family:system-ui,Arial;max-width:620px;margin:32px auto;padding:0 16px">';
    echo '<h2>Chọn gói và thanh toán bằng PayOS (QR chuyển khoản VN)</h2>';
    if (!$client_id || !$api_key || !$checksum_key) { echo '<p style="background:#fff3cd;color:#856404;padding:10px;border-radius:8px">PayOS chưa được cấu hình. Vui lòng liên hệ quản trị.</p>'; }
    if (empty($memberships)) { echo '<p>Chưa có gói nào được định nghĩa.</p>'; }
    foreach ($memberships as $m) {
        if (empty($m['id']) || !isset($m['price']) || (float) $m['price'] <= 0) continue;
        $price = number_format((float) $m['price'], 0, ',', '.');
        echo '<div style="border:1px solid #e2e2e2;border-radius:12px;padding:16px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;gap:12px">';
        echo '<div><b>' . $h($m['name']) . '</b><br><span style="color:#777">' . $price . ' đ / ' . $h($m['period']) . '</span></div>';
        echo '<a href="' . $site . '/account/payos.php?action=create&membership_id=' . $h($m['id']) . '" style="background:#00a862;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;white-space:nowrap">Thanh toán PayOS</a>';
        echo '</div>';
    }
    echo '<p style="margin-top:20px"><a href="' . $site . '/account/">← Về trang tài khoản</a></p></div>';
    exit;
}

// ---------- CREATE ----------
if ($action == 'create') {
    $account = account();
    if (!$account || empty($account['user_id'])) { header('Location: ' . $site . '/account/'); exit; }
    if (!$client_id || !$api_key || !$checksum_key) { header('Location: ' . $site . '/account/payos.php?action=plans'); exit; }
    $membership_id = isset($_GET['membership_id']) ? preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['membership_id']) : '';
    $m = function_exists('membership_get') ? membership_get($membership_id) : false;
    if (!$m || empty($m['id']) || (float) $m['price'] <= 0) { header('Location: ' . $site . '/account/payos.php?action=plans'); exit; }
    $amount = (int) round((float) $m['price']);
    $cloud_user_id = (int) $account['user_id'];
    $email = isset($account['email']) ? $account['email'] : '';
    $referral = isset($_COOKIE['sb-referral']) ? $_COOKIE['sb-referral'] : '';
    $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
    $desc = 'SoloCEO Chat';
    $return_url = $site . '/account/payos.php?action=return';
    $cancel_url = $site . '/account/payos.php?action=plans';
    $sign = "amount=" . $amount . "&cancelUrl=" . $cancel_url . "&description=" . $desc . "&orderCode=" . $order_code . "&returnUrl=" . $return_url;
    $signature = hash_hmac('sha256', $sign, $checksum_key);
    $body = array('orderCode' => $order_code, 'amount' => $amount, 'description' => $desc, 'returnUrl' => $return_url, 'cancelUrl' => $cancel_url, 'signature' => $signature);
    $ch = curl_init('https://api-merchant.payos.vn/v2/payment-requests');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array('x-client-id: ' . $client_id, 'x-api-key: ' . $api_key, 'Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode($body)));
    $r = json_decode(curl_exec($ch), true); curl_close($ch);
    if (isset($r['code']) && $r['code'] === '00' && !empty($r['data']['checkoutUrl'])) {
        $conn = $GLOBALS['CLOUD_CONNECTION'];
        $mid = $conn->real_escape_string($membership_id);
        $per = $conn->real_escape_string((string) $m['period']);
        $eml = $conn->real_escape_string($email);
        $ref = $conn->real_escape_string($referral);
        $t = time();
        db_query("INSERT INTO payos_pending (order_code, cloud_user_id, membership_id, period, amount, email, referral, status, created) VALUES ($order_code, $cloud_user_id, '$mid', '$per', $amount, '$eml', '$ref', 'PENDING', $t)");
        header('Location: ' . $r['data']['checkoutUrl']); exit;
    }
    header('Location: ' . $site . '/account/payos.php?action=plans'); exit;
}

// ---------- RETURN ----------
if ($action == 'return') { header('Location: ' . $site . '/account/'); exit; }

// ---------- WEBHOOK ----------
if ($action == 'webhook') {
    header('Content-type: application/json');
    $payload = json_decode(file_get_contents('php://input'), true);
    // PayOS ping xác thực khi thêm webhook → PHẢI trả 200. Chỉ kích hoạt khi chữ ký hợp lệ.
    if (!$payload || empty($payload['data'])) { http_response_code(200); echo json_encode(array('success' => true)); exit; }
    $data = $payload['data']; ksort($data);
    $pairs = array();
    foreach ($data as $k => $v) {
        if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($v === null) $v = ''; if ($v === true) $v = 'true'; if ($v === false) $v = 'false';
        $pairs[] = $k . '=' . $v;
    }
    if (!hash_equals(hash_hmac('sha256', implode('&', $pairs), $checksum_key), (string) ($payload['signature'] ?? ''))) { http_response_code(200); echo json_encode(array('success' => true)); exit; }
    $order_code = isset($payload['data']['orderCode']) ? (int) $payload['data']['orderCode'] : 0;
    if (($payload['code'] ?? '') === '00' && $order_code > 0) {
        $conn = $GLOBALS['CLOUD_CONNECTION'];
        if (!$conn) { db_connect(); $conn = $GLOBALS['CLOUD_CONNECTION']; }
        $res = $conn->query("SELECT * FROM payos_pending WHERE order_code = $order_code LIMIT 1");
        $row = ($res && $res->num_rows) ? $res->fetch_assoc() : false;
        if ($row && $row['status'] !== 'PAID') {
            membership_update($row['membership_id'], $row['period'], $row['cloud_user_id'], 'PayOS-' . $order_code, ($row['referral'] !== '' ? $row['referral'] : false));
            $conn->query("UPDATE payos_pending SET status = 'PAID' WHERE order_code = $order_code");
        }
    }
    http_response_code(200); echo json_encode(array('success' => true)); exit;
}

// ---------- ADMIN ----------
if ($action == 'admin') {
    if (!super_admin()) { http_response_code(403); echo 'Chỉ super admin Support Board. Hãy đăng nhập admin (account/super.php) rồi mở lại trang này.'; exit; }
    $saved = false;
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        payos_cfg_set('payos_client_id', trim($_POST['client_id'] ?? ''));
        payos_cfg_set('payos_api_key', trim($_POST['api_key'] ?? ''));
        payos_cfg_set('payos_checksum_key', trim($_POST['checksum_key'] ?? ''));
        payos_cfg_set('payos', (!empty($_POST['enable']) ? '1' : '0'));
        $saved = true;
        $client_id = payos_cfg('payos_client_id'); $api_key = payos_cfg('payos_api_key'); $checksum_key = payos_cfg('payos_checksum_key');
    }
    $en = payos_cfg('payos'); $h = function ($v) { return htmlspecialchars((string) $v); };
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PayOS — Support Board</title>';
    echo '<div style="font-family:system-ui,Arial;max-width:560px;margin:40px auto;padding:0 16px"><h2>Cấu hình PayOS cho Chat (chat.soloceo.vn)</h2>';
    if ($saved) echo '<p style="background:#e6f7ee;color:#00733f;padding:10px;border-radius:8px">✅ Đã lưu.</p>';
    echo '<p style="color:#777;font-size:13px">Webhook URL kênh PayOS: <code>https://chat.soloceo.vn/account/payos.php?action=webhook</code></p>';
    echo '<p style="color:#777;font-size:13px">Trang chọn gói cho CEO: <code>https://chat.soloceo.vn/account/payos.php?action=plans</code></p>';
    echo '<form method="post" style="display:flex;flex-direction:column;gap:6px">';
    echo '<label>Client ID</label><input name="client_id" value="' . $h($client_id) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label>API Key</label><input name="api_key" value="' . $h($api_key) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label>Checksum Key</label><input name="checksum_key" value="' . $h($checksum_key) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label style="margin:8px 0"><input type="checkbox" name="enable" value="1" ' . ($en === '1' ? 'checked' : '') . '> Bật PayOS</label>';
    echo '<button type="submit" style="background:#00a862;color:#fff;border:0;padding:12px;border-radius:8px;font-size:15px;cursor:pointer">Lưu cấu hình PayOS</button></form></div>';
    exit;
}
http_response_code(400); echo 'invalid action';
