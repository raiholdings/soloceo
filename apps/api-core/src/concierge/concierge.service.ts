import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser, SupabaseJwtPayload } from "../auth/auth.types";
import { VenturesService } from "../ventures/ventures.service";
import { StoreService } from "../store/store.service";
import { NhanHoaClient } from "../domains/nhanhoa.client";

/**
 * "Lễ tân AI" trang chủ (kiểu manus.im): khách chat để được tư vấn và KHỞI TẠO
 * doanh nghiệp thật trên platform. Function-calling qua LiteLLM (nguyên tắc
 * bất biến — mọi lời gọi LLM đi qua gateway), tools cố định an toàn:
 *  - check_slug / suggest: kiểm tra tên khả dụng
 *  - create_and_launch_venture: tạo venture + provisioning (CẦN đăng nhập)
 *  - venture_status: tiến độ không gian đang dựng
 *  - check_domains: tên miền còn trống (Nhân Hòa)
 * Khách chưa đăng nhập: tư vấn thoải mái; khi cần hành động → trả needLogin
 * để frontend hiện nút đăng nhập Cộng đồng.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

const SYSTEM_PROMPT = `Bạn là Lễ tân AI của SoloCEO (soloceo.vn) — nền tảng "hệ điều hành doanh nghiệp một người" cho Solo CEO Việt Nam.

NHIỆM VỤ: tư vấn ngắn gọn, thực chiến và GIÚP KHÁCH KHỞI TẠO DOANH NGHIỆP THẬT trên platform. Luôn trả lời tiếng Việt, thân thiện, xưng "em".

SoloCEO OS cung cấp cho mỗi CEO: trợ lý AI điều hành, web bán hàng mẫu, tự động hoá quy trình, mua tên miền, sổ doanh thu xác thực, cộng đồng và sàn M&A bán lại doanh nghiệp. Gói từ 299K/tháng.

CÁCH LÀM VIỆC:
- Khách kể ý tưởng → tư vấn tên doanh nghiệp + slug (không dấu, gạch ngang) → dùng check_slug kiểm tra.
- Khách muốn bắt đầu/khởi tạo → gọi create_and_launch_venture. Nếu tool trả needLogin → nói khách bấm nút "Đăng nhập" ngay dưới khung chat rồi nhắn lại "tiếp tục".
- Sau khi khởi tạo thành công → chúc mừng + báo khách rằng không gian làm việc + trợ lý AI đang được dựng (vài phút), sẽ có thông báo khi sẵn sàng.
- Có thể check_domains giúp khách chọn tên miền đẹp.
- KHÔNG bịa tính năng. Câu trả lời ≤ 120 từ trừ khi khách hỏi sâu.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "check_slug",
      description:
        "Kiểm tra slug (tên định danh không dấu) cho doanh nghiệp còn trống trên SoloCEO không",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "vd: tiem-banh-ngon" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_and_launch_venture",
      description:
        "Tạo doanh nghiệp và khởi tạo không gian làm việc (trợ lý AI + web bán hàng). Cần khách đã đăng nhập.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Tên doanh nghiệp tiếng Việt" },
          slug: { type: "string", description: "Slug không dấu, vd tiem-banh-ngon" },
          industry: {
            type: "string",
            enum: ["real_estate", "fnb", "education", "services", "other"],
          },
          description: { type: "string" },
        },
        required: ["name", "slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "venture_status",
      description: "Xem tiến độ không gian doanh nghiệp đang được dựng của khách",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "check_domains",
      description: "Kiểm tra tên miền (.com/.vn/.com.vn) còn trống không",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "tên miền không kèm đuôi, vd tiembanh" },
        },
        required: ["name"],
      },
    },
  },
];

@Injectable()
export class ConciergeService {
  private readonly logger = new Logger(ConciergeService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ventures: VenturesService,
    private readonly store: StoreService,
    private readonly nhanhoa: NhanHoaClient,
  ) {}

  /** Parse Bearer token (tùy chọn) — cùng logic AuthGuard nhưng không bắt buộc */
  async optionalUser(authHeader?: string): Promise<RequestUser | null> {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;
    const secret = this.config.get<string>("JWT_SUPABASE_SECRET");
    if (!secret) return null;
    try {
      const payload = jwt.verify(token, secret) as SupabaseJwtPayload;
      let orgId = payload.org_id ?? payload.app_metadata?.org_id ?? null;
      if (!orgId) {
        const org = await this.prisma.org.findFirst({
          where: { ownerUserId: payload.sub },
          select: { id: true },
        });
        orgId = org?.id ?? null;
      }
      return {
        userId: payload.sub,
        email: payload.email ?? null,
        orgId,
        isPlatformAdmin: false,
      };
    } catch {
      return null;
    }
  }

  private async llm(messages: ChatMessage[]): Promise<ChatMessage> {
    const baseUrl =
      this.config.get<string>("LITELLM_BASE_URL") ?? "https://llm.soloceo.vn";
    const key = this.config.get<string>("LITELLM_MASTER_KEY") ?? "";
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "soloceo-smart",
        messages,
        tools: TOOLS,
        temperature: 0.5,
        max_tokens: 700,
      }),
    });
    const data = (await res.json()) as {
      choices?: Array<{ message: ChatMessage }>;
      error?: { message?: string };
    };
    if (!data.choices?.[0]) {
      this.logger.warn(`LiteLLM lỗi: ${JSON.stringify(data).slice(0, 300)}`);
      return {
        role: "assistant",
        content:
          "Xin lỗi, em đang quá tải một chút. Anh/chị thử lại sau vài giây nhé!",
      };
    }
    return data.choices[0].message;
  }

  private async runTool(
    name: string,
    args: Record<string, unknown>,
    user: RequestUser | null,
  ): Promise<Record<string, unknown>> {
    switch (name) {
      case "check_slug": {
        const slug = String(args.slug ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "");
        if (!slug) return { ok: false, error: "slug rỗng" };
        const taken = await this.prisma.venture.findUnique({ where: { slug } });
        return { slug, available: !taken };
      }
      case "check_domains": {
        const nm = String(args.name ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "");
        if (!nm) return { ok: false, error: "tên rỗng" };
        const exts = [".com", ".vn", ".com.vn"];
        const out: Record<string, boolean | null> = {};
        for (const ext of exts) {
          try {
            const w = await this.nhanhoa.whois(nm, ext);
            out[`${nm}${ext}`] = w.available;
          } catch {
            out[`${nm}${ext}`] = null;
          }
        }
        return { results: out, note: "Mua được ngay trong cửa sổ Tên miền trên platform" };
      }
      case "venture_status": {
        if (!user?.orgId) return { needLogin: true };
        const vs = await this.prisma.venture.findMany({
          where: { orgId: user.orgId },
          include: {
            installs: { include: { catalogApp: { select: { key: true } } } },
          },
        });
        return {
          ventures: vs.map((v) => ({
            name: v.name,
            slug: v.slug,
            status: v.status,
            apps: v.installs.map((i) => `${i.catalogApp.key}:${i.status}`),
            platformUrl: "https://soloceo.vn",
          })),
        };
      }
      case "create_and_launch_venture": {
        if (!user?.orgId) return { needLogin: true };
        const name = String(args.name ?? "").trim();
        const slug = String(args.slug ?? "")
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "");
        if (!name || !slug) return { ok: false, error: "thiếu tên hoặc slug" };
        try {
          const v = await this.ventures.create(user, {
            name,
            slug,
            industry: (args.industry as string) ?? "other",
            description: (args.description as string) ?? undefined,
          });
          await this.store.launch(user, v.id);
          return {
            ok: true,
            venture: { id: v.id, name: v.name, slug: v.slug },
            message:
              "Đã khởi tạo! Không gian làm việc (trợ lý AI + web bán hàng) đang được dựng, vài phút là xong.",
            platformUrl: "https://soloceo.vn",
          };
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Không tạo được doanh nghiệp";
          return { ok: false, error: msg };
        }
      }
      default:
        return { ok: false, error: `tool ${name} không tồn tại` };
    }
  }

  /** Vòng chat: gọi model → thực thi tool (tối đa 4 vòng) → câu trả lời cuối */
  async chat(
    history: Array<{ role: "user" | "assistant"; content: string }>,
    authHeader?: string,
  ) {
    const user = await this.optionalUser(authHeader);
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    let needLogin = false;
    let launched: Record<string, unknown> | null = null;

    for (let round = 0; round < 4; round++) {
      const reply = await this.llm(messages);
      if (!reply.tool_calls?.length) {
        return {
          reply: reply.content ?? "",
          needLogin,
          launched,
          loggedIn: !!user?.orgId,
        };
      }
      messages.push(reply);
      for (const tc of reply.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          // args rỗng
        }
        const result = await this.runTool(tc.function.name, args, user);
        if (result.needLogin) needLogin = true;
        if (tc.function.name === "create_and_launch_venture" && result.ok) {
          launched = result;
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }
    return {
      reply:
        "Em đã xử lý xong các bước — anh/chị xem chi tiết trên soloceo.vn nhé!",
      needLogin,
      launched,
      loggedIn: !!user?.orgId,
    };
  }
}
