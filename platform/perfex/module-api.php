<?php
/* SoloCEO module toggle API — token-auth, đọc/bật-tắt module cho tài khoản CRM. */
$token_expected = trim(@file_get_contents("/var/www/html/.module_api_token"));
$token = $_SERVER["HTTP_X_SOLOCEO_TOKEN"] ?? ($_GET["token"] ?? "");
if (!$token_expected || !hash_equals($token_expected, (string)$token)) { http_response_code(403); echo json_encode(["error"=>"forbidden"]); exit; }
// đọc DB creds từ app-config.php bằng regex (né guard BASEPATH)
$cfg = @file_get_contents("/var/www/html/application/config/app-config.php");
function cfgval($cfg,$k){ return preg_match("/define\\(\\s*'".$k."'\\s*,\\s*'([^']*)'/",$cfg,$m) ? $m[1] : ""; }
$host=cfgval($cfg,"APP_DB_HOSTNAME"); $user=cfgval($cfg,"APP_DB_USERNAME"); $pass=cfgval($cfg,"APP_DB_PASSWORD"); $name=cfgval($cfg,"APP_DB_NAME");
$db = new mysqli($host,$user,$pass,$name,3306);
if ($db->connect_errno) { http_response_code(500); echo json_encode(["error"=>"db","d"=>$db->connect_error]); exit; }
$db->set_charset("utf8mb4");
header("Content-Type: application/json");
function module_label($name){
  $f = "/var/www/html/modules/$name/$name.php";
  if (is_file($f)) { $h=file_get_contents($f,false,null,0,3000); if(preg_match("/Module Name:\\s*(.+)/i",$h,$m)) return trim(preg_replace("/[*\\/].*/","",$m[1])); }
  return ucwords(str_replace(["_","-"]," ",$name));
}
$action = $_GET["action"] ?? "list";
if ($action==="list") {
  $rows=[]; $r=$db->query("SELECT module_name, active FROM tblmodules ORDER BY module_name");
  while($x=$r->fetch_assoc()){ $rows[]=["name"=>$x["module_name"],"label"=>module_label($x["module_name"]),"active"=>intval($x["active"])===1]; }
  echo json_encode(["modules"=>$rows]); exit;
}
if ($action==="toggle") {
  $body = json_decode(file_get_contents("php://input"), true) ?: $_POST;
  $mn = preg_replace("/[^a-z0-9_]/","", strtolower($body["module"]??""));
  $active = !empty($body["active"]) ? 1 : 0;
  if (!$mn) { echo json_encode(["error"=>"no-module"]); exit; }
  $chk=$db->query("SELECT 1 FROM tblmodules WHERE module_name='".$db->real_escape_string($mn)."'");
  if(!$chk->num_rows){ echo json_encode(["error"=>"module-not-installed"]); exit; }
  $db->query("UPDATE tblmodules SET active=$active WHERE module_name='".$db->real_escape_string($mn)."'");
  echo json_encode(["ok"=>true,"module"=>$mn,"active"=>$active===1]); exit;
}
echo json_encode(["error"=>"bad-action"]);
