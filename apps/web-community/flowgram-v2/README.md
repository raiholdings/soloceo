# FlowGram canvas v2 — chờ wire (PHA 3 §6 bước 6)

Ref: research/R3-report.md. Code ở đây **đã loại khỏi build** (tsconfig `exclude:
["flowgram-v2"]`) vì cần cài `@flowgram.ai/*` (cần mạng). Khi sẵn sàng:

## 1. Cài package (cần mạng)
```bash
pnpm --filter @soloceo/web-community add \
  @flowgram.ai/free-layout-editor styled-components
# pin EXACT version (không ^) sau khi cài; khóa pnpm-lock.
# Smoke test React 19: pnpm --filter @soloceo/web-community exec npm ls react
# Nếu vỡ (styled-components/React 19) → pin styled-components@^6 hoặc ghim React 18.
```

## 2. Chuyển vào src + tạo route
- Chuyển `flowgram-v2/*` → `src/flowgram/`.
- Tạo route CSR-only: `src/app/quy-trinh/page.tsx`:
  ```tsx
  "use client";
  import dynamic from "next/dynamic";
  const FlowCanvas = dynamic(() => import("@/flowgram/FlowCanvas"), { ssr: false });
  export default function Page() { return <FlowCanvas ventureId={/* ... */} />; }
  ```
- Bỏ `"flowgram-v2"` khỏi tsconfig `exclude`.

## 3. Nối api-core
- `orchestrator.ts` gọi `/v1/...` của api-core: chạy AgentTask (DeerFlow run),
  HumanApproval nối `/v1/approvals` (đã có ở PHA 3), Form thu input.

## Files
- `nodes.ts` — 3 node registry: `agent_task`, `human_approval`, `form`.
- `FlowCanvas.tsx` — canvas free-layout CSR + save/load `WorkflowJSON`.
- `orchestrator.ts` — cầu nối node ↔ api-core/DeerFlow.

> Mọi API `@flowgram.ai` đã đối chiếu docs (R3); chỗ chưa chắc gắn `// [CẦN KIỂM CHỨNG]`.
