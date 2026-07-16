<?php

defined('BASEPATH') or exit('No direct script access allowed');

class Migration_Version_100 extends App_module_migration
{
    public function up()
    {
        $table = db_prefix() . 'payos_pending';
        $this->db->query('CREATE TABLE IF NOT EXISTS ' . $table . ' (
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
}
