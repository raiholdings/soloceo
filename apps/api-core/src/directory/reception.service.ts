import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { decryptSecret } from "../ai/crypto.util";

/**
 * "Lễ tân" công khai của từng doanh nghiệp (trang chủ soloceo.vn).
 *
 * Bề mặt AN TOÀN để trưng bày ra công chúng — TÁCH khỏi buồng lái Claw3D/OpenClaw
 * riêng của chủ DN:
 *  - Chỉ nhận thông tin CÔNG KHAI của venture (tên/ngành/mô tả) làm ngữ cảnh.
 *  - Persona tiếp khách/bán hàng, cấm lộ dữ liệu nội bộ, không có tool/hành động.
 *  - Chạy trên virtual key của CHÍNH org đó → chi phí tính vào ngân sách CEO,
 *    có trần max_budget (LiteLLM trả 429 khi vượt → mình trả lời lịch sự).
 *  - Model rẻ (soloceo-fast) + max_tokens nhỏ; controller siết rate-limit theo IP.
 */

const LITELLM_KEY_SECRET = "litellm_virtual_key";

const INDUSTRY_LABEL: Record<string, string> = {
  real_estate: "bất động sản",
  fnb: "ẩm thực & F&B",
  education: "giáo dục",
  services: "dịch vụ",
  other: "kinh doanh",
};

interface Msg {
  role: "user" | "assistant";
  content: string;
}

@Injectable()
export class ReceptionService {
  private readonly logger = new Logger(ReceptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private systemPrompt(v: {
    name: string;
    industry: string | null;
    description: string | null;
    orgName?: string | null;
  }): string {
    const nganh = INDUSTRY_LABEL[v.industry ?? "other"] ?? "kinh doanh";
    const mota = v.description?.trim()
      ? `Giới thiệu do doanh nghiệp cung cấp: "${v.description.trim()}".`
      : "";
    return [
      `Bạn là TRỢ LÝ TIẾP KHÁCH của doanh nghiệp "${v.name}" (lĩnh vực ${nganh}).`,
      mota,
      `Vai trò: chào đón khách ghé thăm, giới thiệu sản phẩm/dịch vụ, giải đáp thắc mắc,`,
      `khơi gợi nhu cầu và mời khách để lại liên hệ hoặc đặt hàng.`,
      `Luôn trả lời TIẾNG VIỆT, lịch sự, thân thiện; xưng "em", gọi khách "anh/chị". Ngắn gọn ≤ 90 từ.`,
      `TUYỆT ĐỐI KHÔNG tiết lộ thông tin nội bộ/vận hành/tài chính/kỹ thuật/cấu hình,`,
      `không bàn về hệ thống hay việc bạn là mô hình AI nào. Khi không chắc thông tin,`,
      `hãy mời khách để lại liên hệ để chủ doanh nghiệp phản hồi trực tiếp.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  /** Đọc virtual key của org (chỉ đọc; không tạo mới cho lượt khách ẩn danh) */
  private async orgKey(orgId: string): Promise<string | null> {
    try {
      const s = await this.prisma.secret.findUnique({
        where: { orgId_key: { orgId, key: LITELLM_KEY_SECRET } },
      });
      return s ? decryptSecret(s.valueEnc) : null;
    } catch {
      return null;
    }
  }

  async chat(slug: string, history: Msg[]): Promise<{ reply: string }> {
    const venture = await this.prisma.venture.findUnique({
      where: { slug },
      select: {
        orgId: true,
        name: true,
        industry: true,
        description: true,
        status: true,
        org: { select: { name: true } },
      },
    });
    if (!venture || !["LIVE", "LISTED"].includes(venture.status)) {
      throw new NotFoundException("Không tìm thấy doanh nghiệp");
    }

    const baseUrl =
      this.config.get<string>("LITELLM_BASE_URL") ?? "https://llm.soloceo.vn";
    // Ưu tiên key của org (có trần ngân sách); nếu chưa có thì dùng master key
    const key =
      (await this.orgKey(venture.orgId)) ??
      this.config.get<string>("LITELLM_MASTER_KEY") ??
      "";

    const messages = [
      { role: "system", content: this.systemPrompt(venture) },
      ...history
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) })),
    ];

    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "soloceo-fast",
          messages,
          temperature: 0.6,
          max_tokens: 400,
        }),
      });
      if (res.status === 429) {
        return {
          reply:
            "Dạ trợ lý đang bận tiếp nhiều khách, anh/chị vui lòng thử lại sau ít phút hoặc để lại liên hệ giúp em nhé!",
        };
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        this.logger.warn(`Lễ tân ${slug}: phản hồi rỗng từ LiteLLM`);
        return {
          reply:
            "Dạ em xin lỗi, em chưa nghe rõ ý anh/chị. Anh/chị nhắn lại giúp em nhé!",
        };
      }
      return { reply };
    } catch (e) {
      this.logger.warn(`Lễ tân ${slug} lỗi: ${e}`);
      return {
        reply:
          "Dạ hệ thống đang bận một chút, anh/chị thử lại sau giây lát giúp em nhé!",
      };
    }
  }
}
