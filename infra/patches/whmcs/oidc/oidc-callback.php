<?php
/**
 * "Đăng nhập bằng my.soloceo.vn" — bước 2: nhận code từ cầu OIDC api-core, đổi
 * lấy id_token (email + name), rồi TÁI DÙNG sso.php (HMAC) để auto-login WHMCS
 * (tìm/tạo client theo email → CreateSsoToken). Không cần mật khẩu.
 *
 * Đặt ở web-root WHMCS: platform.soloceo.vn/oidc-callback.php
 */
session_start();

$OIDC_TOKEN = "https://api.soloceo.vn/v1/oidc/token";
$CLIENT_ID = "whmcs-platform";
$REDIRECT_URI = "https://platform.soloceo.vn/oidc-callback.php";
// Cùng SECRET với sso.php (auto-login WHMCS)
$SSO_SECRET = "e171155858d9ea84a4b35239f0a765a029dec262b02b1f8ad06f3eecee0093fc";

function fail($msg)
{
    http_response_code(400);
    echo "<p>Đăng nhập không thành công: " . htmlspecialchars($msg) . "</p>";
    echo '<p><a href="/login">Quay lại đăng nhập</a></p>';
    exit;
}

$code = $_GET["code"] ?? "";
$state = $_GET["state"] ?? "";
if ($code === "") {
    fail("thiếu code");
}
if (empty($_SESSION["oidc_state"]) || !hash_equals($_SESSION["oidc_state"], $state)) {
    fail("state không hợp lệ (CSRF)");
}
unset($_SESSION["oidc_state"]);

// 1) Đổi code → token
$ch = curl_init($OIDC_TOKEN);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_POSTFIELDS => http_build_query([
        "grant_type" => "authorization_code",
        "code" => $code,
        "client_id" => $CLIENT_ID,
        "client_secret" => "unused",
        "redirect_uri" => $REDIRECT_URI,
    ]),
]);
$resp = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($httpCode < 200 || $httpCode >= 300 || !$resp) {
    fail("đổi code thất bại (" . $httpCode . ")");
}
$tok = json_decode($resp, true);
if (empty($tok["id_token"])) {
    fail("không có id_token");
}

// 2) Giải payload id_token (JWT) — lấy email + name.
//    (id_token đến trực tiếp từ api-core qua HTTPS server-to-server nên tin cậy.)
$parts = explode(".", $tok["id_token"]);
if (count($parts) < 2) {
    fail("id_token sai định dạng");
}
$payload = json_decode(
    base64_decode(strtr($parts[1], "-_", "+/")),
    true
);
$email = $payload["email"] ?? "";
$name = $payload["name"] ?? ($payload["preferred_username"] ?? "");
if ($email === "") {
    fail("tài khoản my.soloceo.vn chưa có email");
}

// 3) Tái dùng sso.php: token = base64url(email|exp|hmac_sha256(email|exp, SECRET))
$exp = time() + 120;
$sig = hash_hmac("sha256", $email . "|" . $exp, $SSO_SECRET);
$ssoToken = rtrim(strtr(base64_encode($email . "|" . $exp . "|" . $sig), "+/", "-_"), "=");

$ret = $_SESSION["oidc_return"] ?? "/clientarea.php";
unset($_SESSION["oidc_return"]);

$url = "/sso.php?token=" . urlencode($ssoToken) . "&name=" . urlencode($name);
header("Location: " . $url);
exit;
