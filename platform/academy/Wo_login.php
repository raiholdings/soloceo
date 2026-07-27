<?php
defined('BASEPATH') or exit('No direct script access allowed');
/* SSO my.soloceo.vn (WoWonder) → Academy LMS.
   /wo_login → chuyển sang OAuth WoWonder; callback đổi code→user→tạo/tìm user Academy + set session. */
class Wo_login extends CI_Controller
{
    private $app_id     = 'edub66d818a9f009eeb';
    private $app_secret = '04c9938dfd53daa14e257368fa47d79e';
    private $wo         = 'https://my.soloceo.vn';

    public function __construct()
    {
        parent::__construct();
        $this->load->helper('user');
    }

    public function index()
    {
        $code = $this->input->get('code');
        if (!$code) {
            redirect($this->wo . '/oauth?app_id=' . $this->app_id);
            return;
        }
        $tok    = json_decode(@file_get_contents($this->wo . '/authorize?app_id=' . $this->app_id . '&app_secret=' . $this->app_secret . '&code=' . urlencode($code)), true);
        $access = isset($tok['access_token']) ? $tok['access_token'] : null;
        if (!$access) {
            show_error('Đăng nhập bằng my.soloceo.vn thất bại (mã không hợp lệ hoặc hết hạn).', 400);
            return;
        }
        $ud = json_decode(@file_get_contents($this->wo . '/app_api?access_token=' . urlencode($access) . '&type=get_user_data'), true);
        $u  = isset($ud['user_data']) ? $ud['user_data'] : null;
        if (!$u || empty($u['username'])) {
            show_error('Không lấy được thông tin tài khoản cộng đồng.', 400);
            return;
        }
        $email = !empty($u['email']) ? $u['email'] : ($u['username'] . '@my.soloceo.vn');
        $first = !empty($u['first_name']) ? $u['first_name'] : $u['username'];
        $last  = isset($u['last_name']) ? $u['last_name'] : '';

        $row = $this->db->where('email', $email)->get('users')->row();
        if (!$row) {
            $this->db->query("SET SESSION sql_mode=''");
            $this->db->insert('users', [
                'first_name'    => $first, 'last_name' => $last, 'email' => $email,
                'password'      => sha1(uniqid('', true)), 'role_id' => 2, 'status' => 1,
                'is_instructor' => 0, 'date_added' => time(), 'last_modified' => time(),
            ]);
            $row = $this->db->where('email', $email)->get('users')->row();
        }
        $this->session->set_userdata('user_id', $row->id);
        $this->session->set_userdata('role_id', $row->role_id);
        $this->session->set_userdata('role', get_user_role('user_role', $row->id));
        $this->session->set_userdata('name', $row->first_name . ' ' . $row->last_name);
        $this->session->set_userdata('is_instructor', $row->is_instructor);
        $this->session->set_userdata('user_login', '1');
        redirect(site_url($row->role_id == 1 ? 'admin' : 'home'));
    }
}
