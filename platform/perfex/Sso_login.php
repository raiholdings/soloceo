<?php
defined('BASEPATH') or exit('No direct script access allowed');
/* SoloCEO SSO auto-login — nhận token HMAC ký từ SoloCEO (server-side), đăng nhập staff admin
   của tenant (theo subdomain) rồi vào /admin. Secret giữ server-side, token hết hạn nhanh. */
class Sso_login extends App_Controller
{
    public function index()
    {
        $token = (string) $this->input->get('token');
        $raw   = base64_decode(strtr($token, '-_', '+/'));
        $parts = explode('|', $raw);
        if (count($parts) !== 3) {
            show_404();
        }
        list($email, $expiry, $sig) = $parts;
        if (!defined('SOLOCEO_SSO_SECRET') || !SOLOCEO_SSO_SECRET) {
            show_404();
        }
        if (!ctype_digit($expiry) || time() > (int) $expiry) {
            show_error('Liên kết đăng nhập đã hết hạn. Vui lòng mở lại CRM.', 403);
        }
        $expected = hash_hmac('sha256', $email . '|' . $expiry, SOLOCEO_SSO_SECRET);
        if (!hash_equals($expected, $sig)) {
            show_404();
        }
        $staff = $this->db->where('email', $email)->where('active', 1)->get(db_prefix() . 'staff')->row();
        if (!$staff) {
            show_error('Không tìm thấy tài khoản trong CRM này.', 404);
        }
        $this->session->set_userdata([
            'staff_user_id'   => $staff->staffid,
            'staff_logged_in' => true,
        ]);
        redirect(admin_url());
    }

    /* Nâng cấp DB tenant lên bản migration mới nhất. Gọi:
       /sso_login/upgrade?key=<SOLOCEO_SSO_SECRET> — chạy trên subdomain tenant (SaaS tự chọn DB). */
    public function upgrade()
    {
        $key = (string) $this->input->get('key');
        if (!defined('SOLOCEO_SSO_SECRET') || !SOLOCEO_SSO_SECRET || !hash_equals(SOLOCEO_SSO_SECRET, $key)) {
            show_404();
        }
        header('Content-Type: application/json; charset=utf-8');
        if (!$this->app->is_db_upgrade_required()) {
            echo json_encode(['success' => true, 'message' => 'already_current', 'version' => $this->app->get_current_db_version()]);
            return;
        }
        $result            = $this->app->upgrade_database();
        $result['version'] = $this->app->get_current_db_version();
        echo json_encode($result);
    }
}
