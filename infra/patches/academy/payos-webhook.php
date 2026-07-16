<?php
/**
 * Webhook PayOS cho Academy — đặt ở webroot: /var/www/html/payos-webhook.php
 * URL khai trong kênh PayOS của Academy: https://edu.soloceo.vn/payos-webhook.php
 *
 * Academy ghi danh (enroll) theo luồng return-verify (Payment::success_course_payment
 * → Payos_model::check_payos_payment gọi API PayOS xác minh PAID). Webhook này là
 * điểm nhận xác nhận từ PayOS để: (1) kênh PayOS validate được URL, (2) log lại.
 * Trả 200 để PayOS coi là nhận thành công. Không tự ghi danh ở đây (tránh double
 * enroll + không có session người mua trong ngữ cảnh server-to-server).
 */
header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

// Ghi log tối giản (không chứa khoá) để đối soát
$log = date('c') . ' payos-webhook '
    . (isset($payload['code']) ? 'code=' . $payload['code'] : 'nodata')
    . (isset($payload['data']['orderCode']) ? ' order=' . $payload['data']['orderCode'] : '')
    . "\n";
@file_put_contents(__DIR__ . '/payos-webhook.log', $log, FILE_APPEND);

http_response_code(200);
echo json_encode(['success' => true]);
