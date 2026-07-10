# R3 — Nghiên cứu kỹ thuật FlowGram.ai (nhúng SoloCEO OS v2)

## 1. FlowGram là gì

- **Bản chất**: framework/toolkit React dựng canvas workflow AI (không phải sản phẩm hoàn chỉnh). TypeScript. Yêu cầu `styled-components`.
- **2 layout engine**:
  - **Free layout** (`free-layout`): node đặt tự do, nối bezier/polyline — **phù hợp nhất** cho SoloCEO (CEO thấy sơ đồ bộ máy).
  - **Fixed layout** (`fixed-layout`): vị trí cố định, hỗ trợ compound node (branch/loop).
- **Package npm** (đã kiểm chứng tồn tại):
  - `@flowgram.ai/free-layout-editor` (dùng cho ta) + CSS `@flowgram.ai/free-layout-editor/index.css`.
  - `@flowgram.ai/fixed-layout-editor`, `@flowgram.ai/free-snap-plugin`, `@flowgram.ai/minimap-plugin`.
  - `@flowgram.ai/create-app` (scaffolder `npx @flowgram.ai/create-app@latest`).
  - `@flowgram.ai/runtime-js` (runtime JS: TaskRun/Report/Result/Cancel/Validate).
  - Tầng thấp: `@flowgram.ai/node`, `@flowgram.ai/renderer`, `@flowgram.ai/editor`, `@flowgram.ai/variable` (thường re-export qua `free-layout-editor`). **[CẦN KIỂM CHỨNG]** `@flowgram.ai/runtime-node-js` (bản server) chưa xác nhận tồn tại.

## 2. Nhúng vào Next.js 15 App Router (`apps/web`)

- **Bắt buộc CSR** (DOM/canvas + IOC container ở client):
  - Component editor phải `"use client"`.
  - Nạp qua `dynamic(() => import('./FlowCanvas'), { ssr: false })` (styled-components + đo DOM vỡ khi SSR).
  - Import CSS `@flowgram.ai/free-layout-editor/index.css` trong file client.
- **React 19 (Next 15)**: **[CẦN KIỂM CHỨNG]** peerDependencies React chưa xác nhận; rủi ro qua `styled-components` (v5 chưa hỗ trợ React 19). Khuyến nghị: pin `styled-components@^6`, smoke test React 19; nếu vỡ → ghim React 18 cho `apps/web` hoặc cô lập canvas iframe. Chạy `npm ls react` loại trừ trùng bản React ("invalid hook call").

## 3. Định nghĩa custom node (đã kiểm chứng từ docs)

Đăng ký qua `nodeRegistries: WorkflowNodeRegistry[]` (import từ `@flowgram.ai/free-layout-editor`), truyền vào `FreeLayoutEditorProvider`/`useEditorProps`.

```ts
{
  type: 'agent_task',
  meta: {
    defaultPorts: [{ type: 'input' }, { type: 'output' }],
    // useDynamicPort: true,  // cổng động: quét DOM data-port-id/data-port-type
  },
  formMeta: {                       // cần nodeEngine.enable = true
    validateTrigger: ValidateTrigger.onChange,
    validate: { title: ({ value }) => value ? undefined : 'required' },
    render: () => (/* panel/form */),
  },
}
```

- **Render node**: `NodeRender(props: WorkflowNodeProps)` dùng `useNodeRender()` → `{ id, type, data, updateData, node, form }`; bọc `<WorkflowNodeRenderer node={props.node}>{form?.render()}</WorkflowNodeRenderer>`. Đăng ký `materials.renderDefaultNode`.
- **Port/anchor**: `meta.defaultPorts` `{ type: 'input'|'output' }`; cổng động `useDynamicPort` (cho HumanApproval nhiều nhánh). Edge tham chiếu `sourcePortID`/`targetPortID`.
- **Panel thuộc tính**: `formMeta.render` + `Field`. Cập nhật: `form.setValueIn`, `form.getValueIn`, `form.updateFormValues`. `history.enable` cho undo/redo.
- **Runtime node ops**: `ctx.document.createWorkflowNode({...})`, `node.dispose()`, `ctx.document.batchAddFromJSON(...)`.

## 4. Thiết kế 3 node (AgentTask / HumanApproval / Form)

`data` (form values) = hợp đồng với Gateway.

- **`agent_task`**: ports `input`+`output` (+`error`/`timeout` dynamic). `data: { title, deerflowRunPreset, prompt, inputsMapping, model, timeoutSec }`. Handler: gọi DeerFlow tạo run → poll/stream → ghi output.
- **`human_approval`**: ports `input` + 2 output động `approved`/`rejected` (`useDynamicPort`). `data: { title, approverRole, message, resumePayloadSchema }`. Handler: gắn interrupt–resume DeerFlow; node "treo" chờ CEO duyệt → resume theo nhánh.
- **`form`**: ports `input`+`output`. `data: { title, fields:[{name,label,type,required}], values }`. Handler: thu input → `inputs` cho run kế / resume.

Chuẩn hóa contract mỗi node: `inputs` (ref `{type:'ref', content:[nodeID,key]}`), `outputs` (schema), `status` (idle/processing/success/fail).

## 5. Schema JSON của flow (đã kiểm chứng)

`WorkflowJSON`:
```jsonc
{
  "nodes": [
    { "id": "start_0", "type": "start",
      "meta": { "position": { "x": 0, "y": 0 } },
      "data": { "title": "Start" }, "blocks": [], "edges": [] }
  ],
  "edges": [
    { "sourceNodeID": "start_0", "targetNodeID": "node_0",
      "sourcePortID": "out", "targetPortID": "in" }
  ]
}
```
- **Lưu/nạp**: `document.toJSON()` lưu; nạp `initialData` prop hoặc `document.fromJSON(data)`/`operation.fromJSON` (có undo). Auto-save: `document.onContentChange(debounce(...))`.
- **Khác biệt quan trọng**: editor JSON dùng `sourcePortID`/`targetPortID`; runtime `@flowgram.ai/runtime-js` dùng `sourcePort`/`targetPort` (không hậu tố ID) → **cần adapter khi map**.
- **Versioning**: FlowGram **không có** cơ chế version tích hợp → tự bọc `{ schemaVersion:"1", flow: WorkflowJSON }` trong DB + migrator khi đổi cấu trúc `data`. **[CẦN KIỂM CHỨNG]**

## 6. Hợp đồng API node ↔ DeerFlow Gateway

FlowGram runtime có 5 API (`@flowgram.ai/runtime-js`): `TaskRunAPI` (schema+inputs→taskID), `TaskReportAPI` (trạng thái workflow+node), `TaskResultAPI`, `TaskCancelAPI`, `TaskValidateAPI`. **FlowGram runtime KHÔNG biết DeerFlow** — node handler là lớp cầu nối.

**Kiến trúc khuyến nghị**: KHÔNG dùng runtime FlowGram làm engine chạy DeerFlow; thay vào đó **api-core (NestJS) đọc `WorkflowJSON`, tự orchestrate, gọi Gateway DeerFlow**:
- **AgentTask chạy** → api-core gọi DeerFlow "create run" (R1: `POST /api/threads/{id}/runs/stream`), truyền `prompt`/`inputs` từ `node.data`; stream/poll → ghi output.
- **HumanApproval ↔ interrupt-resume**: DeerFlow phát interrupt → api-core dừng tại node, hiện checkpoint HITL; CEO duyệt/từ chối → DeerFlow resume run (R1: `POST /api/threads/{id}/state` + run mới) → đi tiếp port `approved`/`rejected`.
- **Đồng bộ canvas**: polling/SSE map `nodeStatus` → highlight node (như SSE deploy đã có).

Kết luận: FlowGram = canvas + schema + form; "chạy node gọi endpoint nào" + "interrupt-resume" là hợp đồng **api-core định nghĩa dựa trên Gateway DeerFlow**.

## 7. License, version, build

- **License: MIT** (repo README). **[CẦN KIỂM CHỨNG]** license field từng package npm.
- **Pin exact version** (không `^`) + khóa lockfile; `free-layout-editor` re-export nhiều gói con phải đồng bộ version.
- Không cần build từ source cho MVP — cài từ npm. **Bắt buộc** `styled-components` + import CSS `index.css`.

---

## GIẢ ĐỊNH & CẦN KIỂM CHỨNG

1. React 19/Next 15 tương thích (pin styled-components v6, smoke test). 2. License từng package npm. 3. Tên gói runtime server. 4. Version number cụ thể để pin (đọc npm lúc cài). 5. Endpoint DeerFlow Gateway (create run/resume) — thuộc R1, không phải FlowGram. 6. Khác biệt key edge `sourcePortID` vs `sourcePort` (đã xác nhận, cần adapter). 7. Kiến trúc api-core orchestrator là lựa chọn thiết kế.

**Đã kiểm chứng chắc** (docs GitHub bytedance/flowgram.ai): tên gói `@flowgram.ai/free-layout-editor`/`fixed-layout-editor`/`free-snap-plugin`/`minimap-plugin`/`create-app`/`runtime-js`; API `nodeRegistries`/`WorkflowNodeRegistry`/`formMeta`/`meta.defaultPorts`/`useDynamicPort`/`useNodeRender`/`WorkflowNodeRenderer`; `WorkflowJSON`; `toJSON`/`fromJSON`/`onContentChange`; 5 API runtime; license MIT repo root.
