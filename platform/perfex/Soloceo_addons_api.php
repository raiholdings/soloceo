<?php
defined('BASEPATH') or exit('No direct script access allowed');
/* API đọc/ghi danh sách addon CEO đã bật cho TENANT hiện tại (theo subdomain).
   Gate bằng SOLOCEO_SSO_SECRET (gọi server-to-server từ workspace SoloCEO).
   /soloceo_addons_api?key=SECRET&action=list  → {"enabled":[...]}
   /soloceo_addons_api?key=SECRET&action=set  (POST enabled=JSON) → lưu option soloceo_addons. */
class Soloceo_addons_api extends App_Controller
{
    public function index()
    {
        $key = (string) ($this->input->get('key') ?: $this->input->post('key'));
        if (!defined('SOLOCEO_SSO_SECRET') || !SOLOCEO_SSO_SECRET || !hash_equals(SOLOCEO_SSO_SECRET, $key)) {
            show_404();
        }
        header('Content-Type: application/json; charset=utf-8');
        $all = explode(',', defined('SOLOCEO_ADDONS_ALL') ? SOLOCEO_ADDONS_ALL : '');

        if ($this->input->get('action') === 'set') {
            $enabled = json_decode((string) ($this->input->get('enabled') ?: $this->input->post('enabled')), true);
            if (!is_array($enabled)) {
                $enabled = [];
            }
            // chỉ giữ slug hợp lệ (nếu biết danh sách)
            if (!empty($all)) {
                $enabled = array_values(array_intersect($enabled, $all));
            } else {
                $enabled = array_values($enabled);
            }
            update_option('soloceo_addons', json_encode($enabled));
            echo json_encode(['ok' => true, 'enabled' => $enabled]);
            return;
        }

        $raw     = get_option('soloceo_addons');
        $enabled = $raw ? json_decode($raw, true) : [];
        echo json_encode(['enabled' => is_array($enabled) ? $enabled : []]);
    }
}
