<?php
// PayOS (QR chuyển khoản VN) cho WoWonder — mua Pro trực tiếp HOẶC nạp ví.
// Đặt: src/xhr/payos_payment.php ; đã whitelist 'payos_payment' trong requests.php.
//   requests.php?f=payos_payment&pro_type=<1..4>      → mua Pro (giá gói)
//   requests.php?f=payos_payment&wallet=1&amount=<số> → nạp ví (số tuỳ ý)
if ($f == 'payos_payment') {
    global $sqlConnect, $wo;
    if (empty($wo['user']['user_id'])) {
        header("Location: " . Wo_SeoLink('index.php?link1=login'));
        exit();
    }

    $client_id = isset($wo['config']['payos_client_id']) ? $wo['config']['payos_client_id'] : '';
    $api_key = isset($wo['config']['payos_api_key']) ? $wo['config']['payos_api_key'] : '';
    $checksum_key = isset($wo['config']['payos_checksum_key']) ? $wo['config']['payos_checksum_key'] : '';

    $is_wallet = !empty($_GET['wallet']);
    $fail_link = $is_wallet ? 'index.php?link1=wallet' : 'index.php?link1=oops';

    if ($is_wallet) {
        // Nạp ví: số tiền tuỳ người dùng nhập
        $amount = (isset($_GET['amount']) && is_numeric($_GET['amount'])) ? (int) round((float) $_GET['amount']) : 0;
        $pro_type = 0;
        $kind = 'wallet';
        $desc = 'SoloCEO Nap vi';
    } else {
        // Mua Pro: pro_type 1..4, giá lấy từ pro_packages (key = pro_type)
        $pro_type = (isset($_GET['pro_type']) && in_array((int) $_GET['pro_type'], array(1, 2, 3, 4))) ? (int) $_GET['pro_type'] : 0;
        if ($pro_type < 1) { header("Location: " . Wo_SeoLink('index.php?link1=oops')); exit(); }
        $amount = isset($wo['pro_packages'][$pro_type]['price']) ? (int) round((float) $wo['pro_packages'][$pro_type]['price']) : 0;
        $kind = 'pro';
        $desc = 'SoloCEO Pro';
    }

    if ($amount < 1 || !$client_id || !$api_key || !$checksum_key) {
        header("Location: " . Wo_SeoLink($fail_link));
        exit();
    }

    $user_id = (int) $wo['user']['user_id'];
    $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
    $site = rtrim($wo['config']['site_url'], '/');
    // Trỏ thẳng trang ví/upgrade (PayOS chèn ?code&id&status vào sau — WoWonder
    // đọc link1, bỏ qua tham số thừa). KHÔNG dùng requests.php?f=payos_return
    // vì requests.php include xhr/payos_return.php (không tồn tại) → trắng trang.
    $return_url = $site . '/index.php?link1=' . ($is_wallet ? 'wallet' : 'upgrade');
    $cancel_url = $return_url;

    $sign_str = "amount=" . $amount . "&cancelUrl=" . $cancel_url . "&description=" . $desc
        . "&orderCode=" . $order_code . "&returnUrl=" . $return_url;
    $signature = hash_hmac('sha256', $sign_str, $checksum_key);
    $body = array('orderCode' => $order_code, 'amount' => $amount, 'description' => $desc,
        'returnUrl' => $return_url, 'cancelUrl' => $cancel_url, 'signature' => $signature);

    $ch = curl_init('https://api-merchant.payos.vn/v2/payment-requests');
    curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => array('x-client-id: ' . $client_id, 'x-api-key: ' . $api_key, 'Content-Type: application/json'),
        CURLOPT_POSTFIELDS => json_encode($body)));
    $r = json_decode(curl_exec($ch), true);
    curl_close($ch);

    if (isset($r['code']) && $r['code'] === '00' && !empty($r['data']['checkoutUrl'])) {
        // Bảng đã tồn tại (có cột kind). CREATE IF NOT EXISTS chỉ để fresh-install;
        // KHÔNG chạy ALTER (PHP8 mysqli ném exception "Duplicate column" → 500).
        @mysqli_query($sqlConnect, "CREATE TABLE IF NOT EXISTS Wo_Payos_Pending (
            id INT AUTO_INCREMENT PRIMARY KEY, order_code BIGINT, user_id INT,
            kind VARCHAR(10) DEFAULT 'pro', pro_type INT, amount INT,
            status VARCHAR(20) DEFAULT 'PENDING', created INT, INDEX(order_code)) ENGINE=InnoDB");
        $oc = (int) $order_code; $uid = (int) $user_id; $pt = (int) $pro_type; $am = (int) $amount; $t = time();
        $kd = mysqli_real_escape_string($sqlConnect, $kind);
        mysqli_query($sqlConnect, "INSERT INTO Wo_Payos_Pending (order_code,user_id,kind,pro_type,amount,status,created) VALUES ($oc,$uid,'$kd',$pt,$am,'PENDING',$t)");
        header("Location: " . $r['data']['checkoutUrl']);
        exit();
    }
    header("Location: " . Wo_SeoLink($fail_link));
    exit();
}

// Trang quay lại sau thanh toán
if ($f == 'payos_return') {
    header("Location: " . Wo_SeoLink('index.php?link1=wallet'));
    exit();
}
