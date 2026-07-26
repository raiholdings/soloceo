"use client";
// Gallery mẫu DỮ LIỆU THỰC dưới ô chat (mô hình Manus): chọn 1 chip → hiện các mẫu có thật
// trong hệ thống (ý tưởng đã đúc, nền tảng đang chạy, dự án AI, kho dữ liệu…). Bấm 1 mẫu →
// điền lệnh vào ô chat để subagent thực thi qua MCP.
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const CATALOG = "https://platform.soloceo.vn/paas-catalog.php";
const TEMPLATES = "https://api.soloceo.vn/v1/marketplace/project-templates";

export type ChipKey = "y-tuong" | "crm" | "thi-truong" | "he-sinh-thai" | "du-lieu" | "tao-dn";

type Card = { title: string; sub?: string; badge?: string; prompt: string };

async function safeJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}
const cut = (s: unknown, n: number) => String(s ?? "").slice(0, n);

async function loadCards(key: ChipKey): Promise<{ tieuDe: string; cards: Card[] }> {
  if (key === "y-tuong") {
    const d = await safeJson<{ ideas?: { id: number; ten: string; nganh?: string; tom_tat?: string; diem_tb?: number; so_vote?: number }[] }>(
      "/workspace/api/gallery?kho=y-tuong", {});
    return {
      tieuDe: "Ý tưởng đã đúc từ Data Engine — chọn 1 để triển khai",
      cards: (d.ideas ?? []).map((x) => ({
        title: x.ten,
        sub: cut(x.tom_tat, 90),
        badge: x.diem_tb ? `⭐ ${x.diem_tb} (${x.so_vote})` : x.nganh,
        prompt: `Tôi muốn triển khai ý tưởng "${x.ten}" (ý tưởng #${x.id} trong Data Engine). Dùng MCP soloceo-bigdata xem chi tiết BMC và lộ trình của ý tưởng này, rồi lập kế hoạch thực thi 30 ngày đầu cho tôi: việc gì trước, dùng nền tảng SoloCEO nào, cần chuẩn bị gì.`,
      })),
    };
  }
  if (key === "he-sinh-thai") {
    const d = await safeJson<{ platforms?: { name: string; slug: string; description?: string; category?: string; demoUrl?: string; priceVnd?: number }[] }>(CATALOG, {});
    return {
      tieuDe: "Nền tảng đang chạy thật — chọn 1 để dùng/cài",
      cards: (d.platforms ?? []).slice(0, 12).map((p) => ({
        title: p.name,
        sub: cut(p.description, 90),
        badge: p.priceVnd ? `${Number(p.priceVnd).toLocaleString("vi-VN")}đ/th` : p.category,
        prompt: `Tôi muốn dùng nền tảng "${p.name}" trên SoloCEO. Dùng MCP soloceo-ecosystem kiểm tra nền tảng này đã sẵn sàng cho tôi chưa, giải thích nó giải quyết việc gì trong doanh nghiệp của tôi và hướng dẫn tôi bắt đầu từng bước.`,
      })),
    };
  }
  if (key === "tao-dn") {
    const d = await safeJson<{ name: string; slug: string; summary?: string; industry?: string }[]>(TEMPLATES, []);
    return {
      tieuDe: "Dự án AI vận hành sẵn — chọn 1 làm điểm xuất phát",
      cards: (Array.isArray(d) ? d : []).slice(0, 12).map((p) => ({
        title: p.name,
        sub: cut(p.summary, 90),
        badge: p.industry,
        prompt: `Tôi muốn khởi tạo doanh nghiệp theo mẫu dự án "${p.name}". Phân tích mô hình này, cho tôi biết cần nền tảng nào của SoloCEO, chi phí ước tính mỗi tháng và các bước dựng trong tuần đầu.`,
      })),
    };
  }
  if (key === "du-lieu") {
    const d = await safeJson<{ doc_quyen?: Record<string, number>; tong_ban_ghi?: number }>("/workspace/api/gallery?kho=engine", {});
    const dq = d.doc_quyen ?? {};
    const kho: [string, string, string][] = [
      ["Vấn đề thị trường", String(dq.van_de ?? 0), "van-de"],
      ["Giải pháp đã đúc", String(dq.giai_phap ?? 0), "giai-phap"],
      ["Mô hình kinh doanh", String(dq.mo_hinh ?? 0), "mo-hinh"],
      ["Sản phẩm tham chiếu", String(dq.san_pham ?? 0), "san-pham"],
      ["Sự kiện thị trường", String(dq.su_kien ?? 0), "su-kien"],
      ["Toàn bộ kho dữ liệu", (d.tong_ban_ghi ?? 0).toLocaleString("vi-VN"), "tat-ca"],
    ];
    return {
      tieuDe: "Kho dữ liệu thật — chọn kho để tra cứu",
      cards: kho.map(([ten, n, k]) => ({
        title: ten,
        sub: `${n} mục trong Data Engine`,
        badge: "🔒 độc quyền",
        prompt: `Dùng MCP soloceo-bigdata tra cứu kho "${ten}" (${k}) và tổng hợp cho tôi những mục liên quan nhất tới lĩnh vực: [ngành/thị trường của bạn]. Nêu rõ cơ hội cho doanh nghiệp một người.`,
      })),
    };
  }
  if (key === "crm") {
    return {
      tieuDe: "Việc CRM subagent làm được ngay (qua MCP soloceo-crm)",
      cards: [
        { title: "Tổng quan CRM hôm nay", sub: "khách, lead, hoá đơn, việc cần làm", badge: "crm_summary", prompt: "Dùng MCP soloceo-crm: crm_summary + crm_list_tasks, tóm tắt tình hình CRM của tôi hôm nay và đề xuất 3 việc ưu tiên." },
        { title: "Lead mới cần chăm", sub: "danh sách lead gần nhất + kịch bản follow-up", badge: "crm_list_leads", prompt: "Dùng MCP soloceo-crm lấy các lead mới nhất, phân loại theo mức độ tiềm năng và soạn tin nhắn follow-up cho từng nhóm." },
        { title: "Hoá đơn & công nợ", sub: "hoá đơn chưa thu, nhắc nợ", badge: "crm_list_invoices", prompt: "Dùng MCP soloceo-crm liệt kê hoá đơn chưa thanh toán, tính tổng công nợ và soạn email nhắc nợ lịch sự cho từng khách." },
        { title: "Thêm khách hàng mới", sub: "tạo hồ sơ khách trong CRM", badge: "crm_create_customer", prompt: "Dùng MCP soloceo-crm tạo khách hàng mới: [tên công ty], [email], [điện thoại]. Hỏi tôi xác nhận trước khi tạo." },
      ],
    };
  }
  return {
    tieuDe: "Việc subagent làm được với kênh bán (qua MCP soloceo-marketplace)",
    cards: [
      { title: "Kênh bán đã kết nối", sub: "kiểm tra trạng thái kết nối", badge: "marketplace", prompt: "Dùng MCP soloceo-marketplace kiểm tra các kênh bán tôi đã kết nối và trạng thái đồng bộ." },
      { title: "Đơn hàng mới", sub: "đơn cần xử lý hôm nay", badge: "orders", prompt: "Dùng MCP soloceo-marketplace lấy đơn hàng mới nhất và cho tôi biết đơn nào cần xử lý gấp." },
      { title: "Tồn kho cảnh báo", sub: "sản phẩm sắp hết hàng", badge: "inventory", prompt: "Dùng MCP soloceo-marketplace kiểm tra tồn kho, cảnh báo sản phẩm sắp hết và đề xuất số lượng nhập." },
      { title: "Đồng bộ sản phẩm", sub: "đẩy sản phẩm lên kênh bán", badge: "sync", prompt: "Dùng MCP soloceo-marketplace đồng bộ sản phẩm của tôi lên các kênh đã kết nối. Hỏi tôi xác nhận trước khi đẩy." },
    ],
  };
}

export function SoloceoChipGallery({ chip, onPick }: { chip: ChipKey | null; onPick: (prompt: string) => void }) {
  const [data, setData] = useState<{ tieuDe: string; cards: Card[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (k: ChipKey) => {
    setBusy(true); setData(null);
    setData(await loadCards(k));
    setBusy(false);
  }, []);

  useEffect(() => { if (chip) void load(chip); else setData(null); }, [chip, load]);

  if (!chip) return null;
  return (
    <div className="mx-auto mt-3 w-full max-w-3xl px-4 sm:px-0">
      <div className="text-muted-foreground mb-2 text-xs">
        {busy ? <span className="flex items-center gap-1.5"><Loader2Icon className="size-3 animate-spin" /> Đang tải dữ liệu thật…</span> : data?.tieuDe}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.cards ?? []).map((c, i) => (
          <button key={i} onClick={() => onPick(c.prompt)}
            className={cn("bg-card hover:border-foreground/30 rounded-xl border p-3 text-left transition")}>
            <div className="line-clamp-1 text-[13px] font-semibold">{c.title}</div>
            {c.sub ? <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[12px]">{c.sub}</div> : null}
            {c.badge ? <div className="text-muted-foreground mt-1.5 font-mono text-[10.5px] uppercase">{c.badge}</div> : null}
          </button>
        ))}
      </div>
      {!busy && data && data.cards.length === 0 ? (
        <div className="text-muted-foreground text-xs">Chưa có mẫu — dữ liệu đang được engine đúc thêm mỗi giờ.</div>
      ) : null}
    </div>
  );
}
