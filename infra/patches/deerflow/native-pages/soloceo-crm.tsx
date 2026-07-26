"use client";
// CRM — mỗi CEO một tenant Perfex SaaS riêng (crm.soloceo.vn). Mở workspace/crm →
// tự provision + SSO → nhúng CRM RIÊNG của CEO. Mặc định CHỈ tính năng cơ bản;
// CEO tự bật addon trong bảng "Tiện ích" (mỗi addon có tiêu đề + mô tả).
import { AlertCircle, ExternalLink, LayoutDashboard, Loader2, Puzzle, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";

type Addon = { slug: string; title: string; desc: string };
const ADDON_CATALOG: { cat: string; items: Addon[] }[] = [
  { cat: "Bán hàng & Khách hàng", items: [
    { slug: "deals", title: "Cơ hội bán hàng (Deals)", desc: "Pipeline cơ hội theo giai đoạn, kéo-thả." },
    { slug: "lead_manager", title: "Quản lý Lead nâng cao", desc: "Theo dõi khách tiềm năng, lịch sử liên hệ, nguồn." },
    { slug: "ai_lead_manager", title: "AI quản lý Lead", desc: "Trợ lý AI phân loại & chăm sóc lead tự động." },
    { slug: "omni_sales", title: "Bán hàng đa kênh (Omni)", desc: "Đồng bộ đơn hàng nhiều kênh về CRM." },
    { slug: "myshopify", title: "Kết nối Shopify", desc: "Đồng bộ khách & đơn từ cửa hàng Shopify." },
    { slug: "affiliate_management", title: "Tiếp thị liên kết", desc: "Cộng tác viên & hoa hồng giới thiệu." },
  ]},
  { cat: "Chat & Liên lạc", items: [
    { slug: "whatsapp_chat", title: "Chat WhatsApp", desc: "Nhắn tin khách qua WhatsApp trong CRM." },
    { slug: "telegram_chat", title: "Chat Telegram", desc: "Nhắn tin khách qua Telegram trong CRM." },
    { slug: "si_sms", title: "Gửi SMS", desc: "Gửi tin nhắn SMS cho khách & lead." },
    { slug: "mpc_ai_chatbot", title: "Chatbot AI", desc: "Chatbot AI trả lời khách tự động." },
    { slug: "zoom_meetings", title: "Họp Zoom", desc: "Tạo & quản lý cuộc họp Zoom từ CRM." },
  ]},
  { cat: "Dự án & Công việc", items: [
    { slug: "project_kanban", title: "Kanban dự án", desc: "Bảng Kanban kéo-thả cho dự án." },
    { slug: "project_templates", title: "Mẫu dự án", desc: "Tạo dự án nhanh từ mẫu có sẵn." },
    { slug: "task_templates", title: "Mẫu công việc", desc: "Tạo công việc nhanh từ mẫu." },
    { slug: "reminder", title: "Nhắc hẹn tự động", desc: "Nhắc chăm sóc khách, việc đến hạn." },
    { slug: "automation_manager", title: "Tự động hoá quy trình", desc: "Luồng tự động theo điều kiện." },
  ]},
  { cat: "Nhân sự", items: [
    { slug: "hr_profile", title: "Hồ sơ nhân sự", desc: "Thông tin, hợp đồng nhân viên." },
    { slug: "hr_payroll", title: "Bảng lương (Payroll)", desc: "Tính lương, phụ cấp, bảo hiểm." },
    { slug: "recruitment", title: "Tuyển dụng", desc: "Đăng tin, quản lý ứng viên, phỏng vấn." },
  ]},
  { cat: "Kế toán, Kho & Mua hàng", items: [
    { slug: "accounting", title: "Kế toán", desc: "Sổ sách, tài khoản, đối soát ngân hàng." },
    { slug: "products", title: "Sản phẩm & Kho", desc: "Danh mục sản phẩm, tồn kho." },
    { slug: "purchase_orders", title: "Đơn mua hàng", desc: "Quản lý mua hàng & nhà cung cấp." },
    { slug: "manufacturing", title: "Sản xuất (MRP)", desc: "Lệnh sản xuất, định mức NVL." },
    { slug: "service_management", title: "Quản lý dịch vụ & hợp đồng", desc: "Hợp đồng dịch vụ, gia hạn, chu kỳ." },
  ]},
  { cat: "Công cụ khác", items: [
    { slug: "customtables", title: "Bảng dữ liệu tuỳ chỉnh", desc: "Tự tạo bảng dữ liệu riêng." },
    { slug: "team_password", title: "Mật khẩu nhóm", desc: "Lưu & chia sẻ mật khẩu an toàn." },
    { slug: "file_sharing", title: "Chia sẻ tệp", desc: "Chia sẻ tài liệu với khách & nội bộ." },
    { slug: "spreadsheet_online", title: "Bảng tính online", desc: "Bảng tính cộng tác trong CRM." },
    { slug: "mindmap", title: "Sơ đồ tư duy", desc: "Vẽ mindmap kế hoạch, ý tưởng." },
    { slug: "whiteboard", title: "Bảng trắng", desc: "Bảng trắng cộng tác trực quan." },
    { slug: "wiki", title: "Wiki nội bộ", desc: "Kho tri thức, tài liệu nội bộ." },
  ]},
];

export function SoloceoCrm() {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  const [showAddons, setShowAddons] = useState(false);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const resolve = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/workspace/api/crm-tenant", { cache: "no-store" });
      const d = await r.json();
      if (d.url) { setUrl(d.url); setStatus("ready"); setNonce((n) => n + 1); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }, []);

  useEffect(() => { void resolve(); }, [resolve]);

  const openAddons = useCallback(async () => {
    setShowAddons(true);
    setAddonsLoading(true);
    try {
      const r = await fetch("/workspace/api/crm-addons", { cache: "no-store" });
      const d = await r.json();
      setEnabled(new Set(Array.isArray(d.enabled) ? d.enabled : []));
    } catch { /* để trống */ }
    setAddonsLoading(false);
  }, []);

  const toggle = (slug: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/workspace/api/crm-addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: Array.from(enabled) }),
      });
      setShowAddons(false);
      setNonce((n) => n + 1); // tải lại iframe để menu cập nhật
    } catch { /* để trống */ }
    setSaving(false);
  }, [enabled]);

  return (
    <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <LayoutDashboard className="h-5 w-5 text-indigo-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">CRM của bạn</div>
            <div className="text-muted-foreground text-xs truncate">Khách hàng · hoá đơn · dự án · task · lead · hợp đồng. Bật thêm tính năng ở <b>Tiện ích</b>.</div>
          </div>
          <button onClick={() => void openAddons()} title="Bật/tắt tiện ích" className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
            <Puzzle className="h-3.5 w-3.5" /> Tiện ích
          </button>
          <button onClick={() => void resolve()} title="Tải lại" className="hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Tải lại
          </button>
          <button onClick={async () => { const r = await fetch("/workspace/api/crm-tenant", { cache: "no-store" }); const d = await r.json(); if (d.url) window.open(d.url, "_blank", "noopener"); }}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700">
            <ExternalLink className="h-3.5 w-3.5" /> Mở tab mới
          </button>
        </div>

        {status === "loading" && (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            Đang chuẩn bị CRM của bạn… (lần đầu có thể mất vài giây để khởi tạo)
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <AlertCircle className="h-7 w-7 text-amber-500" />
            <div className="text-muted-foreground max-w-md">Chưa mở được CRM. Vui lòng bấm <b>Tải lại</b>.</div>
            <button onClick={() => void resolve()} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"><RefreshCw className="h-4 w-4" /> Thử lại</button>
          </div>
        )}
        {status === "ready" && url && (
          <iframe key={nonce} src={url} title="CRM của tôi" className="min-h-0 w-full flex-1 border-0" />
        )}

        {showAddons && (
          <div className="absolute inset-0 z-20 flex flex-col bg-black/40" onClick={() => setShowAddons(false)}>
            <div className="mx-auto mt-6 flex max-h-[calc(100%-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Puzzle className="h-5 w-5 text-indigo-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Tiện ích CRM</div>
                  <div className="text-muted-foreground text-xs">Bật tính năng bạn cần. Tắt để giao diện gọn, chỉ giữ chức năng cơ bản.</div>
                </div>
                <button onClick={() => setShowAddons(false)} className="hover:bg-muted rounded-md p-1"><X className="h-4 w-4" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {addonsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Đang tải…</div>
                ) : ADDON_CATALOG.map((group) => (
                  <div key={group.cat} className="mb-4">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600">{group.cat}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((a) => (
                        <label key={a.slug} className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 hover:border-indigo-300 hover:bg-indigo-50/40">
                          <input type="checkbox" checked={enabled.has(a.slug)} onChange={() => toggle(a.slug)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{a.title}</div>
                            <div className="text-muted-foreground text-xs">{a.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                <div className="text-muted-foreground text-xs">Đã bật: <b>{enabled.size}</b> tiện ích</div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddons(false)} className="hover:bg-muted rounded-md border px-3 py-1.5 text-sm">Huỷ</button>
                  <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Lưu & áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceBody></WorkspaceContainer>
  );
}
