<?php
defined('BASEPATH') or exit('No direct script access allowed');
/*
Module Name: SoloCEO Addons Control
Description: Ẩn menu addon chưa bật theo từng tenant (CEO mặc định cơ bản, tự bật addon trong workspace/crm). Không ảnh hưởng super-admin (crm.soloceo.vn gốc).
Version: 1.0.0
Author: SoloCEO
*/

// Danh sách addon (module) bị kiểm soát — mặc định ẩn, CEO bật mới hiện.
if (!defined('SOLOCEO_ADDONS_ALL')) {
    define('SOLOCEO_ADDONS_ALL', 'account_planning,accounting,advanced_task_status_manager,affiliate_management,ai_lead_manager,api,approvify,assetcentral,automation_manager,aws_integration,coinbase,commission,custom_email_and_sms_notifications,custom_links,customers_api,customtables,deals,elite_custom_js_css,extended_email,extra_setting,file_sharing,flexibackup,flexibleleadfinder,flexiblewa,flexstage,google_drive,graphql,hr_payroll,hr_profile,importsync,inject_javascript,invoices_builder,lead_manager,ma,mailflow,manufacturing,meetlink_manager,mention,mercadopago_gateway,mindmap,mpc_ai_chatbot,multi_page_wtl,myshopify,omni_sales,paystack,perfex_dark_theme,perfex_dashboard,perfex_email_builder,perfex_mobile_app_api,perfex_office_theme,poly_utilities,products,project_kanban,project_templates,projectroadmap,publishx,purchase_orders,pushover,razorpay,recruitment,reminder,sendin,service_management,services,shopier,si_custom_status,si_lead_filters,si_lead_followup,si_sms,si_task_filters,si_validate,spreadsheet_online,stripe_sepa,supplier,support_contact,task_manage,task_templates,taskbookmarks,team_password,telegram_chat,theme_style,toast_master,ultimate_dark_theme,webhooks,whatsapp,whatsapp_api,whatsapp_chat,whatsbot,whiteboard,wiki,zoom_meetings');
}

hooks()->add_action('app_admin_head', 'soloceo_addons_filter_menu');

/**
 * Chỉ lọc cho TENANT (subdomain *.crm.soloceo.vn), KHÔNG lọc super-admin (crm.soloceo.vn gốc).
 * Đọc addon CEO đã bật từ option 'soloceo_addons' (JSON) của chính tenant; ẩn menu các addon còn lại.
 */
function soloceo_addons_filter_menu()
{
    $host = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
    // super-admin gốc = crm.soloceo.vn (không có subdomain) → bỏ qua
    if ($host === 'crm.soloceo.vn' || $host === '' || substr_count($host, '.') < 3) {
        return;
    }
    $raw     = get_option('soloceo_addons');
    $enabled = $raw ? json_decode($raw, true) : [];
    if (!is_array($enabled)) {
        $enabled = [];
    }
    $all      = explode(',', SOLOCEO_ADDONS_ALL);
    $disabled = array_values(array_diff($all, $enabled));
    if (empty($disabled)) {
        return;
    }
    $json = json_encode($disabled);
    echo <<<HTML
<script>
(function(){
  var dis = {}; ($json).forEach(function(s){ dis[s]=1; });
  // Chặn CEO tenant vào trang quản lý Modules (module DÙNG CHUNG code — "Gỡ cài đặt"
  // có thể xoá file ảnh hưởng người khác). CEO bật/tắt tiện ích qua workspace/crm.
  var p = location.pathname.replace(/\/+$/,'');
  if (/\/admin\/modules(\/|$)/i.test(p)) { location.replace('/admin'); return; }
  function topLi(el){
    var li = el.closest('li'); if(!li) return null;
    var cur = li;
    while (cur){
      var p = cur.parentElement ? cur.parentElement.closest('li') : null;
      if (!p) break;
      cur = p;
    }
    return cur;
  }
  function hide(){
    var menu = document.getElementById('side-menu') || document.body;
    // 1) theo href /admin/<slug> → ẩn <li> NHÓM cấp cao nhất (bao cả menu có submenu)
    var links = menu.querySelectorAll('a[href*="/admin/"]');
    for (var i=0;i<links.length;i++){
      var m = (links[i].getAttribute('href')||'').match(/\/admin\/([a-z0-9_]+)/i);
      if (m && dis[m[1]]){ var li = topLi(links[i]); if (li) li.style.display='none'; }
    }
    // 1b) TOÀN TRANG (khu Settings/thiết lập): ẩn <li> menu của addon bị tắt.
    //     Khớp cả /admin/<slug> lẫn ?group=<slug>. Link addon trong bảng/nội dung nằm
    //     trong <td> nên closest('li')=null → không bị ẩn nhầm (an toàn).
    var all = document.querySelectorAll('a[href*="/admin/"]');
    for (var k=0;k<all.length;k++){
      var href = all[k].getAttribute('href')||'', slug = null;
      var mg = href.match(/[?&]group=([a-z0-9_]+)/i);
      var mp = href.match(/\/admin\/([a-z0-9_]+)/i);
      if (mg && dis[mg[1]]) slug = mg[1];
      else if (mp && dis[mp[1]]) slug = mp[1];
      if (slug){ var li3 = all[k].closest('li'); if (li3) li3.style.display='none'; }
    }
    // 2) theo id <li id="slug"> (addon đặt id trên li)
    for (var s in dis){
      var byId = menu.querySelector('li[id="'+s+'"]');
      if (byId) byId.style.display='none';
    }
    // 3) ẩn link "Modules" trong Settings (CEO không quản lý module hệ thống dùng chung)
    var mm = document.querySelectorAll('a[href$="/admin/modules"]');
    for (var j=0;j<mm.length;j++){ var l2 = mm[j].closest('li'); if (l2) l2.style.display='none'; }
  }
  function run(){ try{ hide(); }catch(e){} }
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
  setTimeout(run, 300); setTimeout(run, 900); setTimeout(run, 2000);
  try { var t = document.getElementById('side-menu'); if(t){ new MutationObserver(run).observe(t, {childList:true, subtree:true}); } } catch(e){}
})();
</script>
HTML;
}
