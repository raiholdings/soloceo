<?php
$fixes = [
  '/var/www/html/modules/deals/deals.php' => [
    ['\'<span class="text-white">\' . _l(\'deals\') . \'</span>\'', '_l(\'deals\')'],
  ],
  '/var/www/html/modules/omni_sales/omni_sales.php' => [
    ['text-white qty_total', 'qty_total'],
  ],
];
foreach ($fixes as $p => $subs) {
  if (!is_file($p)) { echo "skip $p\n"; continue; }
  $s = file_get_contents($p); $n=0;
  foreach ($subs as $pair) { $c=0; $s=str_replace($pair[0],$pair[1],$s,$c); $n+=$c; }
  file_put_contents($p,$s);
  echo basename($p).": $n thay đổi\n";
}
