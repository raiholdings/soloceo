<?php
/**
 * PayOS (QR VN) cho PlayTube — nạp ví. File webroot ĐỘC LẬP (bootstrap init.php,
 * bỏ qua CSRF của ajax.php vì webhook là server-to-server). Đặt: src/payos.php
 *   payos.php?action=create  (POST amount, cần đăng nhập) → JSON {url}
 *   payos.php?action=webhook  (PayOS gọi)                 → verify + cộng ví
 *   payos.php?action=return                               → về ví
 *   payos.php?action=admin    (chỉ admin)                 → form nhập 3 khoá
 * Webhook URL kênh PayOS: https://video.soloceo.vn/payos.php?action=webhook
 */
require_once('./assets/init.php');
decryptConfigData();
global $pt, $db;

$action = isset($_GET['action']) ? preg_replace('/[^a-z]/', '', $_GET['action']) : '';

function _payos_cfg($db, $n) {
    $v = $db->where('name', $n)->getValue(T_CONFIG, 'value');
    return $v === null ? '' : $v;
}
$client_id = _payos_cfg($db, 'payos_client_id');
$api_key = _payos_cfg($db, 'payos_api_key');
$checksum_key = _payos_cfg($db, 'payos_checksum_key');
$db->rawQuery("CREATE TABLE IF NOT EXISTS payos_pending (id INT AUTO_INCREMENT PRIMARY KEY, order_code BIGINT, user_id INT, amount INT, status VARCHAR(20) DEFAULT 'PENDING', created INT, INDEX(order_code)) ENGINE=InnoDB");

if ($action == 'create') {
    header('Content-type: application/json');
    if (IS_LOGGED == false) { echo json_encode(array('status' => 400, 'error' => 'login')); exit; }
    $amount = (!empty($_POST['amount']) && is_numeric($_POST['amount'])) ? (int) PT_Secure($_POST['amount']) : 0;
    if ($amount < 1 || !$client_id || !$api_key || !$checksum_key) { echo json_encode(array('status' => 400, 'error' => 'PayOS chưa cấu hình hoặc số tiền sai')); exit; }
    $user_id = (int) $pt->user->id;
    $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
    $desc = 'SoloCEO Vi';
    $site = rtrim($pt->config->site_url, '/');
    $return_url = $site . '/payos.php?action=return';
    $cancel_url = $site . '/wallet';
    $sign = "amount=" . $amount . "&cancelUrl=" . $cancel_url . "&description=" . $desc . "&orderCode=" . $order_code . "&returnUrl=" . $return_url;
    $signature = hash_hmac('sha256', $sign, $checksum_key);
    $body = array('orderCode' => $order_code, 'amount' => $amount, 'description' => $desc, 'returnUrl' => $return_url, 'cancelUrl' => $cancel_url, 'signature' => $signature);
    $ch = curl_init('https://api-merchant.payos.vn/v2/payment-requests');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array('x-client-id: ' . $client_id, 'x-api-key: ' . $api_key, 'Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode($body)));
    $r = json_decode(curl_exec($ch), true); curl_close($ch);
    if (isset($r['code']) && $r['code'] === '00' && !empty($r['data']['checkoutUrl'])) {
        $db->insert('payos_pending', array('order_code' => $order_code, 'user_id' => $user_id, 'amount' => $amount, 'status' => 'PENDING', 'created' => time()));
        echo json_encode(array('status' => 200, 'url' => $r['data']['checkoutUrl'])); exit;
    }
    echo json_encode(array('status' => 400, 'error' => 'Không tạo được thanh toán PayOS' . (isset($r['desc']) ? ': ' . $r['desc'] : ''))); exit;
}

if ($action == 'return') { header('Location: ' . rtrim($pt->config->site_url, '/') . '/wallet'); exit; }

if ($action == 'webhook') {
    header('Content-type: application/json');
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!$payload || empty($payload['data'])) { http_response_code(400); echo json_encode(array('success' => false)); exit; }
    $data = $payload['data']; ksort($data);
    $pairs = array();
    foreach ($data as $k => $v) {
        if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($v === null) $v = ''; if ($v === true) $v = 'true'; if ($v === false) $v = 'false';
        $pairs[] = $k . '=' . $v;
    }
    if (!hash_equals(hash_hmac('sha256', implode('&', $pairs), $checksum_key), (string) ($payload['signature'] ?? ''))) { http_response_code(400); echo json_encode(array('success' => false, 'error' => 'sig')); exit; }
    $order_code = isset($payload['data']['orderCode']) ? (int) $payload['data']['orderCode'] : 0;
    if (($payload['code'] ?? '') === '00' && $order_code > 0) {
        $row = $db->where('order_code', $order_code)->getOne('payos_pending');
        if ($row && $row->status !== 'PAID') {
            $u = $db->where('id', (int) $row->user_id)->getOne(T_USERS);
            if ($u) {
                $db->where('id', (int) $row->user_id)->update(T_USERS, array('wallet' => ($u->wallet + (int) $row->amount)));
                $db->insert(T_VIDEOS_TRSNS, array('user_id' => (int) $row->user_id, 'paid_id' => (int) $row->user_id, 'admin_com' => 0, 'currency' => $pt->config->payment_currency, 'time' => time(), 'amount' => (int) $row->amount, 'type' => 'ad'));
                $db->where('order_code', $order_code)->update('payos_pending', array('status' => 'PAID'));
            }
        }
    }
    http_response_code(200); echo json_encode(array('success' => true)); exit;
}

if ($action == 'admin') {
    if (IS_LOGGED == false || $pt->user->admin != 1) { http_response_code(403); echo 'Chỉ admin. Hãy đăng nhập tài khoản admin PlayTube.'; exit; }
    $saved = false;
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        foreach (array('payos_client_id' => 'client_id', 'payos_api_key' => 'api_key', 'payos_checksum_key' => 'checksum_key') as $cf => $fld) {
            $val = trim($_POST[$fld] ?? '');
            if ($db->where('name', $cf)->getValue(T_CONFIG, 'value') === null) $db->insert(T_CONFIG, array('name' => $cf, 'value' => $val));
            else $db->where('name', $cf)->update(T_CONFIG, array('value' => $val));
        }
        $en = !empty($_POST['enable']) ? '1' : '0';
        if ($db->where('name', 'payos')->getValue(T_CONFIG, 'value') === null) $db->insert(T_CONFIG, array('name' => 'payos', 'value' => $en));
        else $db->where('name', 'payos')->update(T_CONFIG, array('value' => $en));
        $saved = true;
        $client_id = _payos_cfg($db, 'payos_client_id'); $api_key = _payos_cfg($db, 'payos_api_key'); $checksum_key = _payos_cfg($db, 'payos_checksum_key');
    }
    $en = _payos_cfg($db, 'payos'); $h = function ($v) { return htmlspecialchars($v); };
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PayOS — PlayTube</title>';
    echo '<div style="font-family:system-ui,Arial;max-width:560px;margin:40px auto;padding:0 16px"><h2>Cấu hình PayOS cho Video (video.soloceo.vn)</h2>';
    if ($saved) echo '<p style="background:#e6f7ee;color:#00733f;padding:10px;border-radius:8px">✅ Đã lưu.</p>';
    echo '<p style="color:#777;font-size:13px">Webhook URL kênh PayOS này: <code>https://video.soloceo.vn/payos.php?action=webhook</code></p>';
    echo '<form method="post" style="display:flex;flex-direction:column;gap:6px">';
    echo '<label>Client ID</label><input name="client_id" value="' . $h($client_id) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label>API Key</label><input name="api_key" value="' . $h($api_key) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label>Checksum Key</label><input name="checksum_key" value="' . $h($checksum_key) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label style="margin:8px 0"><input type="checkbox" name="enable" value="1" ' . ($en === '1' ? 'checked' : '') . '> Bật PayOS</label>';
    echo '<button type="submit" style="background:#00a862;color:#fff;border:0;padding:12px;border-radius:8px;font-size:15px;cursor:pointer">Lưu cấu hình PayOS</button></form></div>';
    exit;
}
http_response_code(400); echo 'invalid action';
