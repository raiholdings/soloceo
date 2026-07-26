/**
 * AdminEcosystemService — control-plane cho Admin Console native.
 * Gom các thao tác quản trị TOÀN hệ sinh thái ngoài phần lõi Prisma:
 *  - Sức khoẻ nền tảng (HTTP probe các subdomain)
 *  - Hạ tầng & Coolify (proxy REST: servers + resources)
 *  - Chi phí & ngân sách AI (AiUsage + hạn mức theo gói)
 *  - Người dùng & gói cước (Org + Subscription)
 *  - Tin tức (News CRUD)
 *  - Trợ lý AI (proxy DeerFlow gateway)
 */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { PLATFORM_CATALOG, type PlatformCatalogEntry } from "./platform-catalog.data";

export interface PlatformProbe {
  key: string;
  name: string;
  url: string;
  group: "cong-dong" | "loi" | "ha-tang" | "du-lieu";
  up: boolean;
  httpStatus: number | null;
  ms: number | null;
  error?: string;
}

// Ngân sách AI kèm gói (USD/tháng) — CLAUDE.md Phần 5
const BUDGET_USD_BY_PLAN: Record<string, number> = {
  STARTER: 2,
  GROWTH: 20,
  SCALE: 80,
};

// Giá gói (VND/tháng) để tính biên lãi
const PLAN_PRICE_VND: Record<string, number> = {
  STARTER: 299_000,
  GROWTH: 990_000,
  SCALE: 2_900_000,
};

const USD_TO_VND = 26_000;

export interface TaiNguyenMay {
  ten: string;
  ip: string;
  ket_noi: boolean;
  muc?: "ok" | "canh-bao" | "nguy-cap";
  ram_dung_mb?: number;
  ram_tong_mb?: number;
  ram_phan_tram?: number;
  dia_dung_gb?: number;
  dia_tong_gb?: number;
  dia_phan_tram?: number;
  cpu_loi?: number;
  tai_1phut?: number;
  container_chay?: number;
  container_tong?: number;
}

@Injectable()
export class AdminEcosystemService {
  private readonly log = new Logger(AdminEcosystemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── 1. Sức khoẻ nền tảng ────────────────────────────────────────────────
  private platforms(): Omit<PlatformProbe, "up" | "httpStatus" | "ms" | "error">[] {
    return [
      { key: "community", name: "Cộng đồng & Kết nối", url: "https://my.soloceo.vn", group: "cong-dong" },
      { key: "crm", name: "Quản lý khách hàng", url: "https://crm.soloceo.vn", group: "cong-dong" },
      { key: "edu", name: "Đào tạo trực tuyến", url: "https://edu.soloceo.vn", group: "cong-dong" },
      { key: "chat", name: "Chăm sóc khách hàng", url: "https://chat.soloceo.vn", group: "cong-dong" },
      { key: "meeting", name: "Họp & Hội thảo video", url: "https://meeting.soloceo.vn", group: "cong-dong" },
      { key: "platform", name: "Dịch vụ số & Tên miền", url: "https://platform.soloceo.vn", group: "cong-dong" },
      { key: "video", name: "Nền tảng Video", url: "https://video.soloceo.vn", group: "cong-dong" },
      { key: "news", name: "Tin tức lan toả (Flame)", url: "https://news.soloceo.vn", group: "cong-dong" },
      { key: "hub", name: "Hub AI (tạo ảnh/video/nội dung)", url: "https://hub.soloceo.vn", group: "cong-dong" },
      { key: "aff", name: "Tiếp thị liên kết", url: "https://aff.soloceo.vn", group: "cong-dong" },
      // ── Lõi hệ điều hành: 8 nền tảng n0 (N0–N7) ──
      { key: "deerflow", name: "DeerFlow — lõi điều phối", url: "https://soloceo.vn", group: "loi" },
      { key: "sandbox", name: "AIO Sandbox — thực thi an toàn", url: "https://soloceo.vn", group: "loi" },
      { key: "flowgram", name: "FlowGram — quy trình", url: "https://soloceo.vn", group: "loi" },
      { key: "midscene", name: "Midscene — điều khiển trình duyệt", url: "https://soloceo.vn", group: "loi" },
      { key: "subagents", name: "Sub-agents & Skills — quản trị agent", url: "http://svc-rules-engine:8080", group: "loi" },
      { key: "godlp", name: "godlp — chống rò rỉ dữ liệu", url: "http://svc-dlp:8080", group: "loi" },
      { key: "dolphin", name: "Dolphin — đọc giấy tờ", url: "http://dolphin-docs:8080", group: "loi" },
      { key: "g3proxy", name: "g3proxy — kiểm soát egress", url: "https://soloceo.vn", group: "loi" },
      // ── Hạ tầng ──
      { key: "web", name: "Trang chủ SoloCEO", url: "https://soloceo.vn", group: "ha-tang" },
      { key: "api", name: "API lõi", url: "https://api.soloceo.vn/v1/health", group: "ha-tang" },
      { key: "llm", name: "LLM Gateway (LiteLLM)", url: "https://llm.soloceo.vn/health/liveliness", group: "ha-tang" },
      // ── Lớp dữ liệu (data layer riêng của OS) ──
      { key: "supabase", name: "Supabase — nền tảng dữ liệu", url: "https://supabase.soloceo.vn", group: "du-lieu" },
      { key: "netdata", name: "Netdata — giám sát hạ tầng", url: "https://netdata.soloceo.vn", group: "du-lieu" },
      { key: "jitsu", name: "Jitsu — thu thập sự kiện/CDP", url: "https://jitsu.soloceo.vn", group: "du-lieu" },
      { key: "openmetadata", name: "OpenMetadata — quản trị/catalog dữ liệu", url: "https://openmetadata.soloceo.vn", group: "du-lieu" },
      { key: "bigdata", name: "BigData — bộ não thứ 2 (dataset + startup)", url: "https://bigdata.soloceo.vn", group: "du-lieu" },
    ];
  }

  async health(): Promise<PlatformProbe[]> {
    const list = this.platforms();
    return Promise.all(
      list.map(async (p) => {
        const started = Date.now();
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 8000);
          const res = await fetch(p.url, {
            method: "GET",
            redirect: "manual",
            signal: ctrl.signal,
            headers: { "user-agent": "SoloCEO-Admin-HealthCheck" },
          });
          clearTimeout(t);
          const ms = Date.now() - started;
          const up = res.status > 0 && res.status < 500;
          return { ...p, up, httpStatus: res.status, ms };
        } catch (e) {
          return {
            ...p,
            up: false,
            httpStatus: null,
            ms: Date.now() - started,
            error: (e as Error).message,
          };
        }
      }),
    );
  }

  /**
   * Danh mục nền tảng — ĐỒNG BỘ LIVE từ WHMCS (platform.soloceo.vn/paas-catalog.php,
   * cùng nguồn với workspace /nen-tang) làm dữ liệu chuẩn: tên, giới thiệu, danh mục,
   * demoUrl, số tài khoản CEO đang dùng (accounts). Overlay thêm từ dữ liệu tĩnh:
   * có dùng AI (OmniRoute) không + tài khoản/mật khẩu demo. Mật khẩu CHỈ trả ở đây
   * (endpoint admin X-Admin-Token), KHÔNG có trong paas-catalog.php public.
   * Nếu không lấy được WHMCS → fallback dữ liệu tĩnh.
   */
  async catalog(): Promise<{
    total: number;
    installed: number;
    withAI: number;
    totalAccounts: number;
    categories: string[];
    account: string;
    password: string;
    source: "whmcs" | "static";
    items: (PlatformCatalogEntry & { accounts: number })[];
  }> {
    const DEFAULT_ACCOUNT = "soloceo.vn@gmail.com";
    const DEFAULT_PASSWORD = "Soloceo@123";
    const overlay = new Map(PLATFORM_CATALOG.map((p) => [p.name.toLowerCase(), p]));
    let items: (PlatformCatalogEntry & { accounts: number })[] = [];
    let source: "whmcs" | "static" = "whmcs";
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("https://platform.soloceo.vn/paas-catalog.php", {
        signal: ctrl.signal,
        headers: { "user-agent": "SoloCEO-Admin-Catalog" },
      });
      clearTimeout(t);
      const data = (await res.json()) as {
        platforms?: Array<{
          name: string;
          category?: string;
          description?: string;
          demoUrl?: string | null;
          accounts?: number;
        }>;
      };
      const list = data.platforms ?? [];
      if (!list.length) throw new Error("catalog rỗng");
      items = list.map((p) => {
        const o = overlay.get(String(p.name || "").toLowerCase());
        const installed = !!p.demoUrl;
        return {
          name: p.name,
          category: p.category ?? o?.category ?? "",
          description: p.description ?? o?.description ?? "",
          demoUrl: p.demoUrl ?? "",
          usesAI: o?.usesAI ?? false,
          account: installed ? o?.account || DEFAULT_ACCOUNT : "",
          password: installed ? o?.password || DEFAULT_PASSWORD : "",
          installed,
          reason: o?.reason ?? "",
          accounts: Number(p.accounts ?? 0),
        };
      });
    } catch {
      source = "static";
      items = PLATFORM_CATALOG.map((p) => ({ ...p, accounts: 0 }));
    }
    const categories = [...new Set(items.map((p) => p.category))].sort((a, b) =>
      a.localeCompare(b, "vi"),
    );
    return {
      total: items.length,
      installed: items.filter((p) => p.installed).length,
      withAI: items.filter((p) => p.usesAI).length,
      totalAccounts: items.reduce((a, p) => a + p.accounts, 0),
      categories,
      account: DEFAULT_ACCOUNT,
      password: DEFAULT_PASSWORD,
      source,
      items,
    };
  }

  // ── 2. Hạ tầng & Coolify ────────────────────────────────────────────────
  private async coolify<T>(path: string): Promise<T> {
    const base = this.config.get<string>("COOLIFY_BASE_URL");
    const token = this.config.get<string>("COOLIFY_API_TOKEN");
    if (!base || !token) throw new Error("COOLIFY_BASE_URL/COOLIFY_API_TOKEN chưa cấu hình");
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Coolify ${path} → ${res.status}`);
    return (await res.json()) as T;
  }

  /**
   * Số liệu tài nguyên từng máy chủ (RAM · ổ đĩa · CPU · tải · container).
   *
   * Coolify API KHÔNG trả các chỉ số này, nên script `infra/monitor/thu-thap-tai-nguyen.sh`
   * chạy trên core-01 (nơi giữ khoá SSH của Coolify) hỏi từng node mỗi 5 phút rồi ghi ra
   * JSON công khai. Ở đây chỉ đọc lại và ghép vào danh sách máy chủ.
   */
  private async taiNguyen(): Promise<Record<string, TaiNguyenMay>> {
    const url =
      this.config.get<string>("MONITOR_METRICS_URL") ||
      "https://status.app.soloceo.vn/tai-nguyen.json";
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return {};
      const d = (await res.json()) as { may_chu?: TaiNguyenMay[] };
      const map: Record<string, TaiNguyenMay> = {};
      for (const m of d.may_chu || []) {
        if (m.ten) map[m.ten] = m;
        if (m.ip && m.ip !== "local") map[m.ip] = m;
        // Coolify gọi máy chủ lõi là "localhost" (ip host.docker.internal),
        // còn bộ đo gọi là "core-01" — không bắc cầu thì thẻ này luôn trống.
        if (m.ten === "core-01") {
          map["localhost"] = m;
          map["host.docker.internal"] = m;
        }
      }
      return map;
    } catch {
      return {}; // thiếu số liệu thì trang vẫn hiện, chỉ không có phần tài nguyên
    }
  }

  async infra(): Promise<{
    servers: Array<{
      uuid?: string;
      name?: string;
      ip?: string;
      reachable?: boolean;
      settings?: unknown;
      tai_nguyen?: TaiNguyenMay;
    }>;
    resources: unknown[];
    canh_bao: string[];
    note?: string;
  }> {
    const [tn] = await Promise.all([this.taiNguyen()]);
    const canh_bao: string[] = [];
    for (const m of Object.values(tn)) {
      if (m.ip === "local") continue; // tránh đếm trùng (mỗi máy có 2 khoá: tên và IP)
      if (m.ket_noi === false) canh_bao.push(`${m.ten}: không kết nối được`);
      else if (m.muc && m.muc !== "ok")
        canh_bao.push(
          `${m.ten}: RAM ${m.ram_phan_tram}% · ổ đĩa ${m.dia_phan_tram}% (${m.dia_dung_gb}/${m.dia_tong_gb} GB)`,
        );
    }
    try {
      const servers = await this.coolify<
        Array<{ uuid?: string; name?: string; ip?: string; settings?: unknown }>
      >("/api/v1/servers");
      let resources: unknown[] = [];
      try {
        resources = await this.coolify<unknown[]>("/api/v1/resources");
      } catch {
        /* resources optional */
      }
      const kem = servers.map((s) => ({
        ...s,
        tai_nguyen: tn[s.name || ""] || tn[s.ip || ""] || undefined,
      }));
      return { servers: kem, resources, canh_bao };
    } catch (e) {
      return { servers: [], resources: [], canh_bao, note: (e as Error).message };
    }
  }

  // ── 3. Chi phí & ngân sách AI ───────────────────────────────────────────
  async aiBudget() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [orgs, usage] = await Promise.all([
      this.prisma.org.findMany({
        select: { id: true, name: true, plan: true, status: true },
      }),
      this.prisma.aiUsage.groupBy({
        by: ["orgId"],
        where: { day: { gte: monthStart } },
        _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      }),
    ]);
    const usageMap = new Map(usage.map((u) => [u.orgId, u]));

    const rows = orgs.map((o) => {
      const u = usageMap.get(o.id);
      const spentUsd = Number(u?._sum.costUsd ?? 0);
      const budgetUsd = BUDGET_USD_BY_PLAN[o.plan] ?? 2;
      const costVnd = Math.round(spentUsd * USD_TO_VND);
      const priceVnd = PLAN_PRICE_VND[o.plan] ?? 0;
      return {
        orgId: o.id,
        name: o.name,
        plan: o.plan,
        status: o.status,
        spentUsd,
        budgetUsd,
        budgetPct: budgetUsd > 0 ? Math.round((spentUsd / budgetUsd) * 100) : 0,
        tokens: (u?._sum.inputTokens ?? 0) + (u?._sum.outputTokens ?? 0),
        costVnd,
        priceVnd,
        marginVnd: priceVnd - costVnd,
        losing: priceVnd > 0 && priceVnd - costVnd < 0,
      };
    });
    rows.sort((a, b) => b.spentUsd - a.spentUsd);

    const totalSpentUsd = rows.reduce((s, r) => s + r.spentUsd, 0);
    return {
      month: monthStart.toISOString().slice(0, 7),
      usdToVnd: USD_TO_VND,
      totalSpentUsd,
      totalSpentVnd: Math.round(totalSpentUsd * USD_TO_VND),
      overBudget: rows.filter((r) => r.budgetPct >= 100).length,
      losingCount: rows.filter((r) => r.losing).length,
      rows,
    };
  }

  // ── 4. Người dùng & gói cước ────────────────────────────────────────────
  async users() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const orgs = await this.prisma.org.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { ventures: true } },
        subscriptions: {
          orderBy: { currentPeriodEnd: "desc" },
          take: 1,
        },
      },
    });
    // Doanh thu 30 ngày theo org (qua venture)
    const ventures = await this.prisma.venture.findMany({
      select: { id: true, orgId: true },
    });
    const ventureOrg = new Map(ventures.map((v) => [v.id, v.orgId]));
    const tx = await this.prisma.transaction.groupBy({
      by: ["ventureId"],
      where: { direction: "IN", verified: true, occurredAt: { gte: thirtyDaysAgo } },
      _sum: { grossAmount: true },
    });
    const revByOrg = new Map<string, number>();
    for (const t of tx) {
      const orgId = ventureOrg.get(t.ventureId);
      if (!orgId) continue;
      revByOrg.set(orgId, (revByOrg.get(orgId) ?? 0) + Number(t._sum.grossAmount ?? 0));
    }

    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      ownerUserId: o.ownerUserId,
      plan: o.plan,
      status: o.status,
      createdAt: o.createdAt,
      ventures: o._count.ventures,
      subscription: o.subscriptions[0]
        ? {
            plan: o.subscriptions[0].plan,
            provider: o.subscriptions[0].provider,
            status: o.subscriptions[0].status,
            currentPeriodEnd: o.subscriptions[0].currentPeriodEnd,
          }
        : null,
      revenue30dVnd: revByOrg.get(o.id) ?? 0,
    }));
  }

  async changePlan(orgId: string, plan: "STARTER" | "GROWTH" | "SCALE") {
    return this.prisma.org.update({ where: { id: orgId }, data: { plan } });
  }

  async extendSubscription(orgId: string, days: number) {
    const sub = await this.prisma.subscription.findFirst({
      where: { orgId },
      orderBy: { currentPeriodEnd: "desc" },
    });
    if (!sub) throw new Error("Org chưa có subscription để gia hạn");
    const base =
      sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
    const next = new Date(base.getTime() + days * 24 * 3600 * 1000);
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: next, status: "active" },
    });
  }

  // ── 5. Tin tức ──────────────────────────────────────────────────────────
  private slugify(s: string): string {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  newsList(status?: string) {
    return this.prisma.news.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async newsCreate(input: {
    title: string;
    body: string;
    excerpt?: string;
    coverUrl?: string;
    category?: string;
    authorName?: string;
  }) {
    let slug = this.slugify(input.title) || `tin-${Date.now()}`;
    const exists = await this.prisma.news.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;
    return this.prisma.news.create({
      data: {
        title: input.title,
        slug,
        body: input.body,
        excerpt: input.excerpt,
        coverUrl: input.coverUrl,
        category: input.category ?? "thong-bao",
        authorName: input.authorName ?? "SoloCEO",
        status: "DRAFT",
      },
    });
  }

  newsUpdate(
    id: string,
    input: Partial<{
      title: string;
      body: string;
      excerpt: string;
      coverUrl: string;
      category: string;
    }>,
  ) {
    return this.prisma.news.update({ where: { id }, data: input });
  }

  newsPublish(id: string, publish: boolean) {
    return this.prisma.news.update({
      where: { id },
      data: {
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  newsDelete(id: string) {
    return this.prisma.news.delete({ where: { id } });
  }

  // Public reads (cho website)
  newsPublicList(category?: string) {
    return this.prisma.news.findMany({
      where: { status: "PUBLISHED", ...(category ? { category } : {}) },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverUrl: true,
        category: true,
        authorName: true,
        publishedAt: true,
      },
    });
  }

  newsPublicOne(slug: string) {
    return this.prisma.news.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
  }

  // ── 5b. Cây viết AI — sinh bài SEO tự động ──────────────────────────────
  private async llm(
    messages: Array<{ role: string; content: string }>,
    model = "soloceo-smart",
    maxTokens = 2600,
  ): Promise<string> {
    const base = this.config.get<string>("LITELLM_BASE_URL") ?? "https://llm.soloceo.vn";
    const key = this.config.get<string>("LITELLM_MASTER_KEY");
    if (!key) throw new Error("LITELLM_MASTER_KEY chưa cấu hình");
    const url = base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.8 }),
    });
    if (!res.ok) throw new Error(`LiteLLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

  // Chủ đề SEO xoay vòng cho nền tảng SoloCEO (doanh nghiệp một người + AI)
  private readonly SEO_TOPICS = [
    "cách khởi nghiệp một người với sự hỗ trợ của AI",
    "tự động hoá bán hàng cho doanh nghiệp siêu nhỏ",
    "xây dựng thương hiệu cá nhân cho solo CEO",
    "dùng AI viết nội dung marketing tiết kiệm chi phí",
    "quản lý khách hàng (CRM) cho người kinh doanh một mình",
    "chatbot chăm sóc khách hàng 24/7 cho doanh nghiệp nhỏ",
    "bán khoá học online: kiếm tiền từ kiến thức",
    "mô hình kinh doanh một người có doanh thu thật",
    "SEO cơ bản cho website doanh nghiệp mới",
    "cách định giá và bán lại một doanh nghiệp số (M&A)",
    "phễu bán hàng tự động cho freelancer",
    "dùng trợ lý AI điều hành công việc hằng ngày",
    "livestream & video ngắn để bán hàng cho solo CEO",
    "tối ưu chi phí vận hành khi kinh doanh một mình",
    "xây cộng đồng khách hàng trung thành từ số 0",
  ];

  /** Sinh 1 bài viết SEO tiếng Việt và ĐĂNG ngay (dùng cho cron 1 bài/giờ). */
  async newsAiGenerate(opts?: { topic?: string; publish?: boolean }) {
    const topic =
      opts?.topic ??
      this.SEO_TOPICS[Math.floor(Math.random() * this.SEO_TOPICS.length)];
    const system =
      "Bạn là biên tập viên nội dung SEO tiếng Việt cho SoloCEO — hệ điều hành giúp mỗi người " +
      "xây một doanh nghiệp một người vận hành bằng AI. Viết chuẩn SEO, giọng chuyên nghiệp, " +
      "thực chiến, có ví dụ. TUYỆT ĐỐI trả về JSON hợp lệ, không kèm giải thích.";
    const user =
      `Viết một bài blog SEO tiếng Việt về chủ đề: "${topic}".\n` +
      `Yêu cầu JSON đúng khoá:\n` +
      `{\n` +
      `  "title": "tiêu đề hấp dẫn <=65 ký tự, có từ khoá",\n` +
      `  "excerpt": "mô tả meta 140-160 ký tự",\n` +
      `  "keywords": ["3-6 từ khoá"],\n` +
      `  "category": "một trong: san-pham|cong-dong|doi-tac|thong-bao",\n` +
      `  "body": "nội dung Markdown 700-1100 từ: mở bài, 3-5 mục ## có ý nghĩa, bullet, kết bài + CTA nhẹ nhắc SoloCEO"\n` +
      `}`;
    // Dùng model nhanh (không reasoning) để bài ra trong ~15-20s, tránh timeout proxy.
    const raw = await this.llm(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      "soloceo-claude-fast",
      2600,
    );
    // Bóc JSON (mô hình đôi khi bọc ```json)
    const jsonStr = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
    let parsed: {
      title?: string;
      excerpt?: string;
      keywords?: string[];
      category?: string;
      body?: string;
    };
    try {
      const start = jsonStr.indexOf("{");
      const end = jsonStr.lastIndexOf("}");
      parsed = JSON.parse(jsonStr.slice(start, end + 1));
    } catch {
      throw new Error("AI trả về không phải JSON hợp lệ");
    }
    if (!parsed.title || !parsed.body) throw new Error("AI thiếu title/body");

    const kw = Array.isArray(parsed.keywords) ? parsed.keywords.join(", ") : "";
    const bodyWithKw = kw
      ? `${parsed.body}\n\n<!-- keywords: ${kw} -->`
      : parsed.body;

    const news = await this.newsCreate({
      title: parsed.title.slice(0, 200),
      excerpt: parsed.excerpt?.slice(0, 300),
      body: bodyWithKw,
      category: ["san-pham", "cong-dong", "doi-tac", "thong-bao"].includes(
        parsed.category ?? "",
      )
        ? parsed.category
        : "san-pham",
      authorName: "Biên tập AI SoloCEO",
    });
    if (opts?.publish !== false) {
      await this.newsPublish(news.id, true);
    }
    return { id: news.id, title: news.title, slug: news.slug, topic };
  }

  /** Thống kê cây viết AI cho admin. */
  async newsAiStats() {
    const [total, published, aiCount, latest] = await Promise.all([
      this.prisma.news.count(),
      this.prisma.news.count({ where: { status: "PUBLISHED" } }),
      this.prisma.news.count({ where: { authorName: "Biên tập AI SoloCEO" } }),
      this.prisma.news.findFirst({
        where: { authorName: "Biên tập AI SoloCEO" },
        orderBy: { createdAt: "desc" },
        select: { title: true, createdAt: true, slug: true },
      }),
    ]);
    return { total, published, aiCount, latest, cadence: "1 bài/giờ (cron)" };
  }

  // ── 5c. Render HTML công khai cho SEO (nginx proxy soloceo.vn/tin-tuc) ──
  private esc(s: string): string {
    return (s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
    );
  }

  /** Markdown → HTML tối giản (đủ cho SEO: heading, đậm, nghiêng, link, list). */
  private mdToHtml(md: string): string {
    const lines = md.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
    const out: string[] = [];
    let inList = false;
    const inline = (t: string) =>
      this.esc(t)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
    const closeList = () => {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    };
    for (const ln of lines) {
      const t = ln.trim();
      if (!t) {
        closeList();
        continue;
      }
      if (/^###\s+/.test(t)) {
        closeList();
        out.push(`<h3>${inline(t.replace(/^###\s+/, ""))}</h3>`);
      } else if (/^##\s+/.test(t)) {
        closeList();
        out.push(`<h2>${inline(t.replace(/^##\s+/, ""))}</h2>`);
      } else if (/^#\s+/.test(t)) {
        closeList();
        out.push(`<h2>${inline(t.replace(/^#\s+/, ""))}</h2>`);
      } else if (/^[-*]\s+/.test(t)) {
        if (!inList) {
          out.push("<ul>");
          inList = true;
        }
        out.push(`<li>${inline(t.replace(/^[-*]\s+/, ""))}</li>`);
      } else {
        closeList();
        out.push(`<p>${inline(t)}</p>`);
      }
    }
    closeList();
    return out.join("\n");
  }

  private pageShell(title: string, desc: string, slug: string | null, body: string): string {
    const canonical = slug
      ? `https://soloceo.vn/tin-tuc/${slug}`
      : "https://soloceo.vn/tin-tuc";
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${this.esc(title)}</title>
<meta name="description" content="${this.esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article"><meta property="og:title" content="${this.esc(title)}">
<meta property="og:description" content="${this.esc(desc)}"><meta property="og:url" content="${canonical}">
<meta name="robots" content="index,follow">
<style>
:root{color-scheme:light dark}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:760px;margin:0 auto;padding:32px 20px 80px;line-height:1.7;color:#1a1a1a;background:#fff}
@media(prefers-color-scheme:dark){body{background:#0b0b0c;color:#e8e8ea}a{color:#8ab4ff}}
a{color:#2b6cff;text-decoration:none}a:hover{text-decoration:underline}
h1{font-size:30px;line-height:1.25;margin:8px 0 6px}h2{font-size:21px;margin:28px 0 10px}h3{font-size:17px;margin:20px 0 8px}
.top{display:flex;align-items:center;gap:10px;margin-bottom:24px;font-size:14px}
.meta{color:#888;font-size:13px;margin-bottom:20px}
.card{display:block;border:1px solid #e5e5e8;border-radius:12px;padding:16px 18px;margin:12px 0;text-decoration:none;color:inherit}
@media(prefers-color-scheme:dark){.card{border-color:#26262a}}
.card h3{margin:0 0 4px}.card p{margin:0;color:#888;font-size:14px}
.cta{margin-top:40px;padding:18px;border-radius:12px;background:#f4f4f6;text-align:center}
@media(prefers-color-scheme:dark){.cta{background:#151517}}
footer{margin-top:48px;padding-top:20px;border-top:1px solid #eee;color:#999;font-size:13px}
@media(prefers-color-scheme:dark){footer{border-color:#26262a}}
</style></head><body>
<div class="top"><a href="https://soloceo.vn/">← SoloCEO</a> · <a href="https://soloceo.vn/tin-tuc">Tin tức</a></div>
${body}
<footer>© SoloCEO — Hệ điều hành cho doanh nghiệp một người. <a href="https://soloceo.vn/">soloceo.vn</a></footer>
</body></html>`;
  }

  async newsPageIndex(): Promise<string> {
    const posts = await this.newsPublicList();
    const cards = posts
      .map(
        (p) =>
          `<a class="card" href="/tin-tuc/${p.slug}"><h3>${this.esc(p.title)}</h3><p>${this.esc(
            p.excerpt ?? "",
          )}</p></a>`,
      )
      .join("\n");
    const body = `<h1>Tin tức SoloCEO</h1><p class="meta">Kiến thức khởi nghiệp một người &amp; AI — cập nhật liên tục.</p>${
      cards || "<p>Chưa có bài viết.</p>"
    }`;
    return this.pageShell(
      "Tin tức SoloCEO — Khởi nghiệp một người & AI",
      "Blog SoloCEO: kiến thức khởi nghiệp một người, tự động hoá bằng AI, marketing, bán hàng và vận hành cho solo CEO.",
      null,
      body,
    );
  }

  async newsPageDetail(slug: string): Promise<string | null> {
    const n = await this.newsPublicOne(slug);
    if (!n) return null;
    const date = n.publishedAt ? new Date(n.publishedAt).toLocaleDateString("vi-VN") : "";
    const ld = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: n.title,
      description: n.excerpt ?? "",
      datePublished: n.publishedAt?.toISOString?.() ?? undefined,
      author: { "@type": "Organization", name: n.authorName },
      publisher: { "@type": "Organization", name: "SoloCEO" },
      mainEntityOfPage: `https://soloceo.vn/tin-tuc/${n.slug}`,
    };
    const body =
      `<article><h1>${this.esc(n.title)}</h1>` +
      `<p class="meta">${this.esc(n.authorName)} · ${date}</p>` +
      this.mdToHtml(n.body) +
      `<div class="cta"><strong>Bắt đầu doanh nghiệp một người của bạn</strong><br>` +
      `Vào <a href="https://soloceo.vn/">soloceo.vn</a> để dựng doanh nghiệp vận hành bằng AI.</div></article>` +
      `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
    return this.pageShell(n.title, n.excerpt ?? n.title, n.slug, body);
  }

  // ── 5d. Đồng bộ tài liệu (/en/docs) ─────────────────────────────────────
  async docsIndex(): Promise<{
    base: string;
    items: Array<{ title: string; url: string }>;
    note?: string;
  }> {
    const base = "https://soloceo.vn/en/docs";
    try {
      const res = await fetch(base, { headers: { "user-agent": "SoloCEO-Admin" } });
      if (!res.ok) return { base, items: [], note: `Docs trả ${res.status}` };
      const html = await res.text();
      // Bóc các link nội bộ tới /docs hoặc /en/docs
      const seen = new Set<string>();
      const items: Array<{ title: string; url: string }> = [];
      const re = /<a[^>]+href="([^"]*\/(?:en\/)?docs[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        let href = m[1] ?? "";
        const text = (m[2] ?? "").replace(/<[^>]+>/g, "").trim();
        if (!href || !text || text.length > 80) continue;
        if (href.startsWith("/")) href = `https://soloceo.vn${href}`;
        if (seen.has(href)) continue;
        seen.add(href);
        items.push({ title: text, url: href });
      }
      return { base, items: items.slice(0, 100) };
    } catch (e) {
      return { base, items: [], note: (e as Error).message };
    }
  }

  // ── 5e. Project Builder — "tạo dự án từ ý tưởng" → marketplace/M&A ───────
  /** Catalog khối xây thật của SoloCEO để AI chọn (không bịa). */
  private readonly PROJECT_BLOCKS = {
    containers: [
      "ERPNext (ERP/kế toán/kho)", "QloApps (đặt phòng/tour du lịch)",
      "MagicAI hub (tạo ảnh/video/nội dung AI)", "Perfex CRM", "Academy LMS (khoá học)",
      "WoWonder (mạng cộng đồng)", "Support Board (chat CSKH)", "LiveSmart (họp video)",
      "PlayTube (video)", "WHMCS (bán PaaS/tên miền)", "Flame (media tin tức)",
      "AffiliatePRO (tiếp thị liên kết)", "Medusa (thương mại)", "Twenty (CRM gọn)",
      "Hermes Agent", "Claw3D (văn phòng 3D)", "OpenClaw (bảng điều khiển agent)",
    ],
    agents: [
      "Trợ lý Điều hành", "Trợ lý Kinh doanh", "Trợ lý Marketing", "Trợ lý Nội dung",
      "Trợ lý Vận hành", "Trợ lý Kế toán", "Trợ lý CSKH", "+ trợ lý chuyên ngành tuỳ dự án",
    ],
    communityPlatforms: [
      "my (cộng đồng)", "crm", "edu (đào tạo)", "chat (CSKH)", "meeting (họp video)",
      "platform (PaaS)", "video", "news (tin tức)", "hub (AI)", "aff (affiliate)",
    ],
    dataLayer: [
      "langconnect (RAG API)", "pgvector (vector)", "dlt (nạp dữ liệu)", "Cube (metrics)",
      "OpenTripMap/OSM (dữ liệu mở theo ngành)",
    ],
    integrations: ["PayOS (thanh toán VN)", "LiteLLM gateway", "MCP (crm/eco/marketplace)", "DeerFlow (agent điều phối)"],
  };

  async projectGenerate(idea: string, goal?: string) {
    const blocks = JSON.stringify(this.PROJECT_BLOCKS, null, 0);
    const system =
      "Bạn là kiến trúc sư giải pháp của SoloCEO — hệ điều hành giúp một người dựng doanh nghiệp vận hành bằng AI. " +
      "Từ Ý TƯỞNG của CEO, hãy TỔNG HỢP một 'mẫu dự án' bằng cách CHỌN các khối có sẵn trong CATALOG (không bịa khối ngoài catalog). " +
      "Dự án sẽ được đóng gói bán trên Sàn M&A. TRẢ VỀ JSON hợp lệ, không giải thích.\n\nCATALOG:\n" +
      blocks;
    const user =
      `Ý TƯỞNG: "${idea}"\n${goal ? `MỤC TIÊU: ${goal}\n` : ""}` +
      `Trả JSON đúng khoá:\n{\n` +
      `  "name": "tên dự án ngắn gọn, hấp dẫn",\n` +
      `  "industry": "slug ngành: du-lich|fnb|giao-duc|bat-dong-san|ban-le|dich-vu|khac",\n` +
      `  "summary": "2-3 câu mô tả dự án + giá trị cho khách cuối",\n` +
      `  "components": {\n` +
      `     "containers": ["chọn từ catalog.containers"],\n` +
      `     "agents": ["chọn từ catalog.agents, có thể thêm trợ lý chuyên ngành"],\n` +
      `     "communityPlatforms": ["chọn từ catalog.communityPlatforms"],\n` +
      `     "dataLayer": ["chọn từ catalog.dataLayer"],\n` +
      `     "integrations": ["chọn từ catalog.integrations"]\n` +
      `  },\n` +
      `  "valueProps": ["3-5 điểm vì sao dự án này đáng mua"],\n` +
      `  "buildSteps": ["4-7 bước dựng dự án từ các khối trên"],\n` +
      `  "priceVnd": số tiền bán gợi ý (VND, dự án turnkey thường 150-500 triệu),\n` +
      `  "monthlyFeeVnd": phí nền tảng định kỳ gợi ý (VND/tháng)\n}`;
    const raw = await this.llm(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      "soloceo-claude-fast",
      2600,
    );
    const jsonStr = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
    let p: {
      name?: string; industry?: string; summary?: string;
      components?: object; valueProps?: string[]; buildSteps?: string[];
      priceVnd?: number; monthlyFeeVnd?: number;
    };
    try {
      const s = jsonStr.indexOf("{");
      const e = jsonStr.lastIndexOf("}");
      p = JSON.parse(jsonStr.slice(s, e + 1));
    } catch {
      throw new Error("AI trả về không phải JSON hợp lệ");
    }
    if (!p.name || !p.components) throw new Error("AI thiếu name/components");
    let slug = this.slugify(p.name) || `du-an-${Date.now()}`;
    if (await this.prisma.projectTemplate.findUnique({ where: { slug } }))
      slug = `${slug}-${Date.now().toString(36)}`;
    return this.prisma.projectTemplate.create({
      data: {
        name: p.name.slice(0, 200),
        slug,
        idea: idea.slice(0, 2000),
        industry: p.industry,
        summary: p.summary ?? "",
        components: p.components as never,
        valueProps: (p.valueProps ?? []) as never,
        buildSteps: (p.buildSteps ?? []) as never,
        priceVnd: Number(p.priceVnd) || 0,
        monthlyFeeVnd: Number(p.monthlyFeeVnd) || 0,
        status: "DRAFT",
      },
    });
  }

  projectList(status?: string) {
    return this.prisma.projectTemplate.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  projectUpdate(
    id: string,
    input: Partial<{
      name: string; summary: string; industry: string; coverUrl: string;
      demoUrl: string; priceVnd: number; monthlyFeeVnd: number; components: object;
    }>,
  ) {
    const data: Record<string, unknown> = { ...input };
    if (input.priceVnd != null) data.priceVnd = Number(input.priceVnd);
    if (input.monthlyFeeVnd != null) data.monthlyFeeVnd = Number(input.monthlyFeeVnd);
    return this.prisma.projectTemplate.update({ where: { id }, data: data as never });
  }

  projectPublish(id: string, publish: boolean) {
    return this.prisma.projectTemplate.update({
      where: { id },
      data: { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null },
    });
  }

  projectDelete(id: string) {
    return this.prisma.projectTemplate.delete({ where: { id } });
  }

  // Public cho marketplace.soloceo.vn
  projectPublicList() {
    return this.prisma.projectTemplate.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 100,
      select: {
        id: true, name: true, slug: true, industry: true, summary: true,
        components: true, valueProps: true, priceVnd: true, monthlyFeeVnd: true,
        coverUrl: true, demoUrl: true, publishedAt: true,
      },
    });
  }

  projectPublicOne(slug: string) {
    return this.prisma.projectTemplate.findFirst({ where: { slug, status: "PUBLISHED" } });
  }

  // ── 6. Trợ lý AI (proxy DeerFlow gateway) ───────────────────────────────
  async agents() {
    const base = this.config.get<string>("DEERFLOW_PUBLIC_BASE") ?? "https://soloceo.vn";
    const token = this.config.get<string>("DEERFLOW_INTERNAL_TOKEN");
    if (!token) return { agents: [], note: "Chưa cấu hình DEERFLOW_INTERNAL_TOKEN" };
    try {
      const res = await fetch(`${base}/api/agents`, {
        headers: { "X-DeerFlow-Internal-Token": token },
      });
      if (!res.ok) return { agents: [], note: `Gateway trả ${res.status}` };
      const data = (await res.json()) as {
        agents?: { name: string; description?: string; enabled?: boolean; category?: string }[];
      };
      return {
        agents: (data.agents ?? []).map((a) => ({
          name: a.name,
          description: a.description ?? "",
          enabled: a.enabled ?? true,
          category: a.category ?? "",
        })),
      };
    } catch (e) {
      return { agents: [], note: (e as Error).message };
    }
  }

  async setAgentEnabled(name: string, enabled: boolean) {
    const base = this.config.get<string>("DEERFLOW_PUBLIC_BASE") ?? "https://soloceo.vn";
    const token = this.config.get<string>("DEERFLOW_INTERNAL_TOKEN");
    if (!token) return { ok: false, note: "Chưa cấu hình DEERFLOW_INTERNAL_TOKEN" };
    try {
      const res = await fetch(`${base}/api/agents/${encodeURIComponent(name)}/enabled`, {
        method: "POST",
        headers: {
          "X-DeerFlow-Internal-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });
      return { ok: res.ok, note: res.ok ? undefined : `Gateway trả ${res.status}` };
    } catch (e) {
      return { ok: false, note: (e as Error).message };
    }
  }
}
