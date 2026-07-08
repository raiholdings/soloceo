"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Sparkles } from "lucide-react";
import { api, getToken } from "@/lib/api";

// Lễ tân AI trang chủ (kiểu manus.im): khách chat để được tư vấn và khởi tạo
// doanh nghiệp THẬT trên platform. Backend: POST /v1/concierge/chat.

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  reply: string;
  needLogin: boolean;
  launched: { platformUrl?: string } | null;
  loggedIn: boolean;
}

const SUGGESTIONS = [
  "Tôi muốn mở tiệm bánh online",
  "Khởi tạo doanh nghiệp cho tôi",
  "Tư vấn tên miền cho quán cà phê",
  "SoloCEO giúp tôi bán hàng thế nào?",
];

export function HeroChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [launched, setLaunched] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await api<ChatResponse>("/concierge/chat", {
        method: "POST",
        body: JSON.stringify({ messages: next.slice(-12) }),
      });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      setNeedLogin(r.needLogin && !r.loggedIn);
      if (r.launched) setLaunched(true);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Em gặp trục trặc nhỏ, anh/chị gửi lại tin nhắn giúp em nhé!",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const hasChat = messages.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        className={`rounded-2xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur-xl transition-all ${
          hasChat ? "p-4" : "p-3"
        }`}
      >
        {hasChat && (
          <div
            ref={boxRef}
            className="mb-3 flex max-h-80 min-h-40 flex-col gap-3 overflow-y-auto pr-1"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "self-end bg-[#7C5CFF] text-white"
                    : "self-start bg-white/10 text-white/95"
                }`}
              >
                {m.role === "assistant" && (
                  <Bot className="mb-1 inline h-4 w-4 text-[#b7a5ff]" />
                )}{" "}
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="self-start rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white/70">
                <span className="animate-pulse">Em đang xử lý...</span>
              </div>
            )}
            {launched && (
              <a
                href="https://platform.soloceo.vn"
                className="self-start rounded-xl bg-emerald-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                🚀 Mở SoloCEO OS — xem không gian đang được dựng →
              </a>
            )}
            {needLogin && !getToken() && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL ?? "https://api.soloceo.vn"}/v1/auth/wowonder/login?return_url=${encodeURIComponent("https://soloceo.vn/")}`}
                className="self-start rounded-xl bg-[#7C5CFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8d70ff]"
              >
                Đăng nhập Cộng đồng để khởi tạo →
              </a>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={hasChat ? 1 : 2}
            placeholder="Kể ý tưởng kinh doanh của bạn — AI sẽ dựng doanh nghiệp cho bạn..."
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            onClick={() => send()}
            disabled={busy || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF] text-white transition hover:bg-[#8d70ff] disabled:opacity-40"
            aria-label="Gửi"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!hasChat && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#b7a5ff]" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
