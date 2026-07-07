import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface PublicVenture {
  name: string;
  slug: string;
  industry?: string | null;
  description?: string | null;
  status: string;
  revenueVerified: boolean;
  createdAt: string;
  org: { name: string };
}

const INDUSTRY_LABELS: Record<string, string> = {
  real_estate: "Bất động sản",
  fnb: "F&B",
  education: "Giáo dục",
  services: "Dịch vụ",
  other: "Khác",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Đang chuẩn bị",
  PROVISIONING: "Đang khởi tạo",
  LIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng",
  LISTED: "Đang niêm yết M&A",
  SOLD: "Đã chuyển nhượng",
};

// Hồ sơ venture public — render server-side cho SEO
export default async function VenturePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await fetch(`${API_URL}/v1/directory/ventures/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) notFound();
  const venture: PublicVenture = await res.json();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-2xl font-bold text-accent-soft">
              {venture.name.charAt(0)}
            </span>
            <div>
              <CardTitle className="text-2xl">{venture.name}</CardTitle>
              <p className="text-sm text-[#A0A0B8]">
                {venture.slug}.app.soloceo.vn · Sáng lập: {venture.org.name}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-surface-border px-3 py-1">
              {INDUSTRY_LABELS[venture.industry ?? "other"] ?? "Khác"}
            </span>
            <span className="rounded-full border border-surface-border px-3 py-1">
              {STATUS_LABELS[venture.status] ?? venture.status}
            </span>
            {venture.revenueVerified && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-400">
                ✓ Doanh thu đã xác thực
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-[#D0D0E0]">
            {venture.description ?? "Chưa có mô tả."}
          </p>
          <p className="mt-6 text-xs text-[#A0A0B8]">
            Tham gia SoloCEO từ{" "}
            {new Date(venture.createdAt).toLocaleDateString("vi-VN")}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
