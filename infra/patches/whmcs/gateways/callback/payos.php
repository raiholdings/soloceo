<?php
/**
 * PayOS webhook callback → xác thực chữ ký → ghi nhận thanh toán vào WHMCS.
 * Đặt: /var/www/html/modules/gateways/callback/payos.php
 * URL webhook cấu hình ở PayOS: https://platform.soloceo.vn/modules/gateways/callback/payos.php
 */

require_once __DIR__ . "/../../../init.php";
require_once __DIR__ . "/../../../includes/gatewayfunctions.php";
require_once __DIR__ . "/../../../includes/invoicefunctions.php";

$gatewayModuleName = "payos";
$gatewayParams = getGatewayVariables($gatewayModuleName);
if (!$gatewayParams["type"]) {
    http_response_code(500);
    die("PayOS chưa kích hoạt");
}

$raw = file_get_contents("php://input");
$payload = json_decode($raw, true);
if (!$payload || empty($payload["data"])) {
    http_response_code(400);
    die("payload rỗng");
}

/** Xác thực chữ ký webhook: sort key data theo alphabet, nối k=v&, HMAC checksumKey */
function _payos_verify($data, $signature, $checksumKey)
{
    ksort($data);
    $pairs = [];
    foreach ($data as $k => $v) {
        if (is_array($v)) {
            $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        if ($v === null) {
            $v = "";
        }
        if ($v === true) {
            $v = "true";
        }
        if ($v === false) {
            $v = "false";
        }
        $pairs[] = $k . "=" . $v;
    }
    $str = implode("&", $pairs);
    $expected = hash_hmac("sha256", $str, $checksumKey);
    return hash_equals($expected, (string) $signature);
}

$data = $payload["data"];
$signature = $payload["signature"] ?? "";

if (!_payos_verify($data, $signature, $gatewayParams["checksumKey"])) {
    logTransaction($gatewayParams["name"], $payload, "Chữ ký không hợp lệ");
    http_response_code(400);
    die("sai chữ ký");
}

// Thanh toán thành công khi code == "00"
$success = ($payload["code"] ?? "") === "00";
$orderCode = $data["orderCode"] ?? "";
$amount = $data["amount"] ?? 0;
$transId = (string) ($data["reference"] ?? $orderCode);

// Map orderCode → invoiceId (đã lưu notes payos_order:<orderCode> khi tạo link)
$invoiceId = null;
$inv = Illuminate\Database\Capsule\Manager::table("tblinvoices")
    ->where("notes", "payos_order:" . $orderCode)
    ->first();
if ($inv) {
    $invoiceId = $inv->id;
} else {
    // fallback: orderCode = invoiceId + 4 số cuối timestamp → cắt 4 số cuối
    $invoiceId = (int) substr((string) $orderCode, 0, -4);
}

$invoiceId = checkCbInvoiceID($invoiceId, $gatewayParams["name"]);
checkCbTransID($transId);

if ($success) {
    addInvoicePayment($invoiceId, $transId, $amount, 0, $gatewayModuleName);
    logTransaction($gatewayParams["name"], $payload, "Thành công");
} else {
    logTransaction($gatewayParams["name"], $payload, "Chưa thanh toán / huỷ");
}

http_response_code(200);
echo json_encode(["success" => true]);
