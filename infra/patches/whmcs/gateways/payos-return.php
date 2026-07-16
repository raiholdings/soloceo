<?php
/**
 * Trang trung gian sau khi thanh toán PayOS. PayOS chuyển hướng về đây kèm
 * ?code=&id=<paymentLinkId>&cancel=&status=&orderCode= — tham số `id` của PayOS
 * đè `id` hoá đơn của WHMCS nên không dùng viewinvoice.php trực tiếp được.
 * Ở đây map orderCode → hoá đơn thật rồi redirect. (Hoá đơn đã được webhook
 * đánh dấu Paid độc lập với trang này.)
 * Đặt: /var/www/html/payos-return.php
 */
require __DIR__ . "/init.php";

use WHMCS\Database\Capsule;

$orderCode = isset($_GET["orderCode"]) ? preg_replace("/[^0-9]/", "", $_GET["orderCode"]) : "";
$invoiceId = null;

if ($orderCode !== "") {
    $inv = Capsule::table("tblinvoices")
        ->where("notes", "payos_order:" . $orderCode)
        ->first();
    if ($inv) {
        $invoiceId = $inv->id;
    } else {
        // fallback: orderCode = invoiceId + 4 số cuối timestamp
        $guess = (int) substr($orderCode, 0, -4);
        if ($guess > 0 && Capsule::table("tblinvoices")->where("id", $guess)->exists()) {
            $invoiceId = $guess;
        }
    }
}

if ($invoiceId) {
    header("Location: /viewinvoice.php?id=" . $invoiceId . "&paymentsuccess=true");
} else {
    header("Location: /clientarea.php?action=invoices");
}
exit;
