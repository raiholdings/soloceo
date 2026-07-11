"use client";

import { Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Section } from "../section";

const API_BASE = "https://api.soloceo.vn/v1";

interface Venture {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  description: string | null;
  revenueVerified: boolean;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const INDUSTRY_LABEL: Record<string, string> = {
  real_estate: "Bất động sản",
  fnb: "Ẩm thực & F&B",
  education: "Giáo dục",
  services: "Dịch vụ",
  other: "Doanh nghiệp",
};

// Bảng màu nền cho từng thẻ doanh nghiệp (xoay vòng theo thứ tự)
const GRADIENTS = [
  "linear-gradient(135deg,#3b2a6b 0%,#171523 70%)",
  "linear-gradient(135deg,#0f3b4d 0%,#121a22 70%)",
  "linear-gradient(135deg,#4a2a48 0%,#1c1420 70%)",
  "linear-gradient(135deg,#243b2a 0%,#131a15 70%)",
  "linear-gradient(135deg,#4a3520 0%,#1e1712 70%)",
  "linear-gradient(135deg,#2a3550 0%,#141822 70%)",
];

function OfficeGlyph({ className }: { className?: string }) {
  // Biểu tượng văn phòng 3D dạng đẳng cự (isometric) đơn giản
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 6 42 16v16L24 42 6 32V16L24 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity=".55"
      />
      <path
        d="M24 6v36M6 16l18 10 18-10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity=".55"
      />
      <circle cx="24" cy="24" r="3.2" fill="currentColor" />
    </svg>
  );
}

function ReceptionChat({ venture }: { venture: Venture }) {
  const greeting = `Dạ em chào anh/chị 👋 Em là trợ lý của ${venture.name}. Anh/chị cần em tư vấn hay hỗ trợ gì hôm nay ạ?`;
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(
        `${API_BASE}/directory/ventures/${venture.slug}/reception`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // bỏ lời chào mở đầu, chỉ gửi hội thoại thật
          body: JSON.stringify({ messages: next.slice(1) }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        reply?: string;
      } | null;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data?.reply ??
            "Dạ hệ thống đang bận một chút, anh/chị thử lại giúp em nhé!",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Dạ mạng đang trục trặc, anh/chị thử lại sau giây lát nhé!",
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, venture.slug]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[82%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">•</span>
                <span className="animate-bounce [animation-delay:.15s]">•</span>
                <span className="animate-bounce [animation-delay:.3s]">•</span>
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Nhập câu hỏi cho doanh nghiệp…"
          className="focus-visible:ring-primary max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border bg-transparent px-3.5 py-2.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          aria-label="Gửi"
          className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 focus-visible:ring-primary flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function CaseStudySection({ className }: { className?: string }) {
  const [ventures, setVentures] = useState<Venture[] | null>(null);
  const [active, setActive] = useState<Venture | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/directory/ventures`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Venture[]) => {
        if (alive) setVentures(Array.isArray(data) ? data : []);
      })
      .catch(() => alive && setVentures([]));
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback(() => setActive(null), []);

  // Đóng modal bằng Esc + khoá cuộn nền khi mở
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active, close]);

  return (
    <Section
      className={className}
      title="Doanh nghiệp trên SoloCEO"
      subtitle="Những doanh nghiệp một người đang vận hành trên nền tảng — ghé thăm và trò chuyện trực tiếp với trợ lý AI tiếp khách của họ."
    >
      <div className="container-md mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:px-20 lg:grid-cols-3">
        {ventures === null &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-card/40 h-64 animate-pulse rounded-xl border"
            />
          ))}

        {ventures?.length === 0 && (
          <div className="text-muted-foreground col-span-full flex h-64 flex-col items-center justify-center gap-3 rounded-xl border text-center">
            <OfficeGlyph className="h-10 w-10 opacity-40" />
            <p className="max-w-md text-sm">
              Chưa có doanh nghiệp nào được công bố. Hãy là Solo CEO đầu tiên —
              khởi tạo doanh nghiệp để có ngay không gian làm việc AI của riêng
              bạn.
            </p>
          </div>
        )}

        {ventures?.map((v, i) => {
          // openclawos = Venture #1 do đội AI vận hành → thẻ dẫn ra openclawos.vn
          const isExternal = v.slug === "openclawos";
          const cardClass =
            "group/card focus-visible:ring-primary relative h-64 overflow-hidden rounded-xl border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:outline-none";
          const inner = (
            <>
              <div
                className="absolute inset-0 z-0 transition-transform duration-500 group-hover/card:scale-105"
                style={{ background: GRADIENTS[i % GRADIENTS.length] }}
              />
              <OfficeGlyph className="absolute -right-6 -bottom-6 z-0 h-40 w-40 text-white/10" />

              <div className="relative z-10 flex h-full flex-col p-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Đang hoạt động
                  </span>
                  {v.revenueVerified && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">
                      Doanh thu đã xác thực
                    </span>
                  )}
                </div>

                <div className="mt-auto">
                  <p className="text-xs font-medium tracking-wide text-white/55 uppercase">
                    {INDUSTRY_LABEL[v.industry ?? "other"] ?? "Doanh nghiệp"}
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-white text-shadow-black">
                    {v.name}
                  </h3>
                  {v.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-white/70">
                      {v.description}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/90">
                    {isExternal ? "Ghé openclawos.vn" : "Trò chuyện với trợ lý"}
                    <span className="transition-transform duration-300 group-hover/card:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </div>
            </>
          );
          return isExternal ? (
            <a
              key={v.id}
              href="https://openclawos.vn"
              target="_blank"
              rel="noopener noreferrer"
              className={cardClass}
            >
              {inner}
            </a>
          ) : (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v)}
              className={cardClass}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Trợ lý tiếp khách của ${active.name}`}
          onClick={close}
        >
          <div
            className="bg-background flex h-full max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="bg-primary/12 text-primary flex h-9 w-9 flex-none items-center justify-center rounded-full">
                <OfficeGlyph className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{active.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  Trợ lý tiếp khách ·{" "}
                  {INDUSTRY_LABEL[active.industry ?? "other"] ?? "Doanh nghiệp"}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Đóng"
                className="hover:bg-muted focus-visible:ring-primary rounded-lg p-1.5 focus-visible:ring-2 focus-visible:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ReceptionChat venture={active} />

            <div className="text-muted-foreground border-t px-4 py-2 text-center text-[11px]">
              Đây là chủ doanh nghiệp?{" "}
              <a
                href="https://platform.soloceo.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Đăng nhập vào văn phòng 3D điều hành →
              </a>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
