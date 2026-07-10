"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/api";
import { Button } from "@soloceo/ui";

/** Trang đang chạy trong iframe của workspace DeerFlow?
 *  Khi đó ẩn hẳn header: workspace đã có sidebar + phiên đăng nhập riêng, hiện
 *  thêm nav và nút "Đăng xuất" của web-community sẽ thành 2 menu / 2 nút đăng
 *  xuất (§II.1 hiến chương). `?embed=1` để ép chế độ nhúng khi cần test. */
function useEmbedded(): boolean {
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("embed");
    setEmbedded(forced === "1" || window.self !== window.top);
  }, []);
  return embedded;
}

export function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const embedded = useEmbedded();

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, []);

  // Chromeless: không render gì khi bị nhúng trong workspace.
  if (embedded) return null;

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
