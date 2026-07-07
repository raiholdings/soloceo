"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp, supabaseEnabled } from "@/lib/auth";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "register" && supabaseEnabled) {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice(
            "Đã gửi email xác nhận — kiểm tra hộp thư (kể cả Spam), bấm link xác nhận rồi quay lại đăng nhập.",
          );
          setMode("login");
          return;
        }
      } else {
        await signIn(email, password);
      }
      router.push("/bat-dau");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
          </CardTitle>
          <p className="text-sm text-[#A0A0B8]">
            {mode === "login"
              ? "Chào mừng trở lại SoloCEO."
              : "Bắt đầu hành trình Solo CEO của bạn."}
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
            {supabaseEnabled && (
              <input
                type="password"
                required
                minLength={8}
                placeholder="Mật khẩu (tối thiểu 8 ký tự)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
              />
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {notice && <p className="text-sm text-emerald-400">{notice}</p>}
            <Button type="submit" disabled={loading}>
              {loading
                ? "Đang xử lý..."
                : mode === "login"
                  ? "Đăng nhập"
                  : "Đăng ký"}
            </Button>
            {supabaseEnabled && (
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                }}
                className="text-sm text-accent-soft hover:underline"
              >
                {mode === "login"
                  ? "Chưa có tài khoản? Đăng ký"
                  : "Đã có tài khoản? Đăng nhập"}
              </button>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
