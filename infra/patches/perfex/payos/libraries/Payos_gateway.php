<?php

defined('BASEPATH') or exit('No direct script access allowed');

/**
 * PayOS gateway cho Perfex CRM — QR chuyển khoản ngân hàng VN.
 * Redirect-based (giống Paystack): tạo payment-request → chuyển hướng checkoutUrl.
 * Xác nhận qua controller Payos_gateway::verify (return, hỏi lại PayOS API) +
 * ::webhook (server-to-server). Khoá client_id/api_key/checksum_key nhập trong
 * Admin → Cài đặt → Cổng thanh toán → PayOS (mỗi tenant tự nhập khoá của mình).
 */
class Payos_gateway extends App_gateway
{
    public function __construct()
    {
        parent::__construct();
        $this->ci = &get_instance();

        $this->setId('payos');
        $this->setName('PayOS (QR chuyển khoản VN)');

        $this->setSettings(
            [
                [
                    'name'      => 'client_id',
                    'encrypted' => true,
                    'label'     => 'PayOS Client ID',
                ],
                [
                    'name'      => 'api_key',
                    'encrypted' => true,
                    'label'     => 'PayOS API Key',
                ],
                [
                    'name'      => 'checksum_key',
                    'encrypted' => true,
                    'label'     => 'PayOS Checksum Key',
                ],
                [
                    'name'          => 'currencies',
                    'label'         => 'settings_paymentmethod_currencies',
                    'default_value' => 'VND',
                ],
            ]
        );
    }

    /**
     * Bảng lưu ánh xạ orderCode → invoice (tự tạo trên DB đang hoạt động — an toàn
     * cho SaaS đa tenant, mỗi tenant 1 DB riêng nên tạo khi dùng lần đầu).
     */
    private function ensurePendingTable(): void
    {
        $table = db_prefix() . 'payos_pending';
        $this->ci->db->query('CREATE TABLE IF NOT EXISTS ' . $table . ' (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_code BIGINT,
            invoiceid INT,
            invoice_hash VARCHAR(64),
            amount DECIMAL(18,2),
            status VARCHAR(20) DEFAULT "PENDING",
            created INT,
            INDEX(order_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    }

    public function process_payment(array $data): void
    {
        $this->ensurePendingTable();

        $client_id    = $this->decryptSetting('client_id');
        $api_key      = $this->decryptSetting('api_key');
        $checksum_key = $this->decryptSetting('checksum_key');

        if (!$client_id || !$api_key || !$checksum_key) {
            set_alert('danger', 'PayOS chưa được cấu hình đầy đủ (thiếu khoá).');
            redirect($_SERVER['HTTP_REFERER'] ?? site_url());
            return;
        }

        $invoiceid = (int) $data['invoiceid'];
        $hash      = $data['invoice']->hash;
        // PayOS chỉ nhận VND, số nguyên. Hoá đơn CRM nên đặt tiền tệ VND.
        $amount = (int) round((float) $data['amount']);
        if ($amount < 1) {
            set_alert('danger', 'Số tiền không hợp lệ cho PayOS.');
            redirect(site_url('invoice/' . $invoiceid . '/' . $hash));
            return;
        }

        $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
        $desc       = 'SoloCEO CRM';
        $return_url = site_url('payos/verify?invoiceid=' . $invoiceid . '&hash=' . $hash);
        $cancel_url = site_url('invoice/' . $invoiceid . '/' . $hash);

        $sign_str = 'amount=' . $amount . '&cancelUrl=' . $cancel_url . '&description=' . $desc
            . '&orderCode=' . $order_code . '&returnUrl=' . $return_url;
        $signature = hash_hmac('sha256', $sign_str, $checksum_key);

        $body = [
            'orderCode'   => $order_code,
            'amount'      => $amount,
            'description' => $desc,
            'returnUrl'   => $return_url,
            'cancelUrl'   => $cancel_url,
            'signature'   => $signature,
        ];

        $ch = curl_init('https://api-merchant.payos.vn/v2/payment-requests');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_TIMEOUT        => 25,
            CURLOPT_HTTPHEADER     => [
                'x-client-id: ' . $client_id,
                'x-api-key: ' . $api_key,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($body),
        ]);
        $r = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (isset($r['code']) && $r['code'] === '00' && !empty($r['data']['checkoutUrl'])) {
            $this->ci->db->insert(db_prefix() . 'payos_pending', [
                'order_code'   => $order_code,
                'invoiceid'    => $invoiceid,
                'invoice_hash' => $hash,
                'amount'       => $amount,
                'status'       => 'PENDING',
                'created'      => time(),
            ]);
            header('Location: ' . $r['data']['checkoutUrl']);
            die;
        }

        set_alert('danger', 'Không tạo được thanh toán PayOS' . (isset($r['desc']) ? ': ' . $r['desc'] : '') . '.');
        redirect(site_url('invoice/' . $invoiceid . '/' . $hash));
    }
}
