"use client";
// 💡 Ý tưởng khởi nghiệp từ Bộ não thứ 2 — mỗi giờ Xưởng ý tưởng (bigdata) đúc 1 ý tưởng
// BMC đầy đủ từ dữ liệu thật. CEO chấm sao + nhận thực thi; xếp hạng cộng đồng.
import { ExternalLinkIcon, FlameIcon, LightbulbIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { SoloceoIdeaComposer } from "./soloceo-idea-composer";

type Idea = {
  id: number; ten: string; nganh: string; tom_tat: string;
  so_vote: number; diem_tb: number; so_thuc_thi: number;
};

export function SoloceoIdeasStrip({ className }: { className?: string }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [msg, setMsg] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/workspace/api/y-tuong?sort=top&limit=6", { cache: "no-store" });
      const d = (await r.json()) as { ideas?: Idea[] };
      setIdeas(d.ideas ?? []);
    } catch { setIdeas([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = useCallback(async (id: number, action: "vote" | "thuc-thi", diem?: number) => {
    const r = await fetch("/workspace/api/y-tuong", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, diem }),
    });
    const d = (await r.json()) as { ok?: boolean; error?: string };
    setMsg(d.ok ? (action === "vote" ? `✓ Đã chấm ${diem}★` : "✓ Đã ghi nhận bạn thực thi") : (d.error ?? "Lỗi"));
    if (d.ok) void load();
  }, [load]);

  return (
    <div className={cn("mb-5", className)}>
      <div className="mb-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
          <LightbulbIcon className="size-4 text-amber-500" /> Khởi tạo ý tưởng của bạn
          <span className="text-muted-foreground text-xs font-normal">· engine đối chiếu vấn đề · giải pháp · mô hình · sản phẩm · sự kiện đã có</span>
        </div>
        <SoloceoIdeaComposer />
      </div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <LightbulbIcon className="size-4 text-amber-500" /> Ý tưởng do Solo CEO &amp; engine tạo
          <span className="text-muted-foreground text-xs font-normal">· BMC đầy đủ · mỗi giờ 1 ý tưởng · cộng đồng xếp hạng</span>
        </div>
        <a href="https://bigdata.soloceo.vn/#ytuong" target="_blank" rel="noopener"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
          Xem tất cả <ExternalLinkIcon className="size-3" />
        </a>
      </div>
      <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", (!ideas || ideas.length === 0) && "hidden")}>
        {(ideas ?? []).map((x) => (
          <div key={x.id} className="bg-card rounded-xl border p-3.5 text-left">
            <div className="text-muted-foreground text-[11px] uppercase">{x.nganh || "Ý tưởng"}</div>
            <div className="mt-0.5 line-clamp-1 text-sm font-semibold">💡 {x.ten}</div>
            <div className="text-muted-foreground mt-1 line-clamp-2 min-h-[2.4em] text-xs">{x.tom_tat}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => void act(x.id, "vote", n)} title={`Chấm ${n} sao`}
                    className={cn("transition hover:scale-110", n <= Math.round(x.diem_tb) ? "text-amber-500" : "text-muted-foreground/40")}>★</button>
                ))}
                <span className="text-muted-foreground ml-1">{x.diem_tb || 0} ({x.so_vote})</span>
              </span>
              <button onClick={() => void act(x.id, "thuc-thi")}
                className="text-muted-foreground hover:text-orange-500 flex items-center gap-1">
                <FlameIcon className="size-3.5" /> {x.so_thuc_thi} thực thi
              </button>
              <a href={`https://bigdata.soloceo.vn/#idea-${x.id}`} target="_blank" rel="noopener"
                className="ml-auto text-emerald-600 hover:underline">Xem BMC ↗</a>
            </div>
          </div>
        ))}
      </div>
      {msg ? <div className="text-muted-foreground mt-1.5 text-xs">{msg}</div> : null}
    </div>
  );
}
