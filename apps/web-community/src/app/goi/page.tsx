"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, type PlanKey } from "@soloceo/shared";
import { api, ApiRequestError, getToken } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface OrgMe {
  id: string;
  name: string;
  plan: string;
}

interface CheckoutResult {
  checkoutUrl?: string;
  orderCode?: string;
}

const PLAN_ORDER: PlanKey[] = ["STARTER", "GROWTH", "SCALE"];

// Điểm bán chính của từng gói — hiển thị marketing, số liệu lấy từ PLANS
const PLAN_PITCH: Record<PlanKey, string[]> = {
  STARTER: [
    "1 doanh nghiệp + văn phòng 3D riêng",
    "Bộ 6 nhân sự AI đầy đủ phòng ban",
    "Web bán hàng + chợ kỹ năng",
    "Ngân sách AI cơ bản kèm gói",
  ],
  GROWTH: [
    "Mọi thứ trong Khởi đầu",
    "Ngân sách AI gấp 10 lần",
    "Niêm yết bán lại trên Sàn M&A",
    "Phí giao dịch giảm còn 2%",
  ],
  SCALE: [
    "Vận hành tới 3 doanh nghiệp",
    "Toàn bộ app + ưu tiên tài nguyên",
    "Ngân sách AI cao nhất + mua thêm",
    "Phí giao dịch 1.5% · phí M&A 5%",
  ],
};

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

// Trang chọn gói: CEO đăng ký gói ngay sau khi có tài khoản (CLAUDE.md Phần 5).
// Cổng thanh toán chưa cấu hình → hiện hướng dẫn kích hoạt thủ công (pilot).
export default function PricingPage() {
  const router = useRouter();
  const [org, setOrg] = useState<OrgMe | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [manualPlan, setManualPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) return; // chưa đăng nhập vẫn xem được bảng giá
    api<OrgMe>("/orgs/me")
      .then(setOrg)
      .catch(() => {});
  }, []);

  async function subscribe(plan: PlanKey) {
    if (!getToken()) {
      router.push("/dang-nhap?return_url=/goi");
      return;
    }
    setBusyPlan(plan);
    setError(null);
    setManualPlan(null);
    try {
      const r = await api<CheckoutResult>("/payments/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": `goi-${plan}-${Date.now()}` },
        body: JSON.stringify({ type: "subscription", plan, provider: "payos" }),
      });
      if (r.checkoutUrl && !r.checkoutUrl.includes("pay-fake")) {
        window.location.href = r.checkoutUrl; // cổng thật → sang trang thanh toán
        return;
      }
      // fake mode → coi như chưa có cổng, hướng dẫn thủ công
      setManualPlan(plan);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        // chưa có Org → qua onboarding trước
        router.push("/bat-dau");
        return;
      }
      // Cổng thanh toán chưa cấu hình (pilot) → kích hoạt thủ công
      setManualPlan(plan);
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold">Chọn gói cho doanh nghiệp của bạn</h1>
        <p className="mt-3 text-[#A0A0B8]">
          Mỗi gói đều có văn phòng 3D + đội ngũ nhân sự AI làm việc 24/7. Nâng
          hoặc hạ gói bất cứ lúc nào.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const p = PLANS[key];
          const current = org?.plan === key;
          const featured = key === "GROWTH";
          return (
            <Card
              key={key}
              className={
                featured ? "border-accent ring-1 ring-accent/40" : undefined
              }
            >
              <CardHeader>
                {featured && (
                  <span className="mb-2 w-fit rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-soft">
                    Phổ biến nhất
                  </span>
                )}
                <CardTitle className="flex items-baseline justify-between">
                  <span>{p.label}</span>
                </CardTitle>
                <p className="mt-1">
                  <span className="text-3xl font-bold">
                    {formatVnd(p.priceVndMonthly)}₫
                  </span>
                  <span className="text-sm text-[#A0A0B8]"> /tháng</span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="flex flex-col gap-2 text-sm text-[#C8C8D4]">
                  {PLAN_PITCH[key].map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-accent-soft">✓</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={featured ? "default" : "outline"}
                  disabled={busyPlan !== null || current}
                  onClick={() => subscribe(key)}
                >
                  {current
                    ? "Gói hiện tại của bạn"
                    : busyPlan === key
                      ? "Đang xử lý..."
                      : getToken()
                        ? `Đăng ký gói ${p.label}`
                        : "Đăng nhập để đăng ký"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {manualPlan && (
        <Card className="mx-auto mt-8 max-w-2xl border-amber-400/40">
          <CardHeader>
            <CardTitle>
              Kích hoạt gói {PLANS[manualPlan].label} —{" "}
              {formatVnd(PLANS[manualPlan].priceVndMonthly)}₫/tháng
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-[#C8C8D4]">
            <p>
              Cổng thanh toán tự động đang trong giai đoạn kích hoạt. Trong thời
              gian pilot, anh/chị chuyển khoản và đội ngũ SoloCEO sẽ kích hoạt
              gói trong vòng <b>24 giờ làm việc</b>:
            </p>
            <ul className="flex flex-col gap-1">
              <li>
                • Nội dung chuyển khoản:{" "}
                <code className="rounded bg-surface px-2 py-0.5">
                  SOLOCEO {manualPlan} {org?.name ?? "ten-cua-ban"}
                </code>
              </li>
              <li>
                • Sau khi chuyển, nhắn tin cho đội ngũ tại{" "}
                <a
                  href="https://my.soloceo.vn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-soft underline"
                >
                  Cộng đồng SoloCEO
                </a>{" "}
                kèm ảnh biên lai.
              </li>
            </ul>
            <p className="text-xs text-[#8888A0]">
              Khi cổng PayOS/Stripe hoàn tất kích hoạt, việc thanh toán sẽ tự
              động 100% và gói được mở ngay lập tức.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="mt-6 text-center text-sm text-red-400">{error}</p>
      )}

      <p className="mt-10 text-center text-sm text-[#A0A0B8]">
        Chưa có doanh nghiệp?{" "}
        <a href="/bat-dau" className="text-accent-soft underline">
          Khởi tạo miễn phí trước, chọn gói sau
        </a>
        .
      </p>
    </main>
  );
}
