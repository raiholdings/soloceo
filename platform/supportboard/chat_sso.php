<?php
/**
 * SSO bridge SoloCEO workspace → Support Board SaaS.
 * Nhận ?magic=<enc> (do account/api.php action=magic-link sinh), đăng nhập tài khoản
 * cloud của CEO (set cookie sb-cloud + sb-login), rồi vào thẳng hộp thư chat của CEO
 * (/script/admin.php). Đặt lại cookie SameSite=None để sống trong iframe workspace.
 * Đặt tại /var/www/html/account/chat_sso.php.
 * ob_start(): SB include (email.php) phát output/BOM khi nạp → nếu không đệm thì
 * "headers already sent" khiến setcookie thất bại (mất phiên).
 */
ob_start();
require_once(__DIR__ . '/functions.php');
if (function_exists('sb_cloud_load')) {
    sb_cloud_load();
}

if (!empty($_GET['magic'])) {
    $login = account_magic_link_login($_GET['magic']);
    if ($login && is_array($login) && count($login) > 1) {
        $exp = time() + 315360000;
        $opt = ['expires' => $exp, 'path' => '/', 'secure' => true, 'httponly' => false, 'samesite' => 'None'];
        setcookie('sb-cloud', $login[0], $opt);
        setcookie('sb-login', $login[1], $opt);
        $target = (isset($_GET['target']) && $_GET['target'] === 'account') ? '/account' : '/script/admin.php';
        ob_end_clean();
        header('Location: ' . $target);
        exit;
    }
}
http_response_code(403);
header('Content-Type: text/html; charset=utf-8');
echo '<div style="font-family:sans-serif;max-width:460px;margin:80px auto;text-align:center"><h3>Không mở được chat</h3><p>Liên kết đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng tải lại trang.</p></div>';
