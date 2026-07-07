import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface DirectoryVenture {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  description?: string | null;
  revenueVerified: boolean;
}

// Danh bạ venture public (Phần 6.6)
export default async function DirectoryPage() {
  let ventures: DirectoryVenture[] = [];
  try {
    const res = await fetch(`${API_URL}/v1/directory/ventures`, {
      cache: "no-store",
    });
    if (res.ok) ventures = await res.json();
  } catch {
    // API chưa chạy — hiển thị danh bạ trống
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">Danh bạ doanh nghiệp</h1>
      <p className="mb-8 text-[#A0A0B8]">
        Các doanh nghiệp một người đang hoạt động trên SoloCEO.
      </p>
      {ventures.length === 0 ? (
        <p className="text-[#A0A0B8]">
          Chưa có doanh nghiệp nào LIVE — hãy là người đầu tiên!
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {ventures.map((v) => (
            <Link key={v.id} href={`/v/${v.slug}`}>
              <Card className="transition hover:border-accent/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {v.name}
                    {v.revenueVerified && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                        ✓ Xác thực
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[#A0A0B8]">
                  {v.description?.slice(0, 120) ?? "Chưa có mô tả."}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
