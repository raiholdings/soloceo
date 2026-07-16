<?php
/**
 * Chèn nút "Đăng nhập bằng my.soloceo.vn" vào trang login WHMCS.
 * Đặt ở /var/www/html/includes/hooks/soloceo_oidc_login.php
 */
if (!defined("WHMCS")) {
    die("Access denied");
}

add_hook("ClientAreaFooterOutput", 1, function ($vars) {
    $filename = isset($vars["filename"]) ? $vars["filename"] : "";
    if ($filename !== "login" && $filename !== "clientarea") {
        // chỉ trang login (một số theme dùng clientarea?redirect)
        if (strpos($_SERVER["REQUEST_URI"] ?? "", "login") === false) {
            return "";
        }
    }
    $btn = '<a href="/oidc-login.php" class="btn btn-primary btn-block" '
        . 'style="margin-top:10px;background:#7C5CFF;border-color:#7C5CFF;display:block">'
        . '<i class="fas fa-user-circle"></i> Đăng nhập bằng my.soloceo.vn</a>';
    // Chèn nút vào dưới form đăng nhập
    return <<<HTML
<script>
(function(){
  try{
    var form = document.getElementById('login') || document.querySelector('form[action*="dologin"]') || document.querySelector('.login-form form');
    if(!form){ return; }
    if(document.getElementById('soloceo-oidc-btn')){ return; }
    var wrap = document.createElement('div');
    wrap.id='soloceo-oidc-btn';
    wrap.style.marginTop='14px';
    wrap.innerHTML='<div style="text-align:center;color:#888;margin:8px 0;font-size:12px">hoặc</div>$btn';
    form.parentNode.insertBefore(wrap, form.nextSibling);
  }catch(e){}
})();
</script>
HTML;
});
