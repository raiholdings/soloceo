"use client";
// Gallery "Tạo dự án theo mẫu" hiển thị dưới ô chat ở màn hình chat mới (kiểu Manus).
// Lấy mẫu dự án công khai từ marketplace (api-core). Bấm 1 mẫu → nạp lời nhắc dựng
// dự án vào thread mới (qua startTemplateKickoff → sessionStorage + điều hướng chats/new).
import { SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { startTemplateKickoff, type ProjectTemplate } from "./soloceo-kickoff";

const API = "https://api.soloceo.vn/v1";
const INDNAME: Record<string, string> = {
  "du-lich": "Du lịch", fnb: "F&B", "giao-duc": "Giáo dục", "bat-dong-san": "BĐS",
  "ban-le": "Bán lẻ", "dich-vu": "Dịch vụ", "tai-chinh": "Tài chính",
  "cong-nghe": "Công nghệ", "thuong-mai": "Thương mại", khac: "Khác",
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
  const list = (ind === "all" ? all : all.filter((t) => t.industry === ind)).slice(0, 40);
  return (
    <div className={cn("mx-auto w-full max-w-(--container-width-md)", className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <SparklesIcon className="size-4" /> Tạo dự án theo mẫu
        </div>
        <a
          href="https://marketplace.soloceo.vn"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Xem tất cả {all.length} mẫu →
        </a>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5 px-1">
        <Chip on={ind === "all"} onClick={() => setInd("all")}>Tất cả</Chip>
        {inds.map((i) => (
          <Chip key={i} on={ind === i} onClick={() => setInd(i)}>{INDNAME[i] ?? i}</Chip>
        ))}
      </div>
      <div className="flex gap-3 overflow-x-auto px-1 pb-2">
        {list.map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => startTemplateKickoff(t)}
            className="group bg-card hover:border-foreground/30 flex w-64 shrink-0 flex-col rounded-xl border p-3.5 text-left transition hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">
                {INDNAME[t.industry ?? ""] ?? t.industry ?? "Dự án"}
              </span>
              {isFree(t) ? (
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                  MIỄN PHÍ
                </span>
              ) : (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                  M&A
                </span>
              )}
            </div>
            <div className="mt-1.5 line-clamp-2 text-sm leading-snug font-semibold">{t.name}</div>
            <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">{t.summary}</div>
            <div className="text-foreground/70 group-hover:text-foreground mt-auto pt-3 text-xs font-medium">
              ✦ Dựng mẫu này →
            </div>
          </button>
        ))}
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
        "rounded-full border px-2.5 py-1 text-xs transition",
        on ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
