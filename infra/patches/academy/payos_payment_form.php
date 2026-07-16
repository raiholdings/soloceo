<?php
// PayOS payment form (Academy) — đặt: application/views/payment-global/payos/payment_form.php
// Nút redirect sang controller tạo payment-request PayOS + QR. Ẩn tới khi được chọn
// (class .gateway ẩn mặc định; JS selectedPaymentGateway hiện .{identifier}-gateway).
?>
<a href="<?php echo site_url('payment/create_payos_payment'); ?>"
   class="gateway <?php echo $payment_gateway['identifier']; ?>-gateway payment-button float-end"
   style="background-color:#00a862;color:#fff;text-align:center;text-decoration:none;">
    <?php echo get_phrase('pay_with_payos') ? get_phrase('pay_with_payos') : 'Thanh toán QR qua PayOS'; ?>
</a>
