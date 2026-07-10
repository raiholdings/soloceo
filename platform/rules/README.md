# platform/rules — svc-rules-engine (arishem HITL gate)

Ref: research/R6 §A. Microservice **Go** bọc thư viện `bytedance/arishem` (rule
engine JSON), expose HTTP cho api-core (Node) + MCP `rules-engine`.

## Chức năng
- `POST /evaluate {action, context}` → `{decision: allow|deny|require_approval, ruleId, tier}`.
- Load ruleset từ Postgres bảng `Rule` (per-org + toàn nền tảng) mỗi N giây, cache.
- arishem evaluate cây điều kiện JSON (`Rule.conditionJson`) với context/facts.
- Fail-safe: không match rule nào → dùng DEFAULT_ACTION_POLICY (api-core cũng có fallback).

## Điểm cắm
- api-core `RulesService` gọi qua `RULES_ENGINE_URL` (env, default `http://svc-rules-engine:8080`).
- DeerFlow `ArishemGuardrailProvider` (guardrail middleware, R1 §6) cũng gọi endpoint này.
- decision=require_approval → api-core tạo `ApprovalRequest` (HITL tầng 2).

## Cần làm khi deploy
1. Xác minh cú pháp JSON rule + license arishem (giả định Apache-2.0 — R6 §10, mở LICENSE).
2. Viết wrapper Go (`cmd/server`), build image `localhost:5000/soloceo/svc-rules-engine`.
3. Pin commit SHA arishem trong `infra/versions.lock`.

> Trạng thái: SPEC + contract (mcp-servers/rules-engine/CONTRACT.md). api-core đã sẵn
> RulesService fail-closed nên hệ thống an toàn kể cả khi service này chưa deploy.
