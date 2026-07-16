<?php

defined('BASEPATH') or exit('No direct script access allowed');
/*
Module Name: PayOS Gateway
Description: Thanh toán hoá đơn bằng PayOS (QR chuyển khoản ngân hàng Việt Nam) cho SoloCEO CRM.
Author: RAI Holdings — SoloCEO
Version: 1.0.0
Requires at least: 3.0.*
*/

// gateway (thư viện Payos_gateway) + module 'payos'. Controller đặt tên Payos
// (KHÁC tên lớp thư viện Payos_gateway) để tránh trùng khai báo class → fatal.
register_payment_gateway('payos_gateway', 'payos');
