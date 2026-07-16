<?php
/**
 * PayOS (QR VN) cho Grupo (groupchat) — nạp ví. File webroot ĐỘC LẬP, bootstrap
 * framework Grupo (require include/load.php). Đặt: src/payos.php
 *   payos.php?action=create&amount=<số>  (đăng nhập) → tạo QR, redirect
 *   payos.php?action=webhook              (PayOS gọi)  → verify + cộng ví (UserWallet)
 *   payos.php?action=admin                (admin)      → form nhập 3 khoá
 * Là PAGE của framework (load.php route /payos → include pages/payos.php với
 * framework đã nạp đủ DB/Registry/current_user). Truy cập: /payos?action=...
 * Webhook URL kênh PayOS: https://groupchat.soloceo.vn/payos?action=webhook
 */
include_once 'fns/sql/load.php';       // class DB
include_once 'fns/firewall/load.php';  // web_shield (dep của variables)
include_once 'fns/variables/load.php'; // Registry current_user (đăng nhập)
include_once 'fns/wallet/load.php';    // function UserWallet

// Framework Grupo dùng output buffering + render layout ở cuối. Page này tự
// kiểm soát output (JSON/redirect/form) nên xoá mọi buffer để không bị nuốt.
while (ob_get_level() > 0) { ob_end_clean(); }

$action = isset($_GET['action']) ? preg_replace('/[^a-z]/', '', $_GET['action']) : '';

function _pcfg($n) {
    $r = DB::connect()->select('payos_config', ['value'], ['name' => $n, 'LIMIT' => 1]);
    return isset($r[0]) ? $r[0]['value'] : '';
}
$client_id = _pcfg('payos_client_id');
$api_key = _pcfg('payos_api_key');
$checksum_key = _pcfg('payos_checksum_key');

$site = 'https://' . preg_replace('/[^a-zA-Z0-9\.\-]/', '', $_SERVER['HTTP_HOST'] ?? 'groupchat.soloceo.vn');

// ---------- CREATE ----------
if ($action == 'create') {
    if (!Registry::load('current_user')->logged_in) { header('Location: ' . $site); exit; }
    $amount = (isset($_GET['amount']) && is_numeric($_GET['amount'])) ? (int) round((float) $_GET['amount']) : 0;
    if ($amount < 1 || !$client_id || !$api_key || !$checksum_key) { header('Location: ' . $site . '/wallet'); exit; }
    $user_id = (int) Registry::load('current_user')->id;
    $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
    $desc = 'SoloCEO Nap vi';
    $return_url = $site . '/wallet';
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
        DB::connect()->insert('payos_pending', array('order_code' => $order_code, 'user_id' => $user_id, 'amount' => $amount, 'status' => 'PENDING', 'created' => time()));
        header('Location: ' . $r['data']['checkoutUrl']); exit;
    }
    header('Location: ' . $site . '/wallet'); exit;
}

// ---------- WEBHOOK ----------
if ($action == 'webhook') {
    header('Content-type: application/json');
    $payload = json_decode(file_get_contents('php://input'), true);
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
        $row = DB::connect()->select('payos_pending', ['order_code', 'user_id', 'amount', 'status'], ['order_code' => $order_code, 'LIMIT' => 1]);
        if (isset($row[0]) && $row[0]['status'] !== 'PAID') {
            UserWallet(array('user_id' => (int) $row[0]['user_id'], 'credit' => (int) $row[0]['amount']));
            DB::connect()->update('payos_pending', array('status' => 'PAID'), array('order_code' => $order_code));
        }
    }
    http_response_code(200); echo json_encode(array('success' => true)); exit;
}

// ---------- ADMIN ----------
if ($action == 'admin') {
    $is_admin = false;
    if (Registry::load('current_user')->logged_in) {
        if ((int) Registry::load('current_user')->id === 1) $is_admin = true;
        elseif (function_exists('role') && role(['permissions' => ['super_privileges' => 'manage_payment_gateways']])) $is_admin = true;
    }
    if (!$is_admin) { http_response_code(403); echo 'Chỉ admin. Hãy đăng nhập tài khoản admin Grupo.'; exit; }
    $saved = false;
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        foreach (array('payos_client_id' => 'client_id', 'payos_api_key' => 'api_key', 'payos_checksum_key' => 'checksum_key') as $cf => $fld) {
            DB::connect()->update('payos_config', array('value' => trim($_POST[$fld] ?? '')), array('name' => $cf));
        }
        DB::connect()->update('payos_config', array('value' => (!empty($_POST['enable']) ? '1' : '0')), array('name' => 'payos'));
        $saved = true; $client_id = _pcfg('payos_client_id'); $api_key = _pcfg('payos_api_key'); $checksum_key = _pcfg('payos_checksum_key');
    }
    $en = _pcfg('payos'); $h = function ($v) { return htmlspecialchars($v); };
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PayOS — Grupo</title>';
    echo '<div style="font-family:system-ui,Arial;max-width:560px;margin:40px auto;padding:0 16px"><h2>Cấu hình PayOS cho Groupchat</h2>';
    if ($saved) echo '<p style="background:#e6f7ee;color:#00733f;padding:10px;border-radius:8px">✅ Đã lưu.</p>';
    echo '<p style="color:#777;font-size:13px">Webhook URL kênh PayOS: <code>https://groupchat.soloceo.vn/payos.php?action=webhook</code></p>';
    echo '<form method="post" style="display:flex;flex-direction:column;gap:6px">';
    echo '<label>Client ID</label><input name="client_id" value="' . $h($client_id) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label>API Key</label><input name="api_key" value="' . $h($api_key) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label>Checksum Key</label><input name="checksum_key" value="' . $h($checksum_key) . '" style="padding:10px;border:1px solid #ccc;border-radius:8px">';
    echo '<label style="margin:8px 0"><input type="checkbox" name="enable" value="1" ' . ($en === '1' ? 'checked' : '') . '> Bật PayOS</label>';
    echo '<button type="submit" style="background:#00a862;color:#fff;border:0;padding:12px;border-radius:8px;font-size:15px;cursor:pointer">Lưu cấu hình PayOS</button></form></div>';
    exit;
}
http_response_code(400); echo 'invalid action';
