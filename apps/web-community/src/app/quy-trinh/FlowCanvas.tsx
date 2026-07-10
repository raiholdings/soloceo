"use client";

import "@flowgram.ai/free-layout-editor/index.css";
import {
  FreeLayoutEditor,
  FreeLayoutEditorProvider,
  type FreeLayoutProps,
  type WorkflowNodeRegistry,
} from "@flowgram.ai/free-layout-editor";
import { Fragment, useMemo } from "react";

/**
 * Canvas quy trình (FlowGram) cho SoloCEO OS v2 — N2.
 * 3 node nghiệp vụ:
 *  - agent_task     : giao việc cho DeerFlow (POST Gateway /threads/{id}/runs)
 *  - human_approval : chốt HITL — ghi ApprovalRequest, dừng chờ CEO duyệt ở
 *                     mục "Phê duyệt" (đã khép kín resume)
 *  - form           : nhập liệu
 *
 * CSR-only (dynamic ssr:false ở page.tsx) vì FlowGram thao tác DOM/canvas.
 * Flow serialize JSON, lưu theo org_id (persist ở api-core — bước nối tiếp).
 */

const NODE_REGISTRIES: WorkflowNodeRegistry[] = [
  {
    type: "start",
    meta: { isStart: true, deleteDisable: true, defaultPorts: [{ type: "output" }] },
    formMeta: { render: () => <Fragment /> },
  },
  {
    type: "agent_task",
    meta: {
      defaultPorts: [{ type: "input" }, { type: "output" }],
    },
    formMeta: { render: () => <Fragment /> },
  },
  {
    type: "human_approval",
    meta: {
      // 2 nhánh: đã duyệt / từ chối
      defaultPorts: [{ type: "input" }, { type: "output" }],
    },
    formMeta: { render: () => <Fragment /> },
  },
  {
    type: "form",
    meta: { defaultPorts: [{ type: "input" }, { type: "output" }] },
    formMeta: { render: () => <Fragment /> },
  },
  {
    type: "end",
    meta: { deleteDisable: true, defaultPorts: [{ type: "input" }] },
    formMeta: { render: () => <Fragment /> },
  },
];

// Flow demo: Bắt đầu → Giao việc AI → Chốt duyệt (HITL) → Kết thúc.
const DEMO_FLOW = {
  nodes: [
    { id: "start_0", type: "start", meta: { position: { x: 0, y: 160 } }, data: { title: "Bắt đầu" } },
    { id: "agent_0", type: "agent_task", meta: { position: { x: 280, y: 160 } }, data: { title: "Giao việc cho AI" } },
    { id: "appr_0", type: "human_approval", meta: { position: { x: 560, y: 160 } }, data: { title: "CEO phê duyệt" } },
    { id: "end_0", type: "end", meta: { position: { x: 840, y: 160 } }, data: { title: "Kết thúc" } },
  ],
  edges: [
    { sourceNodeID: "start_0", targetNodeID: "agent_0" },
    { sourceNodeID: "agent_0", targetNodeID: "appr_0" },
    { sourceNodeID: "appr_0", targetNodeID: "end_0" },
  ],
};

export default function FlowCanvas() {
  const editorProps = useMemo<FreeLayoutProps>(
    () => ({
      background: true,
      readonly: false,
      // Lib khai initialData=FlowDocumentJSON (thiếu edges top-level) nhưng
      // free-layout runtime DÙNG edges top-level — cast tại biên, runtime đúng.
      initialData: DEMO_FLOW as unknown as FreeLayoutProps["initialData"],
      nodeRegistries: NODE_REGISTRIES,
    }),
    [],
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full">
      <FreeLayoutEditorProvider {...editorProps}>
        <FreeLayoutEditor />
      </FreeLayoutEditorProvider>
    </div>
  );
}
