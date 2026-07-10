// FlowGram custom node registries — SoloCEO OS v2 (research/R3 §3-4).
// 3 node: agent_task (giao việc DeerFlow), human_approval (chốt HITL), form (nhập liệu).
// LOẠI KHỎI BUILD tới khi cài @flowgram.ai (xem README). Import thật khi wire.
import type { WorkflowNodeRegistry } from "@flowgram.ai/free-layout-editor";

/** Giao 1 việc cho DeerFlow lead_agent/sub-agent; output = kết quả run. */
export const agentTaskNode: WorkflowNodeRegistry = {
  type: "agent_task",
  meta: {
    defaultPorts: [{ type: "input" }, { type: "output" }],
  },
  formMeta: {
    // panel thuộc tính: tiêu đề, prompt/giao việc, agent, timeout
    render: () => null, // TODO: Field(title/prompt/agent/timeoutSec) khi wire
  },
};

/** Chốt HITL — treo chờ CEO duyệt; 2 nhánh output approved/rejected. */
export const humanApprovalNode: WorkflowNodeRegistry = {
  type: "human_approval",
  meta: {
    // cổng động 2 nhánh approve/reject (useDynamicPort) — R3 §3
    useDynamicPort: true,
    defaultPorts: [{ type: "input" }],
  },
  formMeta: {
    render: () => null, // TODO: Field(approverRole, message)
  },
};

/** Thu thập input người dùng → inputs cho run/resume kế. */
export const formNode: WorkflowNodeRegistry = {
  type: "form",
  meta: {
    defaultPorts: [{ type: "input" }, { type: "output" }],
  },
  formMeta: {
    render: () => null, // TODO: Field(fields[])
  },
};

export const soloceoNodeRegistries: WorkflowNodeRegistry[] = [
  agentTaskNode,
  humanApprovalNode,
  formNode,
];
