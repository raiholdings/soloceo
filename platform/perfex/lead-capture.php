<?php
/* Nhận lead từ edu.soloceo.vn (tải ebook) → tạo lead trong Perfex CRM chính (marketing edu).
   Token-auth. Không nạp CI (đọc DB creds bằng regex từ app-config.php, né guard BASEPATH).
   POST JSON hoặc form: name, email, phone, ebook, source. */
header('Content-Type: application/json; charset=utf-8');
$TOKEN_FILE = __DIR__ . '/.lead_capture_token';
$token = is_file($TOKEN_FILE) ? trim(file_get_contents($TOKEN_FILE)) : '';
$hdr = isset($_SERVER['HTTP_X_LEAD_TOKEN']) ? $_SERVER['HTTP_X_LEAD_TOKEN'] : ($_POST['token'] ?? '');
if (!$token || !hash_equals($token, (string)$hdr)) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;
$name  = trim($in['name'] ?? '');
$email = trim($in['email'] ?? '');
$phone = trim($in['phone'] ?? '');
$ebook = trim($in['ebook'] ?? '');
$source= trim($in['source'] ?? 'Ebook edu.soloceo.vn');
if ($email === '' && $name === '') { echo json_encode(['error'=>'missing name/email']); exit; }

$cfg = @file_get_contents(__DIR__ . '/application/config/app-config.php');
function cfgval($cfg,$k){ return preg_match("/APP_$k'?\\]?\\s*[,=]\\s*'([^']*)'/", $cfg, $m) ? $m[1] : (preg_match("/'APP_$k'\\s*,\\s*'([^']*)'/", $cfg, $m2)?$m2[1]:''); }
$host = cfgval($cfg,'DB_HOSTNAME') ?: 'perfex-db';
$user = cfgval($cfg,'DB_USERNAME') ?: 'perfex';
$pass = cfgval($cfg,'DB_PASSWORD');
$db   = cfgval($cfg,'DB_DATABASE') ?: 'perfex';
$m = @new mysqli($host, $user, $pass, $db, 3306);
if ($m->connect_errno) { http_response_code(500); echo json_encode(['error'=>'db','detail'=>$m->connect_error]); exit; }
$m->set_charset('utf8mb4');

// dedupe theo email trong 24h
if ($email !== '') {
  $st=$m->prepare("SELECT id FROM tblleads WHERE email=? ORDER BY id DESC LIMIT 1");
  $st->bind_param('s',$email); $st->execute(); $r=$st->get_result()->fetch_assoc();
  if ($r) {
    // đã có lead → chỉ ghi chú lần tải mới (activity)
    $lid=$r['id'];
    $desc = "Tải thêm ebook: ".$ebook." (".date('d-m-Y H:i').")";
    $m->query("UPDATE tblleads SET description=CONCAT(COALESCE(description,''), '\n', '".$m->real_escape_string($desc)."') WHERE id=".(int)$lid);
    echo json_encode(['ok'=>true,'lead_id'=>$lid,'dup'=>true]); exit;
  }
}
// status + source đầu tiên
$statusRow = $m->query("SELECT id FROM tblleads_status ORDER BY statusorder ASC LIMIT 1")->fetch_assoc();
$srcRow    = $m->query("SELECT id FROM tblleads_sources ORDER BY id ASC LIMIT 1")->fetch_assoc();
$status = $statusRow ? (int)$statusRow['id'] : 0;
$src    = $srcRow ? (int)$srcRow['id'] : 0;
$desc   = "Nguồn: ".$source."\nEbook đã tải: ".$ebook."\nThời điểm: ".date('d-m-Y H:i');
$hash   = md5($email.microtime());
$now    = date('Y-m-d H:i:s');
$st = $m->prepare("INSERT INTO tblleads (name,email,phonenumber,description,status,source,addedfrom,dateadded,leadorder,hash,is_public) VALUES (?,?,?,?,?,?,0,?,0,?,1)");
$st->bind_param('ssssiiss', $name, $email, $phone, $desc, $status, $src, $now, $hash);
$st->execute();
$lid = $st->insert_id;
echo json_encode(['ok'=>true,'lead_id'=>$lid,'dup'=>false]);
