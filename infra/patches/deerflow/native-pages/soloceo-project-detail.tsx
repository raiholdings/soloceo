"use client";
// Chi tiết một "Dự án": ngữ cảnh dùng chung + bắt đầu trò chuyện trong dự án +
// danh sách cuộc trò chuyện + liên kết nghiệp vụ (CRM/Marketplace/Nền tảng).
import {
  ArrowLeftIcon, ExternalLinkIcon, FolderIcon, Loader2Icon, MessageSquarePlusIcon,
  MessageSquareIcon, PencilIcon, Trash2Icon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { soloceoApi } from "@/components/workspace/soloceo-api";
import { startProjectChat } from "@/components/workspace/soloceo-kickoff";
import {
  WorkspaceBody, WorkspaceContainer, WorkspaceHeader,
} from "@/components/workspace/workspace-container";

type Thread = { id: string; threadId: string; title?: string | null; createdAt: string };
type Project = {
  id: string; name: string; description?: string | null; instructions?: string | null;
  threads?: Thread[];
};

const TOOLS = [
  { label: "CRM", href: "/workspace/crm" },
  { label: "Nền tảng", href: "/workspace/nen-tang" },
  { label: "Marketplace", href: "https://marketplace.soloceo.vn", ext: true },
];

export function SoloceoProjectDetail() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? "");
  const [p, setP] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [instr, setInstr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await soloceoApi<Project>(`/projects/${id}`);
      setP(d);
      setName(d.name); setDesc(d.description ?? ""); setInstr(d.instructions ?? "");
    } catch {
      setNotFound(true);
    }
  }
  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function save() {
    setBusy(true);
    try {
      await soloceoApi(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), description: desc.trim(), instructions: instr.trim() }),
      });
      setEditing(false);
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm("Xoá dự án này? Các liên kết cuộc trò chuyện sẽ mất (chat vẫn còn).")) return;
    await soloceoApi(`/projects/${id}`, { method: "DELETE" });
    router.push("/workspace/du-an");
  }

  if (notFound) {
    return (
      <WorkspaceContainer>
        <WorkspaceHeader />
        <WorkspaceBody>
          <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-16 text-center text-sm">
            Không tìm thấy dự án.{" "}
            <a href="/workspace/du-an" className="text-foreground underline">← Về danh sách dự án</a>
          </div>
        </WorkspaceBody>
      </WorkspaceContainer>
    );
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <a
            href="/workspace/du-an"
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeftIcon className="size-3" /> Dự án
          </a>

          {p === null ? (
            <div className="text-muted-foreground py-16 text-center text-sm">
              <Loader2Icon className="mx-auto mb-2 size-5 animate-spin" /> Đang tải…
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex size-11 items-center justify-center rounded-xl">
                    <FolderIcon className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">{p.name}</h1>
                    {p.description && <p className="text-muted-foreground text-sm">{p.description}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-md border p-2 text-xs hover:bg-muted" title="Sửa">
                    <PencilIcon className="size-4" />
                  </button>
                  <button type="button" onClick={() => void remove()} className="rounded-md border p-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Xoá">
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>

              {/* Bắt đầu trò chuyện */}
              <button
                type="button"
                onClick={() => startProjectChat({ id: p.id, name: p.name, instructions: p.instructions })}
                className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <MessageSquarePlusIcon className="size-4" /> Bắt đầu trò chuyện trong dự án
              </button>

              {/* Ngữ cảnh */}
              <div className="bg-card mb-5 rounded-xl border p-4">
                <div className="mb-2 text-sm font-semibold">Ngữ cảnh dùng chung</div>
                {editing ? (
                  <div className="space-y-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" placeholder="Tên dự án" />
                    <input value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" placeholder="Mô tả" />
                    <textarea value={instr} onChange={(e) => setInstr(e.target.value)} rows={4} className="w-full rounded-md border bg-transparent px-3 py-2 text-sm" placeholder="Ngữ cảnh / hướng dẫn cho đội AI" />
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                        {busy && <Loader2Icon className="size-4 animate-spin" />} Lưu
                      </button>
                      <button type="button" onClick={() => setEditing(false)} className="rounded-md border px-4 py-2 text-sm">Huỷ</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {p.instructions || "Chưa có ngữ cảnh. Bấm ✎ để thêm — đội AI sẽ dùng cho mọi chat trong dự án."}
                  </p>
                )}
              </div>

              {/* Liên kết nghiệp vụ */}
              <div className="mb-5">
                <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Liên kết nghiệp vụ</div>
                <div className="flex flex-wrap gap-2">
                  {TOOLS.map((tool) => (
                    <a
                      key={tool.label}
                      href={tool.href}
                      {...(tool.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="bg-card hover:border-foreground/30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                    >
                      {tool.label} {tool.ext && <ExternalLinkIcon className="size-3" />}
                    </a>
                  ))}
                </div>
              </div>

              {/* Cuộc trò chuyện trong dự án */}
              <div>
                <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  Cuộc trò chuyện ({p.threads?.length ?? 0})
                </div>
                {(p.threads?.length ?? 0) === 0 ? (
                  <div className="text-muted-foreground bg-card rounded-xl border border-dashed py-8 text-center text-xs">
                    Chưa có cuộc trò chuyện. Bấm nút xanh ở trên để bắt đầu.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {p.threads!.map((t) => (
                      <a
                        key={t.id}
                        href={`/workspace/chats/${t.threadId}`}
                        className="bg-card hover:border-foreground/25 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                      >
                        <MessageSquareIcon className="text-muted-foreground size-4 shrink-0" />
                        <span className="line-clamp-1">{t.title || "Cuộc trò chuyện"}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
