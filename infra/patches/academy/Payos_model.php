<?php
defined('BASEPATH') or exit('No direct script access allowed');

/**
 * PayOS (QR chuyển khoản VN) cho Academy LMS — addon payment gateway.
 * Đặt: application/models/addons/Payos_model.php
 * keys (payment_gateways.keys json): { client_id, api_key, checksum_key }
 *
 * Luồng: Payment::create_payos_payment tạo payment-request + lưu orderCode vào
 * session 'payos_order_code' → redirect PayOS QR → PayOS về success_url/payos →
 * check_payos_payment xác minh trạng thái PAID qua API.
 */
class Payos_model extends CI_Model
{
    function __construct()
    {
        parent::__construct();
    }

    public function check_payos_payment($identifier = "")
    {
        $payment_gateway = $this->db->get_where('payment_gateways', ['identifier' => $identifier])->row_array();
        $keys = json_decode($payment_gateway['keys'], true);
        $client_id = isset($keys['client_id']) ? $keys['client_id'] : '';
        $api_key = isset($keys['api_key']) ? $keys['api_key'] : '';

        // orderCode: ưu tiên query PayOS trả về, fallback session
        $order_code = '';
        if (isset($_GET['orderCode']) && $_GET['orderCode'] !== '') {
            $order_code = preg_replace('/[^0-9]/', '', $_GET['orderCode']);
        }
        if ($order_code === '') {
            $order_code = $this->session->userdata('payos_order_code');
        }
        if ($order_code === '' || !$client_id || !$api_key) {
            return false;
        }

        $ch = curl_init("https://api-merchant.payos.vn/v2/payment-requests/" . $order_code);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => [
                "x-client-id: " . $client_id,
                "x-api-key: " . $api_key,
            ],
        ]);
        $resp = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($resp, true);

        // PayOS trả code "00" + data.status = "PAID" khi đã thanh toán
        if (isset($data['code']) && $data['code'] === '00'
            && isset($data['data']['status']) && $data['data']['status'] === 'PAID') {
            $this->session->unset_userdata('payos_order_code');
            return true;
        }
        return false;
    }
}
