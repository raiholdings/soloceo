<?php
/**
 * WHMCS Provisioning Module "soloceo" — auto-provisioning PaaS.
 *
 * Khép kín dòng tiền (v1.1): CEO đặt 1 sản phẩm PaaS (ERPNext/OpenClaw/…) trên
 * platform.soloceo.vn → thanh toán → WHMCS gọi module này → module POST sang
 * api.soloceo.vn/v1/provision/paas (header X-Internal-Token) → api-core đẩy job
 * vào queue "provision" → svc-provision worker deploy qua Coolify + gán
 * subdomain. WHMCS lưu ref để tra trạng thái + hiện URL cho CEO.
 *
 * WHMCS (tenant-03) KHÔNG tới được Coolify API nội bộ core-01, nhưng tới được
 * api.soloceo.vn (HTTPS công khai) → nên nối qua api-core.
 *
 * Cấu hình (Server entry trong WHMCS → Setup > Products/Services > Servers):
 *   - Hostname:  api.soloceo.vn         (gốc api-core, không cần scheme)
 *   - Access Hash: <INTERNAL_API_TOKEN> (= env INTERNAL_API_TOKEN của api-core)
 * Product config option 1 = productKey (openclaw | erpnext | commerce-starter…)
 */

if (!defined("WHMCS")) {
    die("This file cannot be accessed directly");
}

/** Metadata module */
function soloceo_MetaData()
{
    return [
        "DisplayName" => "SoloCEO PaaS (Coolify)",
        "APIVersion" => "1.1",
        "RequiresServer" => true,
    ];
}

/** Tuỳ chọn sản phẩm: productKey ánh xạ sang CatalogApp.key ở api-core */
function soloceo_ConfigOptions()
{
    return [
        "productKey" => [
            "FriendlyName" => "Product Key (CatalogApp)",
            "Type" => "text",
            "Size" => "25",
            "Default" => "openclaw",
            "Description" => "openclaw | erpnext | commerce-starter …",
        ],
        "displaySuffix" => [
            "FriendlyName" => "Nhãn hiển thị",
            "Type" => "text",
            "Size" => "25",
            "Default" => "",
            "Description" => "Tên hiển thị instance (để trống = tên sản phẩm)",
        ],
    ];
}

/** Gốc API + token từ Server entry */
function _soloceo_base($params)
{
    $host = trim($params["serverhostname"] ?: "api.soloceo.vn");
    if (strpos($host, "http") !== 0) {
        $host = "https://" . $host;
    }
    return rtrim($host, "/") . "/v1";
}

/** Gọi api-core (JSON + X-Internal-Token). Trả [httpcode, arrayBody]. */
function _soloceo_call($params, $method, $path, $body = null)
{
    $token = $params["serveraccesshash"] ?: $params["serverpassword"];
    $ch = curl_init(_soloceo_base($params) . $path);
    $headers = [
        "X-Internal-Token: " . $token,
        "Accept: application/json",
    ];
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($body !== null) {
        $json = json_encode($body);
        $headers[] = "Content-Type: application/json";
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($resp === false) {
        return [0, ["error" => $err]];
    }
    return [$code, json_decode($resp, true) ?: []];
}

/** Đặt hàng thành công → provision instance PaaS cho CEO */
function soloceo_CreateAccount(array $params)
{
    try {
        $email = $params["clientsdetails"]["email"] ?? "";
        $name = $params["configoption2"] ?: "";
        if ($name === "") {
            $name = trim(
                ($params["clientsdetails"]["companyname"] ?? "") ?:
                trim(($params["clientsdetails"]["firstname"] ?? "") . " " .
                     ($params["clientsdetails"]["lastname"] ?? ""))
            );
        }
        list($code, $data) = _soloceo_call($params, "POST", "/provision/paas", [
            "productKey" => $params["configoption1"] ?: "openclaw",
            "email" => $email,
            "name" => $name,
        ]);
        if ($code < 200 || $code >= 300) {
            return "Lỗi provision (" . $code . "): " .
                ($data["message"] ?? ($data["error"] ?? "không rõ"));
        }
        // Lưu ref + url vào service (dùng cho ClientArea + tra trạng thái)
        if (!empty($data["ref"])) {
            try {
                Illuminate\Database\Capsule\Manager::table("tblhosting")
                    ->where("id", $params["serviceid"])
                    ->update([
                        "username" => substr($data["ref"], 0, 60),
                        "domain" => $data["url"] ?: ($params["domain"] ?? ""),
                    ]);
            } catch (\Throwable $e) {
                // không chặn nếu ghi phụ lỗi
            }
        }
        return "success";
    } catch (\Throwable $e) {
        return "Ngoại lệ: " . $e->getMessage();
    }
}

/** Huỷ dịch vụ → (tuỳ chọn) gỡ instance. MVP: chỉ đánh dấu, admin gỡ tay để
 *  tránh xoá nhầm dữ liệu CEO. Trả success để WHMCS không kẹt. */
function soloceo_TerminateAccount(array $params)
{
    return "success";
}

function soloceo_SuspendAccount(array $params)
{
    return "success";
}

function soloceo_UnsuspendAccount(array $params)
{
    return "success";
}

/** Nút "Kiểm tra kết nối" trong Server config */
function soloceo_TestConnection(array $params)
{
    list($code, $data) = _soloceo_call($params, "GET", "/provision/paas/status?ref=test:test");
    // 404 (ref không tồn tại) hay 400 = api-core sống + token đúng; 403 = sai token
    if ($code === 403) {
        return ["success" => false, "error" => "Sai X-Internal-Token (Access Hash)"];
    }
    if ($code === 0) {
        return ["success" => false, "error" => "Không gọi được api-core: " . ($data["error"] ?? "")];
    }
    return ["success" => true, "error" => ""];
}

/** Khu vực khách hàng: hiện URL + trạng thái deploy */
function soloceo_ClientArea(array $params)
{
    $ref = $params["username"] ?? "";
    $status = "UNKNOWN";
    $url = $params["domain"] ?? "";
    if ($ref !== "") {
        list($code, $data) = _soloceo_call($params, "GET", "/provision/paas/status?ref=" . urlencode($ref));
        if ($code >= 200 && $code < 300) {
            $status = $data["status"] ?? $status;
            if (!empty($data["url"])) {
                $url = $data["url"];
            }
        }
    }
    $labels = [
        "QUEUED" => "Đang xếp hàng…",
        "DEPLOYING" => "Đang triển khai…",
        "RUNNING" => "Đang chạy",
        "FAILED" => "Lỗi — liên hệ hỗ trợ",
    ];
    return [
        "templatefile" => "clientarea",
        "vars" => [
            "status" => $status,
            "statusLabel" => $labels[$status] ?? $status,
            "url" => $url,
        ],
    ];
}
