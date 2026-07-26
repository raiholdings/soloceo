"use client";
// Chat đa kênh — mỗi CEO một tài khoản Support Board SaaS riêng (chat.soloceo.vn).
// Mở workspace/chat → tự tạo account (nếu chưa có) + SSO → nhúng hộp thư chat RIÊNG
// của CEO (WhatsApp/Telegram/Messenger/Zalo/Viber/ticket…). Kết nối kênh trong chính chat.
import { AlertCircle, ExternalLink, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";

export function SoloceoChat() {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);

  const resolve = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch("/workspace/api/chat-account", { cache: "no-store" });
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
          <MessageSquare className="h-5 w-5 text-sky-600" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Chat đa kênh của bạn</div>
            <div className="text-muted-foreground text-xs truncate">WhatsApp · Telegram · Messenger · Zalo · Viber · ticket — gộp về một hộp thư riêng cho doanh nghiệp bạn. Kết nối kênh trong <b>Cài đặt</b>.</div>
          </div>
          <button onClick={() => void resolve()} title="Tải lại" className="hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Tải lại
          </button>
          <button onClick={async () => { const r = await fetch("/workspace/api/chat-account", { cache: "no-store" }); const d = await r.json(); if (d.url) window.open(d.url, "_blank", "noopener"); }}
            className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700">
            <ExternalLink className="h-3.5 w-3.5" /> Mở tab mới
          </button>
        </div>

        {status === "loading" && (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            Đang chuẩn bị chat của bạn… (lần đầu có thể mất vài giây để khởi tạo)
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <AlertCircle className="h-7 w-7 text-amber-500" />
            <div className="text-muted-foreground max-w-md">Chưa mở được chat. Vui lòng bấm <b>Tải lại</b>. Nếu vẫn lỗi, có thể tài khoản chưa đủ quyền dùng chat.</div>
            <button onClick={() => void resolve()} className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"><RefreshCw className="h-4 w-4" /> Thử lại</button>
          </div>
        )}
        {status === "ready" && url && (
          <iframe key={nonce} src={url} title="Chat đa kênh của tôi" className="min-h-0 w-full flex-1 border-0" allow="microphone; camera; clipboard-write" />
        )}
      </div>
    </WorkspaceBody></WorkspaceContainer>
  );
}
