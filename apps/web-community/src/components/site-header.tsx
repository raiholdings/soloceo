"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/api";
import { Button } from "@soloceo/ui";

export function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-canvas/80 backdrop-blur-glass">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold text-accent-soft">
          SoloCEO
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/danh-ba" className="text-[#A0A0B8] hover:text-white">
            Danh bạ
          </Link>
          <Link href="/cong-dong" className="text-[#A0A0B8] hover:text-white">
            Cộng đồng
          </Link>
          <Link href="/goi" className="text-[#A0A0B8] hover:text-white">
            Gói
          </Link>
          {loggedIn ? (
            <>
              <Link href="/bat-dau" className="text-[#A0A0B8] hover:text-white">
                Doanh nghiệp của tôi
              </Link>
              <Link
                href="/tai-khoan"
                className="text-[#A0A0B8] hover:text-white"
              >
                Tài khoản
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearToken();
                  setLoggedIn(false);
                  window.location.href = "/";
                }}
              >
                Đăng xuất
              </Button>
            </>
          ) : (
            <Link href="/dang-nhap">
              <Button size="sm">Đăng nhập</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
