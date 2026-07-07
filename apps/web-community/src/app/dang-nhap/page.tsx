"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

// MVP local: dev-login (JWT cùng chuẩn Supabase). Khi nối Supabase Auth thật,
// thay bằng supabase.auth.signInWithOtp / signInWithOAuth — phần còn lại giữ nguyên.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ accessToken: string }>("/auth/dev-login", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setToken(res.accessToken);
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
            Nhập email để bắt đầu hành trình Solo CEO của bạn.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              placeholder="email@cua-ban.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Đang xử lý..." : "Tiếp tục"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
