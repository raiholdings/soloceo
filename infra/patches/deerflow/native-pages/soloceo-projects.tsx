"use client";
// Danh sách "Dự án" — folder nhẹ gom chat kiểu ChatGPT/Claude Projects.
import { FolderIcon, Loader2Icon, MessageSquareIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { soloceoApi } from "@/components/workspace/soloceo-api";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  updatedAt: string;
  _count?: { threads: number };
};

export function SoloceoProjects() {
  const router = useRouter();
  const [list, setList] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [instr, setInstr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const d = await soloceoApi<Project[]>("/projects");
      setList(Array.isArray(d) ? d : []);
    } catch {
      setList([]);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (name.trim().length < 1) return;
    setBusy(true);
    setErr(null);
    try {
      const p = await soloceoApi<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim() || undefined,
          instructions: instr.trim() || undefined,
        }),
      });
      router.push(`/workspace/du-an/${p.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <FolderIcon className="size-6 text-emerald-600" />
              <div>
                <h1 className="text-xl font-semibold">Dự án</h1>
                <p className="text-muted-foreground text-sm">
                  Mỗi dự án gom các cuộc trò chuyện + ngữ cảnh dùng chung — như ChatGPT/Claude Projects.
                </p>
              </div>
            </div>
            {!creating && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <PlusIcon className="size-4" /> Tạo dự án
              </button>
            )}
          </div>

          {creating && (
            <div className="bg-card mb-6 rounded-xl border p-4">
              <div className="mb-3">
                <label className="text-sm font-medium">Tên dự án *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Tiệm bánh healthy quận 1"
                  className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="mb-3">
                <label className="text-sm font-medium">Mô tả</label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Một câu về dự án"
                  className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="mb-3">
                <label className="text-sm font-medium">
                  Ngữ cảnh / hướng dẫn{" "}
                  <span className="text-muted-foreground font-normal">(đội AI dùng cho mọi chat trong dự án)</span>
                </label>
                <textarea
                  value={instr}
                  onChange={(e) => setInstr(e.target.value)}
                  rows={3}
                  placeholder="VD: Đây là dự án bán bánh healthy cho dân văn phòng. Giọng văn thân thiện, ưu tiên kênh Zalo…"
                  className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                />
              </div>
              {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || name.trim().length < 1}
                  onClick={() => void create()}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy && <Loader2Icon className="size-4 animate-spin" />} Tạo & mở
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-md border px-4 py-2 text-sm"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {list === null ? (
            <div className="text-muted-foreground py-16 text-center text-sm">
              <Loader2Icon className="mx-auto mb-2 size-5 animate-spin" /> Đang tải dự án…
            </div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground bg-card rounded-xl border border-dashed py-16 text-center text-sm">
              Chưa có dự án nào. Bấm <b>Tạo dự án</b> để bắt đầu.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => router.push(`/workspace/du-an/${p.id}`)}
                  className="group bg-card hover:border-foreground/25 flex flex-col rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="bg-muted mb-3 flex size-9 items-center justify-center rounded-xl">
                    <FolderIcon className="size-4.5 text-emerald-600" />
                  </div>
                  <div className="line-clamp-1 text-sm font-semibold">{p.name}</div>
                  <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                    {p.description || "Chưa có mô tả"}
                  </div>
                  <div className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
                    <MessageSquareIcon className="size-3" /> {p._count?.threads ?? 0} cuộc trò chuyện
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
