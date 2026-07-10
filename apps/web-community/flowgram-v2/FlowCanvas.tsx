// FlowGram free-layout canvas — SoloCEO OS v2 (research/R3 §2,5).
// CSR-only: nạp qua dynamic(ssr:false). LOẠI KHỎI BUILD tới khi cài @flowgram.ai.
"use client";
import { useState } from "react";
import {
  FreeLayoutEditorProvider,
  EditorRenderer,
  type WorkflowJSON,
} from "@flowgram.ai/free-layout-editor";
import "@flowgram.ai/free-layout-editor/index.css";
import { soloceoNodeRegistries } from "./nodes";

const EMPTY: WorkflowJSON = {
  nodes: [
    {
      id: "start_0",
      type: "start",
      meta: { position: { x: 100, y: 200 } },
      data: { title: "Bắt đầu" },
    },
  ],
  edges: [],
};

export default function FlowCanvas({
  ventureId,
  initial,
}: {
  ventureId: string;
  initial?: WorkflowJSON;
}) {
  const [data] = useState<WorkflowJSON>(initial ?? EMPTY);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <FreeLayoutEditorProvider
        initialData={data}
        nodeRegistries={soloceoNodeRegistries}
        nodeEngine={{ enable: true }}
        history={{ enable: true }}
        // Lưu schema (bọc versioning: { schemaVersion, flow }) về api-core.
        onContentChange={(ctx: { document: { toJSON: () => WorkflowJSON } }) => {
          const flow = ctx.document.toJSON();
          void fetch(`/v1/ventures/${ventureId}/flow`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ schemaVersion: "1", flow }),
          }).catch(() => {});
        }}
      >
        <EditorRenderer />
      </FreeLayoutEditorProvider>
    </div>
  );
}
