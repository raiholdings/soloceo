"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, setToken } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

// Đăng nhập email/password chỉ dùng khi phát triển local — production chỉ có
// OAuth SoloCEO Community.
const DEV_LOGIN = process.env.NODE_ENV !== "production";

// Đăng nhập chính: OAuth qua SoloCEO Community (WoWonder my.soloceo.vn).
// api-core lo đổi code → JWT rồi chuyển về đây kèm ?token=.
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Nhận token từ callback OAuth
  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
    if (token) {
      setToken(token);
      router.replace("/bat-dau");
    } else if (err) {
      setError(decodeURIComponent(err));
    }
  }, [params, router]);

  const communityLoginUrl = `${API_URL}/v1/auth/wowonder/login`;

  async function devSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push("/bat-dau");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập / Đăng ký</CardTitle>
          <p className="text-sm text-[#A0A0B8]">
            Dùng tài khoản SoloCEO Community để vào hệ điều hành doanh nghiệp của
            bạn. Một tài khoản cho cả cộng đồng và nền tảng.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <a href={communityLoginUrl}>
            <Button className="w-full gap-2" size="lg">
              <span className="text-lg">👥</span> Tiếp tục với SoloCEO Community
            </Button>
          </a>

          <p className="text-center text-xs text-[#A0A0B8]">
            Chưa có tài khoản cộng đồng? Nút trên sẽ tự đưa bạn tới trang đăng ký
            tại my.soloceo.vn.
          </p>

          {/* Dev/local fallback — chỉ hiện khi phát triển local */}
          {DEV_LOGIN && (
            <details className="mt-2 text-sm text-[#A0A0B8]">
              <summary className="cursor-pointer">
                Đăng nhập bằng email (dev)
              </summary>
              <form onSubmit={devSubmit} className="mt-3 flex flex-col gap-3">
                <input
                  type="email"
                  required
                  placeholder="email@cua-ban.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
                />
                <input
                  type="password"
                  required
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
                />
                <Button type="submit" variant="outline" disabled={loading}>
                  {loading ? "Đang xử lý..." : "Đăng nhập email"}
                </Button>
              </form>
            </details>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-24 text-center text-[#A0A0B8]">Đang tải...</main>}>
      <LoginInner />
    </Suspense>
  );
}
