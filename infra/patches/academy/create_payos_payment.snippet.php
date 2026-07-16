    // ===== PayOS (QR chuyển khoản VN) — SoloCEO =====
    // Tạo payment-request PayOS server-side rồi redirect sang trang QR.
    function create_payos_payment()
    {
        $payment_details = $this->session->userdata('payment_details');
        if (!$payment_details) {
            redirect(site_url(), 'refresh');
        }
        $pg = $this->db->get_where('payment_gateways', ['identifier' => 'payos'])->row_array();
        $keys = json_decode($pg['keys'], true);
        $client_id = isset($keys['client_id']) ? $keys['client_id'] : '';
        $api_key = isset($keys['api_key']) ? $keys['api_key'] : '';
        $checksum_key = isset($keys['checksum_key']) ? $keys['checksum_key'] : '';

        if (!$client_id || !$api_key || !$checksum_key) {
            $this->session->set_flashdata('flash_message', 'Cổng PayOS chưa cấu hình khoá.');
            redirect('home/shopping_cart', 'refresh');
        }

        $amount = (int) round($payment_details['total_payable_amount']);
        // orderCode duy nhất (<= 9007199254740991); PayOS description <= 25 ký tự
        $order_code = (int) (substr((string) time(), -8) . rand(10, 99));
        $desc = 'SoloCEO Academy';
        $return_url = $payment_details['success_url'] . '/payos';
        $cancel_url = $payment_details['cancel_url'];

        $sign_str = "amount=" . $amount . "&cancelUrl=" . $cancel_url
            . "&description=" . $desc . "&orderCode=" . $order_code
            . "&returnUrl=" . $return_url;
        $signature = hash_hmac('sha256', $sign_str, $checksum_key);

        $body = [
            "orderCode" => $order_code,
            "amount" => $amount,
            "description" => $desc,
            "returnUrl" => $return_url,
            "cancelUrl" => $cancel_url,
            "signature" => $signature,
        ];

        $ch = curl_init("https://api-merchant.payos.vn/v2/payment-requests");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_HTTPHEADER => [
                "x-client-id: " . $client_id,
                "x-api-key: " . $api_key,
                "Content-Type: application/json",
            ],
            CURLOPT_POSTFIELDS => json_encode($body),
        ]);
        $resp = curl_exec($ch);
        curl_close($ch);
        $r = json_decode($resp, true);

        if (isset($r['code']) && $r['code'] === '00' && !empty($r['data']['checkoutUrl'])) {
            $this->session->set_userdata('payos_order_code', (string) $order_code);
            redirect($r['data']['checkoutUrl']);
        }

        $this->session->set_flashdata('flash_message',
            'Không tạo được thanh toán PayOS' . (isset($r['desc']) ? ': ' . $r['desc'] : ''));
        redirect('home/shopping_cart', 'refresh');
    }
    // ===== end PayOS =====
