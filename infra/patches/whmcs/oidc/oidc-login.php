<?php
/**
 * "Đăng nhập bằng my.soloceo.vn" — bước 1: chuyển hướng sang cầu OIDC api-core
 * (backed WoWonder cộng đồng). Đặt ở web-root WHMCS: platform.soloceo.vn/oidc-login.php
 */
session_start();

$OIDC_AUTHORIZE = "https://api.soloceo.vn/v1/oidc/authorize";
$CLIENT_ID = "whmcs-platform";
$REDIRECT_URI = "https://platform.soloceo.vn/oidc-callback.php";

$state = bin2hex(random_bytes(16));
$_SESSION["oidc_state"] = $state;
// nơi quay lại sau khi đăng nhập (mặc định client area)
$_SESSION["oidc_return"] = isset($_GET["return"]) ? $_GET["return"] : "/clientarea.php";

$q = http_build_query([
    "client_id" => $CLIENT_ID,
    "redirect_uri" => $REDIRECT_URI,
    "response_type" => "code",
    "scope" => "openid email profile",
    "state" => $state,
]);
header("Location: " . $OIDC_AUTHORIZE . "?" . $q);
exit;
