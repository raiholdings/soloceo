<?php
defined('BASEPATH') or exit('No direct script access allowed');
/* Cài addon Academy từ zip đặt sẵn trong uploads/addons_pending/ (không cần $_FILES).
   Xử lý cả zip lồng (zip ngoài chứa Documentation + Addon/<real>.zip). Sao logic
   Addon_model::install_addon: extract addon zip THẲNG vào uploads/addons (khớp root_directory
   trong config.json) → mkdir/copy/library/sql → insert addons. Gate EDU_SSO_SECRET.
   /edu_addons?key=SECRET&all=1  hoặc  &file=<zipname> */
class Edu_addons extends CI_Controller
{
    private $secret = 'ede1a355b214b714b878879a4047e125b9c7b2d55a7595cc9a7d914f40c2b587';

    public function __construct()
    {
        parent::__construct();
        $this->load->database();
    }

    public function index()
    {
        if (!hash_equals($this->secret, (string) $this->input->get('key'))) { show_404(); }
        header('Content-Type: application/json; charset=utf-8');
        $dir = 'uploads/addons_pending';
        if (!is_dir($dir)) { echo json_encode(['error' => 'no_pending_dir']); return; }

        $results = [];
        if ($this->input->get('all')) {
            foreach (glob($dir . '/*.zip') as $z) { $results[basename($z)] = $this->install_zip($z); }
        } else {
            $file = basename((string) $this->input->get('file'));
            $z = $dir . '/' . $file;
            $results[$file] = is_file($z) ? $this->install_zip($z) : 'not_found';
        }
        echo json_encode($results);
    }

    private function install_zip($zippath)
    {
        if (!class_exists('ZipArchive')) return 'no_zip_ext';
        $work = 'uploads/addons';
        if (!is_dir($work)) mkdir($work, 0777, true);
        if (!is_dir('application/controllers/addons')) mkdir('application/controllers/addons', 0777, true);
        if (!is_dir('application/models/addons')) mkdir('application/models/addons', 0777, true);

        // 1. giải nén zip NGOÀI ra temp để dò cấu trúc
        $tmp = $work . '/_tmp_' . substr(md5($zippath . microtime()), 0, 8);
        $this->rrmdir($tmp); mkdir($tmp, 0777, true);
        $z = new ZipArchive; if ($z->open($zippath) !== true) { $this->rrmdir($tmp); return 'open_failed'; }
        $z->extractTo($tmp); $z->close();

        // 2. addon zip thật = zip con nếu outer không có config.json ở đầu
        $topCfg   = $this->clean($this->rglob($tmp . '/config.json'));
        $addonZip = $zippath;
        if (empty($topCfg)) {
            $inners = $this->clean($this->rglob($tmp . '/*.zip'));
            if (!empty($inners)) $addonZip = $inners[0];
        }
        $keep = $work . '/_addon_' . substr(md5($zippath), 0, 8) . '.zip';
        @copy($addonZip, $keep);
        $this->rrmdir($tmp);

        // 3. giải nén addon zip THẲNG vào uploads/addons (khớp đường config)
        $before = glob($work . '/*', GLOB_ONLYDIR) ?: [];
        $az = new ZipArchive; if ($az->open($keep) !== true) { @unlink($keep); return 'open_failed'; }
        $az->extractTo($work); $az->close(); @unlink($keep);
        $after   = glob($work . '/*', GLOB_ONLYDIR) ?: [];
        $newDirs = array_values(array_diff($after, $before));

        // 4. config.json trong thư mục mới
        $cfgFiles = [];
        foreach ($newDirs as $nd) { $cfgFiles = array_merge($cfgFiles, $this->rglob($nd . '/config.json')); }
        $cfgFiles = $this->clean($cfgFiles);
        if (empty($cfgFiles)) { foreach ($newDirs as $nd) $this->rrmdir($nd); return 'no_config_json'; }
        $config = json_decode(file_get_contents($cfgFiles[0]), true);
        if (!$config || empty($config['unique_identifier'])) { foreach ($newDirs as $nd) $this->rrmdir($nd); return 'bad_config'; }

        // 5. cài (chdir về webroot để đường tương đối khớp)
        $cwd = getcwd(); chdir(FCPATH);
        if (!empty($config['directories'])) foreach ($config['directories'] as $d) { if (!is_dir($d['name'])) @mkdir($d['name'], 0777, true); }
        if (!empty($config['files'])) foreach ($config['files'] as $f) { if (is_file($f['root_directory'])) @copy($f['root_directory'], $f['update_directory']); }
        if (!empty($config['libraries'])) foreach ($config['libraries'] as $lib) {
            if (is_file($lib['root_directory'])) {
                @copy($lib['root_directory'], $lib['update_directory']);
                $lp = explode('/', $lib['update_directory']); array_pop($lp); $ex = implode('/', $lp);
                $lz = new ZipArchive; if ($lz->open($lib['update_directory']) === true) { $lz->extractTo($ex); $lz->close(); @unlink($lib['update_directory']); }
            }
        }
        if (!empty($config['sql_file'])) { $sqlfile = dirname($cfgFiles[0]) . '/sql/' . $config['sql_file']; if (is_file($sqlfile)) require $sqlfile; }
        chdir($cwd);

        // 6. ghi bảng addons
        $data = ['name' => $config['name'], 'unique_identifier' => $config['unique_identifier'], 'version' => $config['version'], 'about' => isset($config['about']) ? $config['about'] : '', 'status' => 1];
        $exist = $this->db->get_where('addons', ['unique_identifier' => $data['unique_identifier']]);
        if ($exist->num_rows() > 0) { $data['updated_at'] = strtotime(date('d-m-y')); $this->db->where('unique_identifier', $data['unique_identifier'])->update('addons', $data); }
        else { $data['purchase_code'] = null; $data['created_at'] = strtotime(date('d-m-y')); $this->db->insert('addons', $data); }

        // 7. dọn
        foreach ($newDirs as $nd) $this->rrmdir($nd);
        $this->rrmdir($work . '/__MACOSX');
        return 'installed:' . $config['unique_identifier'];
    }

    private function clean($arr) { return array_values(array_filter($arr, function ($p) { return strpos($p, '__MACOSX') === false; })); }

    private function rglob($pattern)
    {
        $files = glob($pattern) ?: [];
        foreach (glob(dirname($pattern) . '/*', GLOB_ONLYDIR) ?: [] as $sub) { $files = array_merge($files, $this->rglob($sub . '/' . basename($pattern))); }
        return $files;
    }

    private function rrmdir($d)
    {
        if (!is_dir($d)) return;
        foreach (array_diff(scandir($d), ['.', '..']) as $f) { $p = $d . '/' . $f; is_dir($p) ? $this->rrmdir($p) : @unlink($p); }
        @rmdir($d);
    }
}
