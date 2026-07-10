// Cầu nối node FlowGram ↔ api-core/DeerFlow — SoloCEO OS v2 (research/R3 §6).
// api-core là orchestrator (đọc WorkflowJSON, gọi Gateway DeerFlow). FlowGram chỉ
// là canvas. LOẠI KHỎI BUILD tới khi wire.

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.soloceo.vn/v1";

function auth(): Record<string, string> {
  const t = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Chạy 1 AgentTask: api-core tạo DeerFlow run (stream) rồi trả kết quả. */
export async function runAgentTask(input: {
  ventureId: string;
  agent?: string;
  prompt: string;
  inputs?: Record<string, unknown>;
}): Promise<{ runId: string }> {
  const r = await fetch(`${API}/ventures/${input.ventureId}/agent-runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth() },
    body: JSON.stringify(input),
  });
  return r.json();
}

/** Danh sách yêu cầu chờ duyệt (node HumanApproval hiển thị). Đã có ở api-core. */
export async function listPendingApprovals() {
  const r = await fetch(`${API}/approvals/pending`, { headers: auth() });
  return r.json();
}

/** Duyệt/từ chối → api-core resume DeerFlow theo nhánh approved/rejected. */
export async function decideApproval(id: string, approve: boolean, note?: string) {
  const r = await fetch(`${API}/approvals/${id}/${approve ? "approve" : "reject"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth() },
    body: JSON.stringify({ note }),
  });
  return r.json();
}
