<?php
/**
 * WHMCS Payment Gateway "PayOS" (VN — QR chuyển khoản).
 *
 * Khép kín dòng tiền v1.1: CEO thanh toán hoá đơn PaaS/tên miền bằng QR ngân
 * hàng → PayOS webhook báo về → WHMCS đánh dấu hoá đơn Paid → order active →
 * module server "soloceo" tự provision.
 *
 * Đặt: /var/www/html/modules/gateways/payos.php
 * Điền 3 khoá trong Admin > Payments > PayOS (Thư dán từ dashboard PayOS):
 *   Client ID, API Key, Checksum Key.
 *
 * PayOS API: https://api-merchant.payos.vn/v2/payment-requests
 * Chữ ký: HMAC_SHA256(sorted "amount=..&cancelUrl=..&description=..&orderCode=..&returnUrl=..", checksumKey)
 */

if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

function payos_MetaData()
{
    return [
        "DisplayName" => "PayOS (QR chuyển khoản VN)",
        "APIVersion" => "1.1",
        "DisableLocalCreditCardInput" => true,
        "TokenisedStorage" => false,
    ];
}

function payos_config()
{
    return [
        "FriendlyName" => [
            "Type" => "System",
            "Value" => "PayOS — QR chuyển khoản (VN)",
        ],
        "clientId" => [
            "FriendlyName" => "Client ID",
            "Type" => "text",
            "Size" => "40",
            "Description" => "Từ dashboard PayOS",
        ],
        "apiKey" => [
            "FriendlyName" => "API Key",
            "Type" => "password",
            "Size" => "40",
            "Description" => "Từ dashboard PayOS",
        ],
        "checksumKey" => [
            "FriendlyName" => "Checksum Key",
            "Type" => "password",
            "Size" => "80",
            "Description" => "Dùng ký/verify chữ ký PayOS",
        ],
    ];
}

/** Chữ ký tạo payment-request: sort field theo alphabet rồi HMAC */
function _payos_sign_create($data, $checksumKey)
{
    // PayOS quy định thứ tự: amount, cancelUrl, description, orderCode, returnUrl
    $str = "amount=" . $data["amount"]
        . "&cancelUrl=" . $data["cancelUrl"]
        . "&description=" . $data["description"]
        . "&orderCode=" . $data["orderCode"]
        . "&returnUrl=" . $data["returnUrl"];
    return hash_hmac("sha256", $str, $checksumKey);
}

/** Nút thanh toán: tạo payment link PayOS + chuyển hướng (hoặc hiện QR) */
function payos_link($params)
{
    if (empty($params["clientId"]) || empty($params["apiKey"]) || empty($params["checksumKey"])) {
        return '<div class="alert alert-warning">Cổng PayOS chưa được cấu hình khoá. '
            . 'Vui lòng liên hệ quản trị.</div>';
    }

    $invoiceId = $params["invoiceid"];
    $amount = (int) round($params["amount"]); // PayOS = VND nguyên
    $systemUrl = rtrim($params["systemurl"], "/");
    $returnUrl = $systemUrl . "/viewinvoice.php?id=" . $invoiceId;
    $callbackUrl = $systemUrl . "/modules/gateways/callback/payos.php";

    // orderCode phải là số nguyên duy nhất — dùng invoiceId + timestamp ngắn
    $orderCode = (int) ($invoiceId . substr((string) time(), -4));
    $desc = "SoloCEO HD" . $invoiceId; // PayOS giới hạn 25 ký tự

    $body = [
        "orderCode" => $orderCode,
        "amount" => $amount,
        "description" => $desc,
        "returnUrl" => $returnUrl,
        "cancelUrl" => $returnUrl,
    ];
    $body["signature"] = _payos_sign_create([
        "amount" => $amount,
        "cancelUrl" => $returnUrl,
        "description" => $desc,
        "orderCode" => $orderCode,
        "returnUrl" => $returnUrl,
    ], $params["checksumKey"]);
    $body["webhookUrl"] = $callbackUrl;

    $ch = curl_init("https://api-merchant.payos.vn/v2/payment-requests");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => [
            "x-client-id: " . $params["clientId"],
            "x-api-key: " . $params["apiKey"],
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode($body),
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    $r = json_decode($resp, true);

    if (($r["code"] ?? "") !== "00" || empty($r["data"]["checkoutUrl"])) {
        return '<div class="alert alert-danger">Không tạo được thanh toán PayOS'
            . (isset($r["desc"]) ? ": " . htmlspecialchars($r["desc"]) : "")
            . '</div>';
    }

    // Lưu orderCode để callback đối chiếu invoice
    try {
        Illuminate\Database\Capsule\Manager::table("tblinvoices")
            ->where("id", $invoiceId)
            ->update(["notes" => "payos_order:" . $orderCode]);
    } catch (\Throwable $e) {
    }

    $checkoutUrl = htmlspecialchars($r["data"]["checkoutUrl"]);
    return '<form action="' . $checkoutUrl . '" method="get">'
        . '<input type="submit" class="btn btn-primary" value="Thanh toán QR qua PayOS" />'
        . '</form>';
}
