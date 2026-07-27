<?php
defined('BASEPATH') or exit('No direct script access allowed');
/* Auto-SSO từ SoloCEO workspace → Academy LMS. /edu_sso?token=base64url(email|expiry|hmac).
   Verify HMAC (EDU_SSO_SECRET) + hết hạn → tạo/tìm user theo email → set session → vào học.
   Dùng cho nhúng iframe trong soloceo.vn/workspace (CEO đã đăng nhập workspace). */
class Edu_sso extends CI_Controller
{
    private $secret = 'ede1a355b214b714b878879a4047e125b9c7b2d55a7595cc9a7d914f40c2b587';

    public function __construct()
    {
        parent::__construct();
        $this->load->database();
        $this->load->library('session');
        $this->load->helper('user');
    }

    public function index()
    {
        $token = (string) $this->input->get('token');
        $raw   = base64_decode(strtr($token, '-_', '+/'));
        $parts = explode('|', $raw);
        if (count($parts) !== 3) { show_error('Token không hợp lệ.', 403); return; }
        list($email, $expiry, $sig) = $parts;
        if (!ctype_digit($expiry) || time() > (int) $expiry) { show_error('Liên kết đã hết hạn.', 403); return; }
        $expected = hash_hmac('sha256', $email . '|' . $expiry, $this->secret);
        if (!hash_equals($expected, $sig)) { show_error('Chữ ký không hợp lệ.', 403); return; }

        $name  = (string) $this->input->get('name');
        $first = $name !== '' ? $name : explode('@', $email)[0];

        $row = $this->db->where('email', $email)->get('users')->row();
        if (!$row) {
            $this->db->query("SET SESSION sql_mode=''");
            $this->db->insert('users', [
                'first_name'    => $first, 'last_name' => '', 'email' => $email,
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
