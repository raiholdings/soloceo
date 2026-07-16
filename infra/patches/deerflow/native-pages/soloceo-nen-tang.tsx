"use client";
// Nền tảng — cổng dịch vụ PaaS + tên miền (platform.soloceo.vn / WHMCS).
// CEO đã đăng nhập workspace (my.soloceo.vn) → tự đăng nhập WHMCS (CreateSsoToken) → nhúng.
import { AlertCircle, ExternalLink, Globe, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";

export function SoloceoNenTang() {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);

  const resolve = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/workspace/api/nen-tang", { cache: "no-store" });
      const d = await r.json();
      if (d.url) { setUrl(d.url); setStatus("ready"); setNonce((n) => n + 1); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }, []);
  useEffect(() => { void resolve(); }, [resolve]);

  return (
    <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <Globe className="h-5 w-5 text-indigo-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Nền tảng &amp; Tên miền</div>
            <div className="text-muted-foreground text-xs truncate">Đăng ký nền tảng dạng dịch vụ (ERPNext, Odoo, OpenClaw, Hermes…) và mua tên miền cho doanh nghiệp của bạn.</div>
          </div>
          <button onClick={() => void resolve()} title="Tải lại" className="hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Tải lại
          </button>
          <button onClick={async () => { const r = await fetch("/workspace/api/nen-tang", { cache: "no-store" }); const d = await r.json(); if (d.url) window.open(d.url, "_blank", "noopener"); }}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700">
            <ExternalLink className="h-3.5 w-3.5" /> Mở tab mới
          </button>
        </div>

        {status === "loading" && (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            Đang mở cổng Nền tảng…
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <AlertCircle className="h-7 w-7 text-amber-500" />
            <div className="text-muted-foreground max-w-md">Chưa mở được Nền tảng. Vui lòng bấm <b>Tải lại</b>.</div>
            <button onClick={() => void resolve()} className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"><RefreshCw className="h-4 w-4" /> Thử lại</button>
          </div>
        )}
        {status === "ready" && url && (
          <iframe key={nonce} src={url} title="Nền tảng SoloCEO" className="min-h-0 w-full flex-1 border-0" />
        )}
      </div>
    </WorkspaceBody></WorkspaceContainer>
  );
}
