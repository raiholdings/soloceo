"use client";
// Đào tạo (LMS) — Academy LMS tại edu.soloceo.vn. Mở workspace/dao-tao → auto-SSO
// (CEO đã đăng nhập workspace) → nhúng khoá học/quản trị LMS của họ.
import { AlertCircle, ExternalLink, GraduationCap, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";

export function SoloceoEdu() {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);

  const resolve = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/workspace/api/edu-sso", { cache: "no-store" });
      const d = await r.json();
      if (d.url) { setUrl(d.url); setStatus("ready"); setNonce((n) => n + 1); }
      else setStatus("error");
    } catch { setStatus("error"); }
  }, []);

  useEffect(() => { void resolve(); }, [resolve]);

  return (
    <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <GraduationCap className="h-5 w-5 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Đào tạo (LMS)</div>
            <div className="text-muted-foreground text-xs truncate">Khoá học · học viên · bài giảng · chứng chỉ — nền tảng đào tạo trực tuyến của bạn (edu.soloceo.vn).</div>
          </div>
          <button onClick={() => void resolve()} title="Tải lại" className="hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Tải lại
          </button>
          <button onClick={async () => { const r = await fetch("/workspace/api/edu-sso", { cache: "no-store" }); const d = await r.json(); if (d.url) window.open(d.url, "_blank", "noopener"); }}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
            <ExternalLink className="h-3.5 w-3.5" /> Mở tab mới
          </button>
        </div>

        {status === "loading" && (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            Đang mở nền tảng đào tạo của bạn…
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <AlertCircle className="h-7 w-7 text-amber-500" />
            <div className="text-muted-foreground max-w-md">Chưa mở được LMS. Vui lòng bấm <b>Tải lại</b>.</div>
            <button onClick={() => void resolve()} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"><RefreshCw className="h-4 w-4" /> Thử lại</button>
          </div>
        )}
        {status === "ready" && url && (
          <iframe key={nonce} src={url} title="Đào tạo LMS" className="min-h-0 w-full flex-1 border-0" allow="microphone; camera; fullscreen" />
        )}
      </div>
    </WorkspaceBody></WorkspaceContainer>
  );
}
