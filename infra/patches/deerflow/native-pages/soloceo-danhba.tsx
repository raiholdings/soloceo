"use client";
import { Loader2, Building2, BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";

interface V { id: string; name: string; slug: string; industry?: string; revenueVerified?: boolean }

export function SoloceoDanhBa() {
  const [items, setItems] = useState<V[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    void soloceoApi<V[]>("/directory/ventures").then(setItems).catch((e) => { setErr((e as Error).message); setItems([]); });
  }, []);
  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Danh bạ doanh nghiệp</h1>
          <p className="text-muted-foreground text-sm">Các doanh nghiệp Solo CEO đang hoạt động.</p>
          {items === null && <div className="text-muted-foreground mt-6 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</div>}
          {err && <p className="mt-4 text-sm text-amber-700">Không tải được: {err}</p>}
          {items?.length === 0 && !err && <p className="text-muted-foreground mt-6 text-sm">Chưa có doanh nghiệp nào.</p>}
          <ul className="mt-4 space-y-2">
            {items?.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-lg border p-3">
                <Building2 className="text-muted-foreground h-5 w-5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium">{v.name}
                    {v.revenueVerified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}</div>
                  <div className="text-muted-foreground text-xs">{v.industry ?? "—"}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
