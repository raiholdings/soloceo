# R2 — Nghiên cứu kỹ thuật AIO Sandbox (agent-infra/sandbox)

Nguồn: GitHub `agent-infra/sandbox`, docs `sandbox.agent-infra.com`. Bản ổn định tham chiếu: **1.11.0**.

## 1. Kiến trúc

AIO Sandbox = "all-in-one agent sandbox" đóng gói trong **1 container Docker duy nhất**, gồm:

- **Browser**: Chrome headless có **CDP (Chrome DevTools Protocol)** + **VNC** để xem/điều khiển trực quan.
- **Shell**: terminal qua WebSocket + REST exec.
- **File System**: đọc/ghi file, thống nhất (file browser tải về dùng được ngay ở Shell/File).
- **MCP servers nội tại**: pre-config sẵn **browser, file, shell/terminal, markitdown/markdown**, expose tại `/mcp` (MCP Hub).
- **Dev tools**: VSCode Server (`/code-server/`), Jupyter, port forwarding (`/proxy/{port}/`, `/absproxy/{port}/`).

**Cổng expose**: tất cả gom về **một cổng `8080`** (API, VNC, VSCode, Jupyter, MCP, CDP proxy). Không expose CDP `9222` trực tiếp — CDP được truy cập qua `8080` (xem mục 6). Kiến trúc "single port" này thuận lợi cho reverse proxy per-tenant.

## 2. Mô hình cấp phát

- Mô hình gốc là **1 container = 1 sandbox** (một môi trường độc lập). Không có "warm pool" dựng sẵn trong core OSS — **[CẦN KIỂM CHỨNG]** việc pool hóa phải tự xây ở tầng orchestrator.
- **Map tenant → sandbox**: khuyến nghị **1 container/org** (đúng nguyên tắc cô lập của SoloCEO). Định danh sandbox qua base_url/host riêng; SoloCEO map `org_id → {host}:8080`.
- **Idle timeout / lifecycle**: container chạy `--rm -it` trong ví dụ; vòng đời do orchestrator bên ngoài (Coolify/K8s) quản. Idle-timeout tự động không có trong core → cần cron/controller riêng để reap. **[CẦN KIỂM CHỨNG]**

## 3. Baseline tài nguyên

- Docs không công bố con số RAM/CPU tối thiểu chính thức. **[CẦN KIỂM CHỨNG]**
- Ước lượng thực dụng (có Chrome headless + Jupyter + VSCode trong 1 container): **~1–2 GB RAM idle, ~2–4 GB khi browser hoạt động; ~0.5–1 vCPU**. **[CẦN KIỂM CHỨNG]**
- Sức chứa trên **tenant-02 (18 vCPU / 94 GB)**:
  - Chặn theo RAM @2 GB/sandbox: ~**40–45** sandbox (chừa ~10% cho host).
  - Chặn theo RAM @3 GB/sandbox (browser nặng): ~**28–30**.
  - Chặn theo CPU @0.75 vCPU: ~**22–24** đồng thời hoạt động thật.
  - **Kết luận thận trọng: ~20–25 sandbox/org đồng thời "active", ~40 nếu phần lớn idle.** Cần đo thực tế bằng cgroup limits.

## 4. Skills API

- **Có** `/v1/skills/*`:
  - `POST /v1/skills/register` — đăng ký skill từ path có sẵn trong sandbox hoặc zip.
  - `GET /v1/skills/metadatas` — liệt kê skills.
  - `GET /v1/skills/{name}/content` — đọc nội dung skill.
  - `DELETE /v1/skills/{name}` — xóa skill.
- **Cấu trúc skill**: thư mục chứa `SKILL.md` (frontmatter + hướng dẫn, là entrypoint), `scripts/`, `templates/`, `requirements.txt`, `package.json`.
- **`AIO_SKILLS_PATH`**: biến này **được thêm để mount/đăng ký Skills lúc service khởi động** và parse lệnh cài dependency của skill. **[CẦN KIỂM CHỨNG]** cú pháp chính xác.
- **Cách mount skills**: bind-mount thư mục host vào container rồi trỏ `AIO_SKILLS_PATH`, ví dụ dự kiến:
  ```
  -v /host/skills:/skills -e AIO_SKILLS_PATH=/skills
  ```
  hoặc đăng ký runtime qua `POST /v1/skills/register`. **[CẦN KIỂM CHỨNG]** cú pháp `-v`/tên biến chính xác.

## 5. Hardening

- **`SANDBOX_API_KEY`**: đặt để bảo vệ toàn bộ services (API, JupyterLab, VNC). **Không đặt → mở, không auth** (backward compat) → **bắt buộc đặt** trong production.
- **3 cách truyền credential**: header `X-AIO-API-Key`, header `Authorization: Bearer <key>`, hoặc query `?api_key=`.
- **Bind chỉ localhost**: map `-p 127.0.0.1:8080:8080` (như ví dụ chính thức) để không lộ ra network ngoài; đặt reverse proxy TLS phía trước cho môi trường chia sẻ, hạn chế inbound theo IP/network.
- **Ép egress qua g3 proxy**:
  - Có biến **`PROXY_SERVER`** dùng cho cấu hình proxy mạng của sandbox (`${PROXY_SERVER:-}` trong compose). Đây là kênh khuyến dùng để trỏ egress về g3.
  - `HTTP_PROXY`/`HTTPS_PROXY` chuẩn **không được xác nhận** là honored bởi sandbox core → **[CẦN KIỂM CHỨNG]**; ưu tiên `PROXY_SERVER`.
  - Để **cưỡng bức** allowlist thật sự: kết hợp **network isolation ở tầng Docker/host** (container network không có default route ra internet, chỉ route được tới g3), không dựa hoàn toàn vào env — env proxy có thể bị process con bỏ qua.
- Ví dụ chạy an toàn:
  ```
  docker run --security-opt seccomp=unconfined --rm -it \
    -e SANDBOX_API_KEY=your-secret-key \
    -e PROXY_SERVER=http://g3-proxy:port \
    -p 127.0.0.1:8080:8080 ghcr.io/agent-infra/sandbox:1.11.0
  ```
  (Có tùy chọn auth nâng cao bằng JWT qua `JWT_PUBLIC_KEY` + `Authorization: Bearer`. **[CẦN KIỂM CHỨNG]** khi dùng cho SoloCEO.)

## 6. API điều khiển sandbox

Prefix `/v1` trên cổng `8080`:

- **Sandbox info**: `GET /v1/sandbox`.
- **Shell/exec**: `POST /v1/shell/exec` (REST), WebSocket terminal `/v1/shell/ws`; ngoài ra `/v1/bash/*`, code runtimes `/v1/code/*`, `/v1/nodejs/*`, `/v1/jupyter/*` (và `/v1/jupyter/execute`).
- **File**: `/v1/file/read`, `/v1/file/write`.
- **Browser (CDP)**:
  - `GET /v1/browser/info` → trả `cdp_url` (chứa `webSocketDebuggerUrl`).
  - `GET /cdp/json/version` → lấy version + `webSocketDebuggerUrl`.
  - `GET /v1/browser/screenshot`.
  - Kết nối automation: Playwright `p.chromium.connect_over_cdp(cdp_url)`; browser-use nhận thẳng `cdp_url`. **Không dùng cổng 9222 lộ thiên** — luôn qua `cdp_url` từ endpoint trên.
- **VNC**: `http://<host>:8080/vnc/index.html?autoconnect=true`.
- **MCP Hub**: `http://<host>:8080/mcp`.
- Tạo/hủy sandbox = **tạo/hủy container** ở tầng ngoài (Docker/Coolify/K8s); core không có endpoint self-provision container khác. **[CẦN KIỂM CHỨNG]**

## 7. Cách DeerFlow/client kết nối

- **SDK chính thức**:
  - Python: `pip install agent-sandbox` →
    ```python
    from agent_sandbox import Sandbox
    client = Sandbox(base_url="http://localhost:8080")
    client.shell.exec_command(command="ls -la")
    client.browser.get_info().data.cdp_url
    ```
  - TS/JS: `npm install @agent-infra/sandbox` →
    ```ts
    import { Sandbox } from '@agent-infra/sandbox';
    const sandbox = new Sandbox({ baseURL: 'http://localhost:8080' });
    await sandbox.shell.exec({ command: 'ls -la' });
    ```
  - Go: `go get github.com/agent-infra/sandbox-sdk-go`.
- **HTTP/REST** trực tiếp tới `/v1/*` (kèm header `X-AIO-API-Key`/`Bearer`).
- **MCP**: DeerFlow trỏ MCP client tới `/mcp` để dùng browser/file/shell/markitdown tools sẵn có (thay sandbox-local của DeerFlow).
- **CDP**: framework browser-use/Playwright nối qua `cdp_url`.

## 8. License, version, image

- **License**: **Apache License 2.0** (dùng lại/thương mại hóa OK — thoáng hơn nhiều so với ràng buộc Dify).
- **Version nên pin**: **`1.11.0`** — tránh `:latest` trong production.
- **Image chính thức**:
  - Global: **`ghcr.io/agent-infra/sandbox:1.11.0`** (hoặc `:latest`).
  - Mirror TQ: `enterprise-public-cn-beijing.cr.volces.com/vefaas-public/all-in-one-sandbox:1.11.0`.
- Cần cờ **`--security-opt seccomp=unconfined`** khi chạy (yêu cầu của Chrome headless trong container).

---

## GIẢ ĐỊNH & CẦN KIỂM CHỨNG

1. **Baseline RAM/CPU** không có số chính thức → ước lượng sức chứa tenant-02 (~20–40 sandbox) là suy diễn, **phải đo thực tế** bằng cgroup limits.
2. **Warm pool & idle-timeout**: không có trong core OSS; phải tự xây ở orchestrator.
3. **`AIO_SKILLS_PATH`**: xác nhận tồn tại nhưng cú pháp mount `-v` + tên biến chính xác chưa đối chiếu trực tiếp trên docs — cần xem code/compose thật.
4. **Egress qua g3**: `PROXY_SERVER` là kênh đúng, nhưng `HTTP_PROXY`/`HTTPS_PROXY` chưa xác nhận honored. **Bắt buộc network isolation tầng host/Docker** mới là hardening thật.
5. **Tạo/hủy sandbox động**: giả định làm ở tầng container-orchestration; chưa xác nhận API self-provision.
6. **CDP port 9222**: xác nhận không expose lộ thiên (qua `cdp_url`/`8080`).

Nguồn: github.com/agent-infra/sandbox (README, docs introduction/browser/skills/security/authentication).

> Ghi chú tổng hợp (SoloCEO): AIO Sandbox thay `sandbox-local` DeerFlow (R0 §C6). Provider `AioSandboxProvider` map `org_id→{host}:8080`, đặt `SANDBOX_API_KEY` + bind `127.0.0.1` + **network isolation chỉ tới g3** (R6/§7). SDK TS `@agent-infra/sandbox`. Pin `1.11.0`, Apache-2.0.
