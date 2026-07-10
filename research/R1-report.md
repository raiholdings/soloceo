# R1 — Nghiên cứu kỹ thuật DeerFlow 2.0 (bytedance/deer-flow)

> Nguồn: GitHub `bytedance/deer-flow` (branch `main`) — README + đọc trực tiếp source tree/file. Bản viết lại v2.0 (~28/02/2026). Xây trên LangGraph 1.0 / LangChain, Python 3.12+.

## 1. Cấu hình model (provider / base_url / fallback)

- Cấu hình chính ở `config.yaml`, secrets ở `.env`. Model factory: `backend/packages/harness/deerflow/models/factory.py`.
- Mỗi entry `models:` chấp nhận (đọc trực tiếp `factory.py`): `name`, `use` (class path, vd `langchain_openai:ChatOpenAI`), `model`, `api_key` (`$OPENAI_API_KEY`), `base_url` (normalize alias `openai_api_base`/`api_base`), feature flags (`supports_thinking/reasoning_effort/vision`...), tuning (`max_tokens`, `max_retries`, `model_kwargs`, `extra_body`, `stream_usage`, `pricing`).
- Trỏ về LiteLLM:
  ```yaml
  models:
    - name: soloceo-smart
      use: langchain_openai:ChatOpenAI
      model: soloceo-smart          # tên virtual model trong LiteLLM
      base_url: https://llm.soloceo.vn
      api_key: $LITELLM_MASTER_KEY
  ```
- **Fallback**: `factory.py` KHÔNG có failover đa-model (không `with_fallbacks`). Chỉ `max_retries` cấp-request. → **Đặt fallback ở tầng LiteLLM** (routing/fallbacks). **[CẦN KIỂM CHỨNG]** có "role" model fast/smart theo tác vụ nhưng không phải failover.
- Provider chuyên biệt sẵn: `claude_provider.py`, `openai_codex_provider.py`, `vllm_provider.py`, `mindie_provider.py`, patch DeepSeek/MiniMax/StepFun. Env đã thấy: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `VLLM_API_KEY`, `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`.

## 2. Sandbox (abstraction + AioSandboxProvider)

- Thư mục `backend/packages/harness/deerflow/sandbox/`. Interface `sandbox_provider.py`; kèm `sandbox.py`, `middleware.py`, `env_policy.py`, `security.py`, `file_operation_lock.py`, `tools.py`, `local/`.
- Chọn provider qua config `sandbox.use` → resolve class implement `SandboxProvider` (dùng `reflection/resolvers.py`).
- `SandboxProvider` (abstract) — method chính: `acquire(thread_id=None, *, user_id=None) -> str` (trả `sandbox_id`), `get(sandbox_id)`, `release(sandbox_id)`; non-abstract `acquire_async()`, `reset()`. **Base KHÔNG có warm-pool/idle-timeout/exec** — provider-specific.
- AIO Sandbox: provider mẫu `deerflow.community.aio_sandbox:AioSandboxProvider` (thư mục `community/`); mode Local/Docker/Kubernetes (qua `provisioner_url`).
- **Điểm chèn SoloCEO**: viết `SoloAioSandboxProvider(SandboxProvider)`, trỏ `sandbox.use`. Dùng `thread_id`/`user_id` trong `acquire()` gắn `org_id→sandbox` (warm pool + idle reap tự quản trong class). `middleware.py` gắn vòng đời sandbox vào turn agent. **[CẦN KIỂM CHỨNG]** chữ ký constructor (warm_pool_size, idle_timeout).

## 3. Sub-agents

- Thư mục `subagents/`: `registry.py`, `executor.py`, `middleware.py`, `builtins/`.
- Khai báo: built-in `BUILTIN_SUBAGENTS` (`general-purpose`, `bash`); custom qua `config.yaml` mục `custom_agents`. Schema `SubagentConfig`: `name`, `description`, `system_prompt`, `tools`, `disallowed_tools`, `skills`, `model`, `max_turns`, `timeout_seconds`.
- **Giới hạn song song**: `executor.py` có `MAX_CONCURRENT_SUBAGENTS = 3` (đúng spec ≤3) + `_scheduler_pool = ThreadPoolExecutor(max_workers=3)`. **[CẦN KIỂM CHỨNG]** semaphore vs pool.
- Cơ chế: lead_agent fan-out → sub-agents (context/tool/termination riêng), chạy song song → fan-in kết quả có cấu trúc.

## 4. Skills

- Code: `skills/` (`catalog.py`, `installer.py`, `parser.py`, `permissions.py`, `security_scanner.py`, `slash.py`, `tool_policy.py`, `types.py`, `validation.py`, `skillscan/`, `storage/`).
- Layout đĩa: `/mnt/skills/public/<name>/SKILL.md` và `/mnt/skills/custom/<name>/SKILL.md`.
- Format: `SKILL.md` (Markdown + YAML frontmatter; `validation.py` có `ALLOWED_FRONTMATTER_PROPERTIES`). Kích hoạt slash `/skill-name`. Cài `.skill` có security scan.
- **[CẦN KIỂM CHỨNG]** env/config chính xác thư mục skills + hằng `SKILL.md` (nằm trong `skills/storage/`).

## 5. Gateway API (thread / run SSE / upload / interrupt-resume)

Gateway FastAPI `backend/app/gateway/` (`app.py`, `routers/`). Mặc định `http://localhost:8001`, prefix `/api`. Routers: `threads.py`, `thread_runs.py`, `runs.py`, `uploads.py`, `channels.py`, `mcp.py`, `skills.py`, `agents.py`, `auth.py`...

- **Threads**: `POST /api/threads`, `GET/PATCH/DELETE /api/threads/{id}`, `POST /api/threads/search`, `GET/POST /api/threads/{id}/state` (**update state để HITL resume**), goal, compact, branches, history.
- **Runs** (prefix `/api/threads`): `POST /{id}/runs` (background), `POST /{id}/runs/stream` (**SSE**), `POST /{id}/runs/wait`, `GET /{id}/runs`, `GET /{id}/runs/{rid}`, `POST /{id}/runs/{rid}/cancel?action=interrupt|rollback`, `.../join`, `.../stream`, `.../events`, `.../messages`, `.../workspace-changes`, `/{id}/token-usage`.
- **Interrupt-resume (HITL)**: interrupt = cancel `action=interrupt` (giữ checkpoint) hoặc graph tự interrupt (LangGraph `interrupt_before/after`). Resume = `POST /api/threads/{id}/state` bơm giá trị người duyệt rồi tạo run mới; `RunCreateRequest` có `checkpoint_id`, `checkpoint`, `interrupt_before`, `interrupt_after`. **[CẦN KIỂM CHỨNG]** payload resume chuẩn (`Command(resume=)` vs state merge).
- **Upload**: router `uploads.py` (dự đoán `POST /api/uploads`, **[CẦN KIỂM CHỨNG]**).
- Multi-worker: `GATEWAY_WORKERS` (default 1; scale cần Redis stream bridge). CORS: `GATEWAY_CORS_ORIGINS`.

## 6. Điểm chèn "arishem gate" ⭐

- **Điểm chèn chuẩn**: `backend/packages/harness/deerflow/guardrails/` (`provider.py`, `builtin.py`, `middleware.py`).
- Interface (`provider.py`): `evaluate(request: GuardrailRequest) -> GuardrailDecision` + `aevaluate(...)`.
  - `GuardrailRequest`: `tool_name`, `tool_input: dict`, `agent_id`, `thread_id`, metadata (identity/OAuth/context).
  - `GuardrailDecision`: `allow: bool`, `reasons` (code+message), `policy_id`. `allow=False` → chặn tool trước execute.
- `middleware.py` chặn MỌI tool-call trước thực thi → lắp `ArishemGuardrailProvider(evaluate/aevaluate)`, đọc `org_id` từ metadata, trả `allow=False` cho hành động rủi ro → kết hợp interrupt để yêu cầu phê duyệt (HITL) thay vì chỉ deny. **[CẦN KIỂM CHỨNG]** config key đăng ký provider + cách nối deny→interrupt.

## 7. Channel adapter (Telegram → mẫu Zalo)

- Thư mục `backend/app/channels/` + routers `channels.py`, `channel_connections.py`. Config `channels.*`.
- Adapter sẵn: Telegram (`TELEGRAM_BOT_TOKEN`, long-polling), Slack (Socket Mode), Feishu/Lark (WebSocket), WeChat, WeCom, DingTalk.
- Thêm Zalo: viết adapter trong `app/channels/` theo khuôn Telegram (webhook Zalo OA → thread + run gateway → stream ngược). Env `DEER_FLOW_CHANNELS_LANGGRAPH_URL` trỏ gateway nội bộ. Zalo OA dùng webhook HTTP → giống Feishu. **[CẦN KIỂM CHỨNG]** base class channel adapter.

## 8. Hot-reload

- `reflection/resolvers.py`: `resolve_variable`/`resolve_class` (load-động theo string path cho model/sandbox/guardrail/agent từ config).
- Reflection ≠ hot-reload tự động; mỗi lần là fresh lookup.
- Biên "đổi không restart" rõ nhất: **Skills** (cài/gỡ `.skill`, `SKILL.md` đọc từ đĩa `/mnt/skills` mount ngoài). Prompt/agent qua config có thể reload nhưng **[CẦN KIỂM CHỨNG]** có watcher config nóng hay cần restart process (nhiều khả năng model/agent/guardrail cần reload process).

## 9. License + version pin

- **License: MIT** (README). **[CẦN KIỂM CHỨNG]** đọc `LICENSE` chốt không ngoại lệ component community.
- Version: DeerFlow **2.0** (viết lại hoàn toàn, ~28/02/2026); v1.x ở branch `1.x`.
- Pin theo **git tag/commit SHA** thay vì `main`. **[CẦN KIỂM CHỨNG]** số tag/SHA hiện tại (`git ls-remote --tags`).

## 10. Backend baked vào image + prompt lead_agent

- Package `deerflow.*` tại `backend/packages/harness/deerflow/`; gateway `app.*` tại `backend/app/`. Có `backend/Dockerfile`, `pyproject.toml`, `langgraph.json`, `Makefile`. Backend build vào image; skills mount ngoài (`/mnt/skills`); config `config.yaml`/`.env`.
- Identity/prompt lead_agent: **`backend/packages/harness/deerflow/agents/lead_agent/prompt.py`** (kèm `__init__.py`, `agent.py`). `agent.py` = factory; `prompt.py` = system prompt/identity. Middleware `agents/middlewares/`, `agents/memory/`, `agents/thread_state.py`. Persistence `persistence/`; runtime `runtime/` (RunManager, StreamBridge).

---

## GIẢ ĐỊNH & CẦN KIỂM CHỨNG

1. Fallback đặt ở LiteLLM (factory không có failover). 2. AIO provider path/constructor từ README chưa đọc source. 3. Sub-agent enforce song song (const + pool max=3, cơ chế chưa rõ). 4. Skills discovery on-disk env/hằng trong `storage/`. 5. Interrupt-resume payload chuẩn. 6. Upload endpoint method/path. 7. Guardrail config key + nối deny→interrupt. 8. Channel base class. 9. Hot-reload config có watcher? 10. LICENSE chi tiết + tag SHA pin. 11. Nội dung prompt lead_agent.

### File load-bearing (repo bytedance/deer-flow, branch main)
- `backend/packages/harness/deerflow/models/factory.py`
- `.../sandbox/sandbox_provider.py`, `.../sandbox/middleware.py`
- `.../subagents/executor.py` (`MAX_CONCURRENT_SUBAGENTS = 3`), `.../subagents/registry.py`
- `.../guardrails/provider.py`, `.../guardrails/middleware.py` ⭐ (điểm chèn arishem)
- `.../skills/` + `storage/`; layout `/mnt/skills/{public,custom}/<name>/SKILL.md`
- `.../reflection/resolvers.py`
- `.../agents/lead_agent/prompt.py`, `.../agent.py`
- `backend/app/gateway/routers/threads.py`, `thread_runs.py`, `uploads.py`
- `backend/app/channels/` (+ `channels.py`, `channel_connections.py`)
- `config.yaml` (`models:`, `sandbox.use`, `custom_agents`, `channels.*`), `.env`, `backend/Dockerfile`, `langgraph.json`
