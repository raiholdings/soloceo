<?php
/**
 * Webhook PayOS cho WoWonder — đặt webroot: /var/www/html/payos-webhook.php
 * URL kênh PayOS: https://my.soloceo.vn/payos-webhook.php
 * Nhận xác nhận PayOS → verify chữ ký → kích hoạt Pro theo Wo_Payos_Pending.
 */
error_reporting(0);
require_once('assets/init.php');
decryptConfigData();

global $sqlConnect, $wo;
header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!$payload || empty($payload['data'])) {
    http_response_code(400);
    echo json_encode(array('success' => false));
    exit();
}

$checksum_key = isset($wo['config']['payos_checksum_key']) ? $wo['config']['payos_checksum_key'] : '';

// verify chữ ký: ksort data, nối k=v&, HMAC checksumKey
$data = $payload['data'];
ksort($data);
$pairs = array();
foreach ($data as $k => $v) {
    if (is_array($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($v === null) $v = '';
    if ($v === true) $v = 'true';
    if ($v === false) $v = 'false';
    $pairs[] = $k . '=' . $v;
}
$expected = hash_hmac('sha256', implode('&', $pairs), $checksum_key);
if (!hash_equals($expected, (string) ($payload['signature'] ?? ''))) {
    http_response_code(400);
    echo json_encode(array('success' => false, 'error' => 'signature'));
    exit();
}

$success = (isset($payload['code']) && $payload['code'] === '00');
$order_code = isset($payload['data']['orderCode']) ? (int) $payload['data']['orderCode'] : 0;

if ($success && $order_code > 0) {
    $row = mysqli_fetch_assoc(mysqli_query($sqlConnect, "SELECT * FROM Wo_Payos_Pending WHERE order_code = $order_code LIMIT 1"));
    if ($row && $row['status'] !== 'PAID') {
        $user_id = (int) $row['user_id'];
        $pro_type = (int) $row['pro_type'];
        $amount = (int) $row['amount'];
        $update_array = array(
            'is_pro' => 1,
            'pro_time' => time(),
            'pro_' => 1,
            'pro_type' => $pro_type,
        );
        if (function_exists('Wo_UpdateUserData')) {
            Wo_UpdateUserData($user_id, $update_array);
        } else {
            mysqli_query($sqlConnect, "UPDATE Wo_Users SET is_pro=1, pro_time=" . time() . ", pro_=1, pro_type=$pro_type WHERE user_id=$user_id");
        }
        $notes = 'Nang cap Pro : PayOS';
        mysqli_query($sqlConnect, "INSERT INTO Wo_Payment_Transactions (`userid`,`kind`,`amount`,`notes`) VALUES ($user_id,'PRO',$amount,'$notes')");
        if (function_exists('Wo_CreatePayment')) { @Wo_CreatePayment($pro_type); }
        if (function_exists('cache')) { @cache($user_id, 'users', 'delete'); }
        mysqli_query($sqlConnect, "UPDATE Wo_Payos_Pending SET status='PAID' WHERE order_code=$order_code");
    }
}

http_response_code(200);
echo json_encode(array('success' => true));
