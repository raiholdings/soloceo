<?php

defined('BASEPATH') or exit('No direct script access allowed');

/**
 * @property Payos_gateway $payos_gateway
 */
class Payos extends App_Controller
{
    /** Đọc 1 khoá cấu hình đã giải mã */
    private function key($name)
    {
        return $this->payos_gateway->decryptSetting($name);
    }

    /** Ghi nhận thanh toán 1 lần (idempotent qua cột status của payos_pending) */
    private function settle($order_code)
    {
        $order_code = (int) $order_code;
        if ($order_code < 1) {
            return false;
        }
        $row = $this->db->select('order_code, invoiceid, invoice_hash, amount, status')
            ->where('order_code', $order_code)
            ->get(db_prefix() . 'payos_pending')->row();
        if (!$row || $row->status === 'PAID') {
            return false;
        }

        // Hỏi lại PayOS để xác thực trạng thái (nguồn sự thật)
        $client_id = $this->key('client_id');
        $api_key   = $this->key('api_key');
        $ch        = curl_init('https://api-merchant.payos.vn/v2/payment-requests/' . $order_code);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 25,
            CURLOPT_HTTPHEADER     => ['x-client-id: ' . $client_id, 'x-api-key: ' . $api_key],
        ]);
        $resp = json_decode(curl_exec($ch), true);
        curl_close($ch);

        $status = isset($resp['data']['status']) ? $resp['data']['status'] : '';
        if ($status !== 'PAID') {
            return false;
        }

        $success = $this->payos_gateway->addPayment([
            'amount'        => $row->amount,
            'invoiceid'     => $row->invoiceid,
            'paymentmethod' => 'PayOS',
            'transactionid' => 'PayOS-' . $order_code,
        ]);
        if ($success) {
            $this->db->where('order_code', $order_code)->update(db_prefix() . 'payos_pending', ['status' => 'PAID']);
        }
        return $success ? $row : false;
    }

    /** Return URL sau khi khách thanh toán (trình duyệt khách quay lại) */
    public function verify()
    {
        $invoice_id   = $this->input->get('invoiceid');
        $invoice_hash = $this->input->get('hash');
        if (!$invoice_id || !$invoice_hash) {
            die('unknown transaction');
        }
        check_invoice_restrictions($invoice_id, $invoice_hash);

        $order_code = (int) $this->input->get('orderCode');
        if ($order_code) {
            $row = $this->settle($order_code);
            if ($row) {
                set_alert('success', _l('online_payment_recorded_success'));
            } else {
                // Có thể webhook đã ghi nhận trước, hoặc chưa thanh toán xong
                set_alert('warning', _l('online_payment_recorded_success'));
            }
        }
        redirect(site_url('invoice/' . $invoice_id . '/' . $invoice_hash));
    }

    /**
     * Webhook PayOS (server-to-server). URI đã loại khỏi CSRF.
     * PHẢI trả HTTP 200 cho ping xác thực khi thêm webhook URL vào kênh PayOS.
     */
    public function webhook()
    {
        header('Content-Type: application/json');
        $payload = json_decode(file_get_contents('php://input'), true);
        if (!$payload || empty($payload['data'])) {
            http_response_code(200);
            echo json_encode(['success' => true]);
            return;
        }

        $checksum_key = $this->key('checksum_key');
        $data         = $payload['data'];
        ksort($data);
        $pairs = [];
        foreach ($data as $k => $v) {
            if (is_array($v)) {
                $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            if ($v === null) {
                $v = '';
            }
            if ($v === true) {
                $v = 'true';
            }
            if ($v === false) {
                $v = 'false';
            }
            $pairs[] = $k . '=' . $v;
        }
        $expected = hash_hmac('sha256', implode('&', $pairs), $checksum_key);
        if (!hash_equals($expected, (string) ($payload['signature'] ?? ''))) {
            http_response_code(200);
            echo json_encode(['success' => true]);
            return;
        }

        $order_code = isset($payload['data']['orderCode']) ? (int) $payload['data']['orderCode'] : 0;
        if (($payload['code'] ?? '') === '00' && $order_code > 0) {
            $this->settle($order_code);
        }

        http_response_code(200);
        echo json_encode(['success' => true]);
    }
}
