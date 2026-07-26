"use client";
// Gallery "Tạo dự án theo mẫu" — lưới thẻ kiểu Manus dưới ô chat (màn chat mới
// đã chuyển sang bố cục top-aligned + cuộn). Bấm 1 mẫu → dựng dự án trong thread mới.
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { SoloceoIdeasStrip } from "./soloceo-ideas-strip";
import { startTemplateKickoff, type ProjectTemplate } from "./soloceo-kickoff";

const API = "https://api.soloceo.vn/v1";
const LIMIT = 9;
const INDNAME: Record<string, string> = {
  "du-lich": "Du lịch", fnb: "F&B", "giao-duc": "Giáo dục", "bat-dong-san": "BĐS",
  "ban-le": "Bán lẻ", "dich-vu": "Dịch vụ", "tai-chinh": "Tài chính",
  "cong-nghe": "Công nghệ", "thuong-mai": "Thương mại", khac: "Khác",
};
const ICON: Record<string, string> = {
  "du-lich": "✈️", fnb: "🍜", "giao-duc": "🎓", "bat-dong-san": "🏠", "ban-le": "🛍️",
  "dich-vu": "🧰", "tai-chinh": "💰", "cong-nghe": "🤖", "thuong-mai": "🛒", khac: "📦",
};
const isFree = (t: ProjectTemplate) => Number(t.priceVnd) === 0;

export function SoloceoProjectTemplates({ className }: { className?: string }) {
  const [all, setAll] = useState<ProjectTemplate[] | null>(null);
  const [ind, setInd] = useState("all");
  useEffect(() => {
    let ok = true;
    fetch(`${API}/marketplace/project-templates`)
      .then((r) => r.json())
      .then((d) => { if (ok) setAll(Array.isArray(d) ? d : []); })
      .catch(() => { if (ok) setAll([]); });
    return () => { ok = false; };
  }, []);
  const inds = useMemo(
    () => (all ? ([...new Set(all.map((t) => t.industry).filter(Boolean))] as string[]) : []),
    [all],
  );
  if (!all || all.length === 0) return null;
  const list = (ind === "all" ? all : all.filter((t) => t.industry === ind)).slice(0, LIMIT);

  return (
    <div className={cn("mx-auto w-full max-w-(--container-width-md)", className)}>
      <SoloceoIdeasStrip />
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SparklesIcon className="size-4 text-emerald-500" /> Tạo dự án theo mẫu
        </div>
        <a
          href="https://marketplace.soloceo.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs transition"
        >
          Xem tất cả {all.length} mẫu <ArrowRightIcon className="size-3" />
        </a>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5 px-0.5">
        <Chip on={ind === "all"} onClick={() => setInd("all")}>Tất cả</Chip>
        {inds.map((i) => (
          <Chip key={i} on={ind === i} onClick={() => setInd(i)}>{INDNAME[i] ?? i}</Chip>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => {
          const free = isFree(t);
          const key = t.industry ?? "";
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => startTemplateKickoff(t)}
              className={cn(
                "group border-border/70 bg-card hover:border-foreground/25",
                "flex flex-col rounded-2xl border p-4 text-left shadow-sm transition-all",
                "hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="bg-muted flex size-9 items-center justify-center rounded-xl text-lg leading-none">
                  {ICON[key] ?? "📦"}
                </div>
                {free ? (
                  <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {new Intl.NumberFormat("vi-VN").format(Number((t as {monthlyFeeVnd?: number}).monthlyFeeVnd) || 0)}đ/th
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                    M&A
                  </span>
                )}
              </div>
              <div className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
                {INDNAME[key] ?? t.industry ?? "Dự án"}
              </div>
              <div className="mt-0.5 line-clamp-1 text-sm font-semibold">{t.name}</div>
              <div className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                {t.summary}
              </div>
              <div className="text-muted-foreground group-hover:text-foreground mt-3 flex items-center gap-1 text-xs font-medium transition-colors">
                <SparklesIcon className="size-3" /> Dựng mẫu này
                <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        on
          ? "border-foreground bg-foreground text-background font-medium"
          : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
