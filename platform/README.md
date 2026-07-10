# platform/ — 8 nền tảng v2 (SoloCEO OS v2)

Khung theo SOLOCEO-DEERFLOW-SPEC.md §7. Mỗi thư mục là điểm tích hợp 1 nền tảng
(đa số chạy dạng container trên VPS — code ở đây là config/adapter/MCP contract).

- `deerflow/`  — lõi điều phối (#0): config model→LiteLLM, sub-agents, skills mount
- `sandbox/`   — AIO Sandbox (#1): provider warm-pool, map tenant→sandbox, hardening
- `rules/`     — arishem (#5): ruleset JSON + MCP rules-engine (HITL gate)
- `dlp/`       — godlp (#6): ruleset VN + pre-call hook LiteLLM
- `egress/`    — g3proxy (#7): allowlist per-tenant + audit

FlowGram (#2) nhúng trong `apps/web`; Midscene (#3) trong image sandbox;
Dolphin (#4) qua MCP `mcp-servers/dolphin-docs`.

> Trạng thái: KHUNG (PHA 3 sẽ điền). Nghiên cứu ở `research/R1–R7-report.md`.
