#!/bin/bash
# Cài module tên miền Nhân Hòa vào WHMCS. Chạy trên tenant-03 (82.197.71.41).
# Idempotent: chạy lại nhiều lần không hỏng gì.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
C=${WHMCS_CONTAINER:-whmcs}
W=/var/www/html
TS=$(date +%Y%m%d-%H%M%S)

echo "→ sao lưu module hiện có"
docker exec "$C" sh -c "[ -d $W/modules/registrars/nhanhoa ] && cp -a $W/modules/registrars/nhanhoa $W/modules/registrars/nhanhoa.bak-$TS || mkdir -p $W/modules/registrars/nhanhoa"

echo "→ chép module + trường bổ sung .vn"
docker cp "$HERE/nhanhoa.php"        "$C:$W/modules/registrars/nhanhoa/nhanhoa.php"
docker cp "$HERE/logo.gif"           "$C:$W/modules/registrars/nhanhoa/logo.gif"
docker cp "$HERE/additionalfields.php" "$C:$W/resources/domains/additionalfields.php"

echo "→ vá HTTPS + ghim IPv4 + MetaData"
docker exec "$C" php -r '
$f="/var/www/html/modules/registrars/nhanhoa/nhanhoa.php"; $s=file_get_contents($f);
$s=str_replace("\x27http://api.nhanhoa.com/\x27","\x27https://api.nhanhoa.com/\x27",$s);
if(strpos($s,"nhanhoa_MetaData")===false){
  $s=preg_replace("/^<\?php\s*/","",$s,1);
  $s="<?php\nif (!defined(\"WHMCS\")) { die(\"This file cannot be accessed directly\"); }\n"
    ."function nhanhoa_MetaData(){ return [\"DisplayName\"=>\"Nhân Hòa — Đăng ký tên miền\",\"APIVersion\"=>\"1.1\"]; }\n".$s;
}
if(strpos($s,"CURLOPT_IPRESOLVE")===false){
  $s=str_replace("curl_setopt(\$ch, CURLOPT_RETURNTRANSFER, 1);",
    "curl_setopt(\$ch, CURLOPT_RETURNTRANSFER, 1);\n\tcurl_setopt(\$ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);\n\tcurl_setopt(\$ch, CURLOPT_TIMEOUT, 120);",$s);
}
file_put_contents($f,$s);'
docker exec "$C" php -l "$W/modules/registrars/nhanhoa/nhanhoa.php"

echo "→ gộp whois .vn vào whois.json"
docker cp "$HERE/whois.json" "$C:/tmp/nh-whois.json"
docker exec "$C" php -r '
$W="/var/www/html/resources/domains";
$vn=json_decode(file_get_contents("/tmp/nh-whois.json"),true);
$dist=json_decode(file_get_contents("$W/dist.whois.json"),true);
$ext=[]; foreach($vn as $r) foreach(explode(",",$r["extensions"]) as $e) $ext[trim($e)]=1;
$out=$vn;
foreach($dist as $r){
  $keep=array_values(array_filter(array_map("trim",explode(",",$r["extensions"])),fn($e)=>!isset($ext[$e])));
  if($keep){ $r["extensions"]=implode(",",$keep); $out[]=$r; }
}
file_put_contents("$W/whois.json", json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
echo "  mục whois: ".count($out)."\n";'

docker exec "$C" sh -c "chown -R www-data:www-data $W/modules/registrars/nhanhoa $W/resources/domains"

echo "→ đặt nhà cung cấp tra cứu = BasicWhois, tỷ giá USD, giá TLD (qua API WHMCS)"
docker cp "$HERE/configure.php" "$C:/tmp/nh-configure.php"
docker exec "$C" php /tmp/nh-configure.php

echo "✓ Xong. Nhập khoá API tại Setup → Products/Services → Domain Registrars → Nhân Hòa."
