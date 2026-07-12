"use client";
// N2 FlowGram — "Quy trình": CEO biến việc lặp thành quy trình tái dùng.
// Node có hình (thẻ màu theo loại), nối tuần tự, CHẠY THẬT (agent_task→DeerFlow,
// human_approval→Phê duyệt), lưu theo org_id qua api-core /v1/flows.
import {
  ArrowDown, Bot, CheckSquare, FileText, Play, Plus, Save, ShieldCheck,
  StickyNote, Trash2, Workflow, Loader2, ChevronLeft, CircleDot, Flag,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";
import { KICKOFF_KEY } from "@/components/workspace/soloceo-kickoff";

type NodeType = "start" | "agent_task" | "human_approval" | "form" | "note" | "end";
type FlowNode = { id: string; type: NodeType; title: string; config?: { prompt?: string; label?: string } };
type Flow = { id: string; name: string; graphJson: { nodes: FlowNode[]; edges: unknown[] }; updatedAt?: string };

const NODE_META: Record<NodeType, { label: string; icon: typeof Bot; color: string; addable: boolean }> = {
  start: { label: "Bắt đầu", icon: CircleDot, color: "text-slate-500", addable: false },
  agent_task: { label: "Giao đội AI", icon: Bot, color: "text-emerald-600", addable: true },
  human_approval: { label: "Chờ CEO duyệt", icon: ShieldCheck, color: "text-amber-600", addable: true },
  form: { label: "Biểu mẫu", icon: FileText, color: "text-blue-600", addable: true },
  note: { label: "Ghi chú", icon: StickyNote, color: "text-violet-600", addable: true },
  end: { label: "Kết thúc", icon: Flag, color: "text-slate-500", addable: false },
};

const uid = () => "n" + Math.random().toString(36).slice(2, 9);

function newFlow(name: string): Flow {
  return {
    id: "", name,
    graphJson: {
      nodes: [
        { id: "start", type: "start", title: "Bắt đầu" },
        { id: "end", type: "end", title: "Kết thúc" },
      ],
      edges: [],
    },
  };
}

// 2 mẫu quy trình gợi ý
const TEMPLATES: { name: string; nodes: FlowNode[] }[] = [
  {
    name: "Chốt sổ cuối tháng",
    nodes: [
      { id: uid(), type: "agent_task", title: "Kế toán tổng hợp thu–chi tháng", config: { prompt: "Sub-agent Kế toán tổng hợp toàn bộ thu–chi tháng này thành bảng, chỉ ra chênh lệch bất thường." } },
      { id: uid(), type: "human_approval", title: "CEO duyệt báo cáo tài chính", config: { label: "Duyệt số liệu trước khi khoá sổ" } },
      { id: uid(), type: "agent_task", title: "Lập báo cáo gửi cổ đông", config: { prompt: "Soạn báo cáo tài chính tháng ngắn gọn cho cổ đông từ số liệu đã duyệt." } },
    ],
  },
  {
    name: "Đăng bài bán hàng hằng tuần",
    nodes: [
      { id: uid(), type: "agent_task", title: "Nội dung soạn 3 bài tuần này", config: { prompt: "Sub-agent Nội dung soạn 3 bài đăng bán hàng cho tuần này theo giọng thương hiệu." } },
      { id: uid(), type: "human_approval", title: "CEO duyệt nội dung", config: { label: "Duyệt bài trước khi đăng" } },
      { id: uid(), type: "agent_task", title: "Lên lịch đăng + đo hiệu quả", config: { prompt: "Lên lịch đăng 3 bài đã duyệt và đề xuất cách đo hiệu quả." } },
    ],
  },
];

export function SoloceoQuyTrinh() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [editing, setEditing] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    try { setFlows(await soloceoApi<Flow[]>("/flows")); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadFlows(); }, [loadFlows]);

  // ── builder ops ──
  function addNode(type: NodeType) {
    if (!editing) return;
    const nodes = [...editing.graphJson.nodes];
    const endIdx = nodes.findIndex((n) => n.type === "end");
    const node: FlowNode = { id: uid(), type, title: NODE_META[type].label, config: type === "agent_task" ? { prompt: "" } : type === "human_approval" ? { label: "" } : {} };
    nodes.splice(endIdx < 0 ? nodes.length : endIdx, 0, node);
    setEditing({ ...editing, graphJson: { ...editing.graphJson, nodes } });
  }
  function updateNode(id: string, patch: Partial<FlowNode>) {
    if (!editing) return;
    setEditing({ ...editing, graphJson: { ...editing.graphJson, nodes: editing.graphJson.nodes.map((n) => n.id === id ? { ...n, ...patch, config: { ...n.config, ...patch.config } } : n) } });
  }
  function removeNode(id: string) {
    if (!editing) return;
    setEditing({ ...editing, graphJson: { ...editing.graphJson, nodes: editing.graphJson.nodes.filter((n) => n.id !== id) } });
  }
  function move(id: string, dir: -1 | 1) {
    if (!editing) return;
    const nodes = [...editing.graphJson.nodes];
    const i = nodes.findIndex((n) => n.id === id);
    const j = i + dir;
    if (j <= 0 || j >= nodes.length - 1) return; // giữ start đầu, end cuối
    [nodes[i], nodes[j]] = [nodes[j]!, nodes[i]!];
    setEditing({ ...editing, graphJson: { ...editing.graphJson, nodes } });
  }

  async function save() {
    if (!editing) return;
    setBusy(true); setErr(null);
    try {
      const body = JSON.stringify({ name: editing.name, graphJson: editing.graphJson });
      const saved = editing.id
        ? await soloceoApi<Flow>(`/flows/${editing.id}`, { method: "PUT", body })
        : await soloceoApi<Flow>("/flows", { method: "POST", body });
      setEditing(saved);
      await loadFlows();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  // Chạy quy trình = mở phiên chat để CEO XEM đội AI chạy từng bước (không tạo
  // thread ẩn). Bước "Chờ CEO duyệt" → AI dừng lại báo bạn. Không cần lưu trước.
  function runFlow() {
    if (!editing) return;
    const steps = editing.graphJson.nodes.filter((n) => n.type !== "start" && n.type !== "end");
    if (steps.length === 0) { setErr("Quy trình chưa có bước nào."); return; }
    const lines = steps.map((n, i) => {
      if (n.type === "human_approval") return `Bước ${i + 1} — ⏸ DỪNG chờ tôi phê duyệt: ${n.title}${n.config?.label ? ` (${n.config.label})` : ""}. Tóm tắt kết quả trước đó rồi hỏi tôi Duyệt/Từ chối, KHÔNG tự tiếp.`;
      if (n.type === "agent_task") return `Bước ${i + 1} — GIAO ĐỘI AI: ${n.title}. ${n.config?.prompt ?? ""}`;
      return `Bước ${i + 1} — ${n.title} (${n.type}).`;
    });
    const text =
      `Hãy chạy giúp tôi quy trình "${editing.name}" theo ĐÚNG THỨ TỰ dưới đây, làm từng bước một, ` +
      `báo cáo kết quả ngắn gọn sau mỗi bước bằng tiếng Việt. Gặp bước có ⏸ thì DỪNG chờ tôi quyết định rồi mới tiếp:\n\n` +
      lines.join("\n") +
      `\n\nBắt đầu từ Bước 1.`;
    try { sessionStorage.setItem(KICKOFF_KEY, JSON.stringify({ text, flow: editing.name })); } catch { /* bỏ qua */ }
    window.location.assign("/workspace/chats/new");
  }
  async function del(id: string) {
    await soloceoApi(`/flows/${id}`, { method: "DELETE" }).catch(() => null);
    await loadFlows();
  }

  // ── UI: builder ──
  if (editing) {
    const editableNodes = editing.graphJson.nodes;
    return (
      <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <button onClick={() => { setEditing(null); setRunResult(null); }} className="text-muted-foreground mb-4 inline-flex items-center gap-1.5 text-sm hover:underline">
            <ChevronLeft className="h-4 w-4" /> Danh sách quy trình
          </button>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Workflow className="h-6 w-6 text-emerald-600" />
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-lg font-semibold outline-none focus:ring-2 focus:ring-emerald-500" />
            <button onClick={() => void save()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu
            </button>
            <button onClick={() => runFlow()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <Play className="h-4 w-4" /> Chạy quy trình
            </button>
          </div>
          {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
          {runResult && <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">{runResult} — xem <a className="underline" href="/workspace/phe-duyet">Phê duyệt</a> & <a className="underline" href="/workspace/chats">Trò chuyện</a>.</div>}

          {/* sơ đồ node dọc */}
          <div className="space-y-1">
            {editableNodes.map((n, i) => {
              const M = NODE_META[n.type]; const Icon = M.icon;
              const fixed = n.type === "start" || n.type === "end";
              return (
                <div key={n.id}>
                  <div className={`rounded-xl border bg-card p-3 ${fixed ? "opacity-80" : ""}`}>
                    <div className="flex items-start gap-2">
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${M.color}`} />
                      <div className="min-w-0 flex-1">
                        {fixed ? (
                          <span className="font-medium">{n.title}</span>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${M.color}`}>{M.label}</span>
                            </div>
                            <input value={n.title} onChange={(e) => updateNode(n.id, { title: e.target.value })}
                              className="mt-0.5 w-full rounded border-transparent bg-transparent px-1 py-0.5 text-sm font-medium outline-none hover:bg-muted/40 focus:bg-muted/60" />
                            {n.type === "agent_task" && (
                              <textarea value={n.config?.prompt ?? ""} onChange={(e) => updateNode(n.id, { config: { prompt: e.target.value } })} rows={2}
                                placeholder="Lời giao việc cho đội AI…"
                                className="mt-1 w-full rounded border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500" />
                            )}
                            {n.type === "human_approval" && (
                              <input value={n.config?.label ?? ""} onChange={(e) => updateNode(n.id, { config: { label: e.target.value } })}
                                placeholder="Nội dung cần CEO duyệt…"
                                className="mt-1 w-full rounded border bg-transparent px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-500" />
                            )}
                          </>
                        )}
                      </div>
                      {!fixed && (
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <button onClick={() => move(n.id, -1)} className="text-muted-foreground rounded px-1 text-xs hover:bg-muted">▲</button>
                          <button onClick={() => move(n.id, 1)} className="text-muted-foreground rounded px-1 text-xs hover:bg-muted">▼</button>
                          <button onClick={() => removeNode(n.id)} className="rounded px-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  {i < editableNodes.length - 1 && <div className="flex justify-center py-0.5"><ArrowDown className="text-muted-foreground h-4 w-4" /></div>}
                </div>
              );
            })}
          </div>

          {/* thêm node */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(NODE_META) as NodeType[]).filter((t) => NODE_META[t].addable).map((t) => {
              const M = NODE_META[t]; const Icon = M.icon;
              return (
                <button key={t} onClick={() => addNode(t)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  <Plus className="h-3.5 w-3.5" /><Icon className={`h-4 w-4 ${M.color}`} /> {M.label}
                </button>
              );
            })}
          </div>
        </div>
      </WorkspaceBody></WorkspaceContainer>
    );
  }

  // ── UI: list ──
  return (
    <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Workflow className="h-6 w-6 text-emerald-600" />
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Quy trình</h1>
            <p className="text-muted-foreground text-sm">Biến việc lặp thành quy trình tái dùng — đội AI chạy, CEO duyệt ở đúng chỗ.</p>
          </div>
          <button onClick={() => setEditing(newFlow("Quy trình mới"))} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Tạo quy trình
          </button>
        </div>
        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</div>
        ) : (
          <div className="space-y-3">
            {flows.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <Workflow className="h-5 w-5 text-emerald-600" />
                <button onClick={() => setEditing(f)} className="min-w-0 flex-1 text-left">
                  <span className="font-medium">{f.name}</span>
                  <p className="text-muted-foreground text-xs">{(f.graphJson?.nodes?.length ?? 2) - 2} bước · sửa {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString("vi-VN") : ""}</p>
                </button>
                <button onClick={() => void del(f.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {flows.length === 0 && (
              <div className="rounded-xl border bg-card p-6">
                <p className="text-muted-foreground mb-3 text-sm">Chưa có quy trình. Bắt đầu từ mẫu:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEMPLATES.map((tpl) => (
                    <button key={tpl.name} onClick={() => setEditing({ id: "", name: tpl.name, graphJson: { nodes: [{ id: "start", type: "start", title: "Bắt đầu" }, ...tpl.nodes, { id: "end", type: "end", title: "Kết thúc" }], edges: [] } })}
                      className="rounded-lg border p-3 text-left text-sm transition hover:border-emerald-400">
                      <span className="flex items-center gap-1.5 font-medium"><CheckSquare className="h-4 w-4 text-emerald-600" /> {tpl.name}</span>
                      <span className="text-muted-foreground text-xs">{tpl.nodes.length} bước mẫu</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceBody></WorkspaceContainer>
  );
}
