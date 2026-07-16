/**
 * CoolifyClient — REST client cho Coolify v4 API (CLAUDE.md Phần 7).
 *
 * COOLIFY_FAKE=1: chế độ giả lập cho dev local / demo — mô phỏng đủ vòng đời
 * deploy (delay + trạng thái) mà không cần VPS. Interface giữ nguyên nên khi
 * có Coolify thật chỉ cần tắt cờ.
 */

export interface CoolifyProject {
  uuid: string;
  name: string;
}

export interface CoolifyApp {
  uuid: string;
  status: string; // running | exited | starting | ...
  fqdn?: string;
}

export interface CreateComposeAppInput {
  projectUuid: string;
  serverUuid: string;
  name: string;
  dockerCompose: string; // nội dung docker-compose đã render env
  domain: string;
  envs: Record<string, string>;
}

// Deploy từ image dựng sẵn (registry) + domain — cách đáng tin cậy nhất (ADR-005)
export interface CreateDockerImageInput {
  projectUuid: string;
  serverUuid: string;
  name: string;
  image: string; // vd localhost:5000/soloceo/claw3d
  tag: string; // vd patched
  port: string; // cổng expose trong container
  domain: string;
  envs: Record<string, string>;
}

export interface ICoolifyClient {
  createProject(name: string): Promise<CoolifyProject>;
  /** Tái dùng project theo tên nếu đã có, tránh tạo trùng mỗi lần launch */
  findOrCreateProject(name: string): Promise<CoolifyProject>;
  createComposeApp(input: CreateComposeAppInput): Promise<CoolifyApp>;
  createDockerImageApp(input: CreateDockerImageInput): Promise<CoolifyApp>;
  deploy(appUuid: string): Promise<void>;
  getStatus(appUuid: string): Promise<string>;
  /** Trạng thái của application (dockerimage) — khác service */
  getAppStatus(appUuid: string): Promise<string>;
  getLogs(appUuid: string): Promise<string>;
  delete(appUuid: string): Promise<void>;
  deleteProject(projectUuid: string): Promise<void>;
  /** Chọn server ít tải nhất (RAM <70%) — Phần 7 */
  pickServerUuid(): Promise<string>;
}

export class CoolifyClient implements ICoolifyClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Coolify ${method} ${path} → ${res.status}: ${text}`);
    }
    return (await res.json().catch(() => ({}))) as T;
  }

  async createProject(name: string): Promise<CoolifyProject> {
    const r = await this.request<{ uuid: string }>("POST", "/projects", {
      name,
    });
    return { uuid: r.uuid, name };
  }

  async findOrCreateProject(name: string): Promise<CoolifyProject> {
    const projects = await this.request<Array<{ uuid: string; name: string }>>(
      "GET",
      "/projects",
    );
    const existing = projects.find((p) => p.name === name);
    if (existing) return { uuid: existing.uuid, name };
    return this.createProject(name);
  }

  async createDockerImageApp(
    input: CreateDockerImageInput,
  ): Promise<CoolifyApp> {
    const r = await this.request<{ uuid: string }>(
      "POST",
      "/applications/dockerimage",
      {
        project_uuid: input.projectUuid,
        server_uuid: input.serverUuid,
        environment_name: "production",
        name: input.name,
        docker_registry_image_name: input.image,
        docker_registry_image_tag: input.tag,
        ports_exposes: input.port,
        // Coolify yêu cầu URL đầy đủ có scheme
        domains: input.domain.startsWith("http")
          ? input.domain
          : `https://${input.domain}`,
        instant_deploy: false,
      },
    );
    for (const [key, value] of Object.entries(input.envs)) {
      await this.request("POST", `/applications/${r.uuid}/envs`, {
        key,
        value,
        is_preview: false,
      });
    }
    return { uuid: r.uuid, status: "created", fqdn: input.domain };
  }

  async getAppStatus(appUuid: string): Promise<string> {
    const r = await this.request<{ status?: string }>(
      "GET",
      `/applications/${appUuid}`,
    );
    return r.status ?? "unknown";
  }

  async createComposeApp(input: CreateComposeAppInput): Promise<CoolifyApp> {
    const r = await this.request<{ uuid: string }>("POST", "/services", {
      project_uuid: input.projectUuid,
      server_uuid: input.serverUuid,
      // Coolify v4 bắt buộc environment_name/uuid (như createDockerImageApp) —
      // thiếu → 422. Mọi app compose (erpnext/odoo/vn-platform) đi qua đây.
      environment_name: "production",
      name: input.name,
      docker_compose_raw: Buffer.from(input.dockerCompose).toString("base64"),
    });
    // gán env + domain
    for (const [key, value] of Object.entries(input.envs)) {
      await this.request("POST", `/services/${r.uuid}/envs`, {
        key,
        value,
        is_preview: false,
      });
    }
    return { uuid: r.uuid, status: "created", fqdn: input.domain };
  }

  async deploy(appUuid: string): Promise<void> {
    await this.request("POST", `/deploy?uuid=${appUuid}`);
  }

  async getStatus(appUuid: string): Promise<string> {
    const r = await this.request<{ status?: string }>(
      "GET",
      `/services/${appUuid}`,
    );
    return r.status ?? "unknown";
  }

  async getLogs(appUuid: string): Promise<string> {
    const r = await this.request<{ logs?: string }>(
      "GET",
      `/services/${appUuid}/logs`,
    );
    return r.logs ?? "";
  }

  async delete(appUuid: string): Promise<void> {
    await this.request("DELETE", `/services/${appUuid}?delete_volumes=true`);
  }

  async deleteProject(projectUuid: string): Promise<void> {
    await this.request("DELETE", `/projects/${projectUuid}`);
  }

  async pickServerUuid(): Promise<string> {
    const servers = await this.request<
      Array<{ uuid: string; name?: string; high_disk_usage?: boolean }>
    >("GET", "/servers");
    if (!servers.length) {
      throw new Error("Không có server Coolify nào — thêm VPS-TENANT trước");
    }
    // GHIM server tenant theo env (mặc định tenant-01): wildcard *.app.soloceo.vn
    // chỉ trỏ 1 IP → mọi tenant phải nằm cùng node đó, nếu không subdomain không
    // phân giải. Khi có DNS/LB đa node mới bỏ ghim.
    const pinned = process.env.SOLOCEO_TENANT_SERVER_UUID;
    if (pinned) {
      const s = servers.find((x) => x.uuid === pinned);
      if (s) return s.uuid;
    }
    const pinnedName = process.env.SOLOCEO_TENANT_SERVER_NAME ?? "tenant-01";
    const byName = servers.find((s) => s.name === pinnedName);
    if (byName) return byName.uuid;
    // Fallback: server đầu chưa cảnh báo tài nguyên (bỏ qua localhost nếu có)
    const ok =
      servers.find(
        (s) => !s.high_disk_usage && s.name !== "localhost",
      ) ??
      servers.find((s) => s.name !== "localhost") ??
      servers[0]!;
    return ok.uuid;
  }
}

/** Giả lập Coolify cho dev/demo local — độ trễ thật, trạng thái chuyển dần */
export class FakeCoolifyClient implements ICoolifyClient {
  private apps = new Map<string, { status: string; deployedAt?: number }>();
  private counter = 0;

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async createProject(name: string): Promise<CoolifyProject> {
    await this.sleep(300);
    return { uuid: `fake-prj-${name}-${++this.counter}`, name };
  }

  async findOrCreateProject(name: string): Promise<CoolifyProject> {
    return this.createProject(name);
  }

  async createDockerImageApp(
    input: CreateDockerImageInput,
  ): Promise<CoolifyApp> {
    await this.sleep(300);
    const uuid = `fake-app-${input.name}-${++this.counter}`;
    this.apps.set(uuid, { status: "created" });
    return { uuid, status: "created", fqdn: input.domain };
  }

  async getAppStatus(appUuid: string): Promise<string> {
    return this.getStatus(appUuid);
  }

  async createComposeApp(input: CreateComposeAppInput): Promise<CoolifyApp> {
    await this.sleep(300);
    const uuid = `fake-app-${input.name}-${++this.counter}`;
    this.apps.set(uuid, { status: "created" });
    return { uuid, status: "created", fqdn: input.domain };
  }

  async deploy(appUuid: string): Promise<void> {
    await this.sleep(200);
    this.apps.set(appUuid, { status: "starting", deployedAt: Date.now() });
  }

  async getStatus(appUuid: string): Promise<string> {
    const app = this.apps.get(appUuid);
    if (!app) return "unknown";
    // "build" giả lập 3 giây rồi running
    if (app.status === "starting" && Date.now() - (app.deployedAt ?? 0) > 3000) {
      app.status = "running";
    }
    return app.status;
  }

  async getLogs(appUuid: string): Promise<string> {
    return [
      `[fake-coolify] pulling image for ${appUuid}...`,
      "[fake-coolify] creating containers...",
      "[fake-coolify] waiting for healthcheck...",
      `[fake-coolify] ${await this.getStatus(appUuid)}`,
    ].join("\n");
  }

  async delete(appUuid: string): Promise<void> {
    await this.sleep(200);
    this.apps.delete(appUuid);
  }

  async deleteProject(): Promise<void> {
    await this.sleep(100);
  }

  async pickServerUuid(): Promise<string> {
    return "fake-server-tenant-01";
  }
}

export function createCoolifyClient(): ICoolifyClient {
  if (process.env.COOLIFY_FAKE === "1") {
    return new FakeCoolifyClient();
  }
  const baseUrl = process.env.COOLIFY_BASE_URL;
  const token = process.env.COOLIFY_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "Thiếu COOLIFY_BASE_URL/COOLIFY_API_TOKEN (hoặc đặt COOLIFY_FAKE=1 cho dev)",
    );
  }
  return new CoolifyClient(baseUrl, token);
}
