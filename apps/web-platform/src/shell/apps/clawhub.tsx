"use client";

// Chợ kỹ năng — trang Skills của CHÍNH OpenClaw tenant (route /skills trong
// Control UI, auth #token). Tại đây CEO tìm kiếm ClawHub, cài, cập nhật, gỡ
// kỹ năng — thao tác thật qua gateway RPC (skills.search/install/update).
//
// KHÔNG nhúng clawhub.ai trực tiếp: site đó đặt X-Frame-Options: DENY +
// frame-ancestors 'none' (đã kiểm chứng) — iframe sẽ trắng. clawhub.ai chỉ
// mở tab mới để duyệt catalog đầy đủ.

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

const CLAWHUB_URL = process.env.NEXT_PUBLIC_CLAWHUB_URL ?? "https://clawhub.ai";

interface Venture {
  id: string;
}

interface OpenclawAccess {
  ready: boolean;
  url: string | null;
  token: string | null;
}

/** URL trang Skills của Control UI kèm token fragment (đọc client-side) */
function skillsSrc(url: string, token: string | null): string {
  const base = url.replace(/\/$/, "");
  return token
    ? `${base}/skills#token=${encodeURIComponent(token)}`
    : `${base}/skills`;
}

export default function ClawHubApp() {
  const [access, setAccess] = useState<OpenclawAccess | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    try {
      const ventures = await api<Venture[]>("/ventures");
      const first = ventures[0];
      if (first) {
        setAccess(
          await api<OpenclawAccess>(`/ventures/${first.id}/openclaw-access`),
        );
      }
    } catch {
      // chưa có dữ liệu
    }
  }, []);

  useEffect(() => {
    load();
    // poll khi trợ lý đang được cài
    const t = setInterval(() => {
      setAccess((cur) => {
        if (!cur?.ready) load();
        return cur;
      });
    }, 8000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-[#A0A0B8]">
          Tìm kỹ năng từ ClawHub và cài vào trợ lý AI của bạn — bấm{" "}
          <b className="text-white">Install</b> là kỹ năng dùng được ngay.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setReload((n) => n + 1)}
            className="text-xs text-[#A0A0B8] hover:text-white"
            title="Tải lại"
          >
            ⟳ Tải lại
          </button>
          <a
            href={CLAWHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent-soft hover:underline"
          >
            Duyệt catalog ClawHub ↗
          </a>
        </div>
      </div>
      {access?.ready && access.url ? (
        <iframe
          key={reload}
          src={skillsSrc(access.url, access.token)}
          title="Chợ kỹ năng — OpenClaw Skills"
          className="min-h-0 flex-1 rounded-xl border border-surface-border"
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-base">Chợ kỹ năng</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#A0A0B8]">
              Trợ lý AI OpenClaw đang được khởi tạo — chợ kỹ năng sẽ mở tại đây
              khi trợ lý sẵn sàng (thường vài phút sau khi khởi chạy doanh
              nghiệp).
            </p>
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => load()}>
                Kiểm tra lại
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
