<?php
/**
 * Trang nhập khoá PayOS cho WoWonder (chỉ admin đã đăng nhập). Bạn tự nhập khoá
 * ở đây — Claude không nhập khoá tài chính. Đặt webroot: /var/www/html/payos-admin.php
 * Truy cập: https://my.soloceo.vn/payos-admin.php  (phải đang đăng nhập admin)
 */
error_reporting(0);
require_once('assets/init.php');
decryptConfigData();
global $sqlConnect, $wo;

if (empty($wo['loggedin']) || empty($wo['user']['admin']) || $wo['user']['admin'] != 1) {
    http_response_code(403);
    echo 'Chỉ admin. Hãy đăng nhập tài khoản admin WoWonder rồi mở lại trang này.';
    exit();
}

function _payos_set($sqlConnect, $name, $value)
{
    $name = mysqli_real_escape_string($sqlConnect, $name);
    $value = mysqli_real_escape_string($sqlConnect, $value);
    $ex = mysqli_num_rows(mysqli_query($sqlConnect, "SELECT 1 FROM Wo_Config WHERE name='$name'"));
    if ($ex) {
        mysqli_query($sqlConnect, "UPDATE Wo_Config SET value='$value' WHERE name='$name'");
    } else {
        mysqli_query($sqlConnect, "INSERT INTO Wo_Config (name,value) VALUES ('$name','$value')");
    }
}

$saved = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    _payos_set($sqlConnect, 'payos_client_id', trim($_POST['client_id'] ?? ''));
    _payos_set($sqlConnect, 'payos_api_key', trim($_POST['api_key'] ?? ''));
    _payos_set($sqlConnect, 'payos_checksum_key', trim($_POST['checksum_key'] ?? ''));
    _payos_set($sqlConnect, 'payos', (!empty($_POST['enable']) ? 'yes' : 'no'));
    $saved = true;
}

$get = function ($n) use ($sqlConnect) {
    $r = mysqli_fetch_assoc(mysqli_query($sqlConnect, "SELECT value FROM Wo_Config WHERE name='$n'"));
    return $r ? $r['value'] : '';
};
$cid = $get('payos_client_id'); $api = $get('payos_api_key'); $chk = $get('payos_checksum_key');
$en = $get('payos');
$mask = function ($v) { return $v === '' ? '' : (substr($v, 0, 4) . str_repeat('•', max(0, strlen($v) - 8)) . substr($v, -4)); };
?><!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cấu hình PayOS — WoWonder</title>
<style>body{font-family:system-ui,Arial;max-width:560px;margin:40px auto;padding:0 16px;color:#222}
input[type=text]{width:100%;padding:10px;margin:6px 0 14px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box}
label{font-weight:600;font-size:14px}.btn{background:#00a862;color:#fff;border:0;padding:12px 20px;border-radius:8px;font-size:15px;cursor:pointer}
.ok{background:#e6f7ee;color:#00733f;padding:10px;border-radius:8px;margin-bottom:14px}.hint{color:#777;font-size:13px}</style>
</head><body>
<h2>Cấu hình PayOS cho Cộng đồng (my.soloceo.vn)</h2>
<?php if ($saved): ?><div class="ok">✅ Đã lưu. Nút "PayOS" sẽ xuất hiện khi thành viên nâng cấp Pro.</div><?php endif; ?>
<p class="hint">Lấy 3 khoá từ <b>kênh PayOS riêng của Cộng đồng</b> (webhook URL của kênh này = <code>https://my.soloceo.vn/payos-webhook.php</code>).</p>
<form method="post">
<label>Client ID</label><input type="text" name="client_id" value="<?php echo htmlspecialchars($cid); ?>" placeholder="<?php echo $mask($cid); ?>">
<label>API Key</label><input type="text" name="api_key" value="<?php echo htmlspecialchars($api); ?>" placeholder="<?php echo $mask($api); ?>">
<label>Checksum Key</label><input type="text" name="checksum_key" value="<?php echo htmlspecialchars($chk); ?>" placeholder="<?php echo $mask($chk); ?>">
<label><input type="checkbox" name="enable" value="1" <?php echo ($en === 'yes' ? 'checked' : ''); ?>> Bật PayOS</label><br><br>
<button class="btn" type="submit">Lưu cấu hình PayOS</button>
</form>
</body></html>
