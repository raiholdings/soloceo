<?php
// PayOS (QR chuyển khoản VN) — khởi tạo thanh toán Pro cho WoWonder.
// Đặt: src/xhr/payos_payment.php ; gọi: requests.php?f=payos_payment&pro_type=<1..4>
// Cần thêm 'payos_payment' vào $allow_array trong requests.php.
if ($f == 'payos_payment') {
    global $sqlConnect, $wo;
    if (empty($wo['user']['user_id'])) {
        header("Location: " . Wo_SeoLink('index.php?link1=login'));
        exit();
    }
    $pro_types_array = array(1, 2, 3, 4);
    if (!isset($_GET['pro_type']) || !in_array($_GET['pro_type'], $pro_types_array)) {
        header("Location: " . Wo_SeoLink('index.php?link1=oops'));
        exit();
    }
    $pro_type = (int) $_GET['pro_type'];
    // pro_packages có key là chính pro_type (1..4), giá VND. (KHÔNG map sang star/hot.)
    $amount = 0;
    if (isset($wo['pro_packages'][$pro_type]['price'])) {
        $amount = (int) round((float) $wo['pro_packages'][$pro_type]['price']);
    }
    $client_id = isset($wo['config']['payos_client_id']) ? $wo['config']['payos_client_id'] : '';
    $api_key = isset($wo['config']['payos_api_key']) ? $wo['config']['payos_api_key'] : '';
    $checksum_key = isset($wo['config']['payos_checksum_key']) ? $wo['config']['payos_checksum_key'] : '';

    if (!$client_id || !$api_key || !$checksum_key || $amount < 1) {
        header("Location: " . Wo_SeoLink('index.php?link1=oops'));
        exit();
    }

    $user_id = (int) $wo['user']['user_id'];
    $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
    $desc = 'SoloCEO Pro';
    $site = rtrim($wo['config']['site_url'], '/');
    $return_url = $site . '/requests.php?f=payos_return';
    $cancel_url = $site . '/index.php?link1=upgrade';

    $sign_str = "amount=" . $amount . "&cancelUrl=" . $cancel_url
        . "&description=" . $desc . "&orderCode=" . $order_code
        . "&returnUrl=" . $return_url;
    $signature = hash_hmac('sha256', $sign_str, $checksum_key);
    $body = array(
        'orderCode' => $order_code,
        'amount' => $amount,
        'description' => $desc,
        'returnUrl' => $return_url,
        'cancelUrl' => $cancel_url,
        'signature' => $signature,
    );

    $ch = curl_init('https://api-merchant.payos.vn/v2/payment-requests');
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array(
            'x-client-id: ' . $client_id,
            'x-api-key: ' . $api_key,
            'Content-Type: application/json',
        ),
        CURLOPT_POSTFIELDS => json_encode($body),
    ));
    $resp = curl_exec($ch);
    curl_close($ch);
    $r = json_decode($resp, true);

    if (isset($r['code']) && $r['code'] === '00' && !empty($r['data']['checkoutUrl'])) {
        // lưu pending để webhook kích hoạt Pro theo orderCode
        _payos_ensure_table($sqlConnect);
        $oc = (int) $order_code; $uid = (int) $user_id; $pt = (int) $pro_type; $am = (int) $amount; $t = time();
        mysqli_query($sqlConnect, "INSERT INTO Wo_Payos_Pending (order_code,user_id,kind,pro_type,amount,status,created) VALUES ($oc,$uid,'pro',$pt,$am,'PENDING',$t)");
        header("Location: " . $r['data']['checkoutUrl']);
        exit();
    }
    header("Location: " . Wo_SeoLink('index.php?link1=oops'));
    exit();
}

/** Bảng pending (kind: pro|wallet) */
function _payos_ensure_table($sqlConnect) {
    mysqli_query($sqlConnect, "CREATE TABLE IF NOT EXISTS Wo_Payos_Pending (
        id INT AUTO_INCREMENT PRIMARY KEY, order_code BIGINT, user_id INT,
        kind VARCHAR(10) DEFAULT 'pro', pro_type INT, amount INT,
        status VARCHAR(20) DEFAULT 'PENDING', created INT, INDEX(order_code)) ENGINE=InnoDB");
    @mysqli_query($sqlConnect, "ALTER TABLE Wo_Payos_Pending ADD COLUMN kind VARCHAR(10) DEFAULT 'pro'");
}

// ===== Nạp ví bằng PayOS (số tiền tuỳ ý) =====
if ($f == 'payos_wallet') {
    global $sqlConnect, $wo;
    if (empty($wo['user']['user_id'])) { header("Location: " . Wo_SeoLink('index.php?link1=login')); exit(); }
    $amount = (isset($_GET['amount']) && is_numeric($_GET['amount'])) ? (int) round((float) $_GET['amount']) : 0;
    $client_id = isset($wo['config']['payos_client_id']) ? $wo['config']['payos_client_id'] : '';
    $api_key = isset($wo['config']['payos_api_key']) ? $wo['config']['payos_api_key'] : '';
    $checksum_key = isset($wo['config']['payos_checksum_key']) ? $wo['config']['payos_checksum_key'] : '';
    if ($amount < 1 || !$client_id || !$api_key || !$checksum_key) { header("Location: " . Wo_SeoLink('index.php?link1=wallet')); exit(); }
    $user_id = (int) $wo['user']['user_id'];
    $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
    $desc = 'SoloCEO Nap vi';
    $site = rtrim($wo['config']['site_url'], '/');
    $return_url = $site . '/requests.php?f=payos_return';
    $cancel_url = $site . '/index.php?link1=wallet';
    $sign_str = "amount=" . $amount . "&cancelUrl=" . $cancel_url . "&description=" . $desc . "&orderCode=" . $order_code . "&returnUrl=" . $return_url;
    $signature = hash_hmac('sha256', $sign_str, $checksum_key);
    $body = array('orderCode' => $order_code, 'amount' => $amount, 'description' => $desc, 'returnUrl' => $return_url, 'cancelUrl' => $cancel_url, 'signature' => $signature);
    $ch = curl_init('https://api-merchant.payos.vn/v2/payment-requests');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array('x-client-id: ' . $client_id, 'x-api-key: ' . $api_key, 'Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode($body)));
    $r = json_decode(curl_exec($ch), true); curl_close($ch);
    if (isset($r['code']) && $r['code'] === '00' && !empty($r['data']['checkoutUrl'])) {
        _payos_ensure_table($sqlConnect);
        $oc = (int) $order_code; $uid = (int) $user_id; $am = (int) $amount; $t = time();
        mysqli_query($sqlConnect, "INSERT INTO Wo_Payos_Pending (order_code,user_id,kind,pro_type,amount,status,created) VALUES ($oc,$uid,'wallet',0,$am,'PENDING',$t)");
        header("Location: " . $r['data']['checkoutUrl']);
        exit();
    }
    header("Location: " . Wo_SeoLink('index.php?link1=wallet')); exit();
}

// Trang quay lại sau thanh toán (PayOS chèn ?id= của nó → không dùng trang có id)
if ($f == 'payos_return') {
    header("Location: " . Wo_SeoLink('index.php?link1=upgrade'));
    exit();
}
