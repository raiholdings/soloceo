"use client";

import { BotIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAgents } from "@/core/agents";
import { useI18n } from "@/core/i18n/hooks";
import type { Agent } from "@/core/agents/types";

import { AgentCard } from "./agent-card";

// Bộ lọc Trợ lý AI — gộp Mô hình KD / Phễu bán hàng / Thị trường + hàng chục trợ lý
// mặc định vào một nơi nên cần lọc. Không có trường "category" trên Agent → suy ra
// nhóm từ tên/mô tả/kỹ năng. Không khớp từ khóa nào → "Khác". Luôn có ô tìm kiếm.
type Group = { key: string; label: string; test: RegExp };

const GROUPS: Group[] = [
  { key: "mo-hinh-kd", label: "Mô hình KD", test: /mô hình|business model|\bbm[-_ ]|canvas|freemium|franchis|wealthtech|kinh doanh/i },
  { key: "pheu", label: "Phễu bán hàng", test: /phễu|funnel|\bsale|bán hàng|chuyển đổi/i },
  { key: "thi-truong", label: "Thị trường", test: /thị trường|market|đa kênh|tmđt|sàn|kênh bán|quảng cáo|\bads\b/i },
  { key: "huong-dan", label: "Hướng dẫn & Kỹ năng", test: /hướng dẫn|guide|siêu|playbook|kỹ năng|skill/i },
  { key: "crm", label: "CRM & Vận hành", test: /\bcrm\b|perfex|khách hàng|vận hành|chăm sóc|cskh/i },
  { key: "noi-dung", label: "Nội dung & Marketing", test: /nội dung|content|marketing|bài viết|social|thương hiệu/i },
];

function groupOf(a: Agent): string {
  const hay = `${a.name} ${a.description ?? ""} ${(a.skills ?? []).join(" ")} ${(a.tool_groups ?? []).join(" ")}`;
  for (const g of GROUPS) if (g.test.test(hay)) return g.key;
  return "khac";
}

export function AgentGallery() {
  const { t } = useI18n();
  const { agents, isLoading } = useAgents();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");

  const handleNewAgent = () => router.push("/workspace/agents/new");

  // Nhóm hiện diện thực tế (chỉ hiện chip có trợ lý) + đếm số lượng.
  const { chips, filtered } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of agents) counts.set(groupOf(a), (counts.get(groupOf(a)) ?? 0) + 1);
    const order = [...GROUPS.map((g) => g.key), "khac"];
    const label = (k: string) => (k === "khac" ? "Khác" : (GROUPS.find((g) => g.key === k)?.label ?? k));
    const chips = order
      .filter((k) => (counts.get(k) ?? 0) > 0)
      .map((k) => ({ key: k, label: label(k), count: counts.get(k) ?? 0 }));

    const q = query.trim().toLowerCase();
    const filtered = agents.filter((a) => {
      if (active !== "all" && groupOf(a) !== active) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        (a.skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    });
    return { chips, filtered };
  }, [agents, query, active]);

  return (
    <div className="flex size-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">{t.agents.title}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t.agents.description}
          </p>
        </div>
        <Button onClick={handleNewAgent}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          {t.agents.newAgent}
        </Button>
      </div>

      {/* Thanh lọc: tìm kiếm + chip nhóm */}
      {!isLoading && agents.length > 0 && (
        <div className="flex flex-col gap-3 border-b px-6 py-3">
          <div className="relative max-w-sm">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm trợ lý theo tên, mô tả, kỹ năng…"
              className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border pl-8 pr-8 text-sm outline-none focus-visible:ring-2"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="Xoá tìm kiếm"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip label="Tất cả" count={agents.length} active={active === "all"} onClick={() => setActive("all")} />
            {chips.map((c) => (
              <FilterChip key={c.key} label={c.label} count={c.count} active={active === c.key} onClick={() => setActive(c.key)} />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            {t.common.loading}
          </div>
        ) : agents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
              <BotIcon className="text-muted-foreground h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">{t.agents.emptyTitle}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t.agents.emptyDescription}
              </p>
            </div>
            <Button variant="outline" className="mt-2" onClick={handleNewAgent}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {t.agents.newAgent}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
            <SearchIcon className="h-6 w-6" />
            Không có trợ lý nào khớp bộ lọc.
            <button className="text-primary underline" onClick={() => { setQuery(""); setActive("all"); }}>
              Xoá bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((agent) => (
              <AgentCard key={agent.name} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "hover:bg-muted border-input text-muted-foreground")
      }
    >
      {label}
      <span className={"rounded-full px-1.5 text-[10px] " + (active ? "bg-white/20" : "bg-muted")}>{count}</span>
    </button>
  );
}
