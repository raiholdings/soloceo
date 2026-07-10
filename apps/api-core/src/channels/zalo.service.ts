import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { decryptSecret } from "../ai/crypto.util";
import { ZaloAdapter } from "./channel-adapter";

/**
 * Kênh Zalo OA (research/R7). Webhook → verify chữ ký → map oa_id→org/venture →
 * đẩy tin vào DeerFlow thread → gửi trả lời qua Zalo OA API. Token OA lưu mã hóa
 * trong bảng Secret (JSON: {app_id, oa_secret_key, oa_access_token,...}).
 *
 * Trạng thái: khung chức năng đầy đủ verify + parse; forward DeerFlow + gửi tin
 * là best-effort (chạy thật khi DeerFlow gateway + token OA đã cấu hình).
 */
interface OaSecretBlob {
  app_id: string;
  oa_secret_key: string;
  oa_access_token?: string;
}

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);
  private readonly gatewayUrl =
    process.env.DEERFLOW_GATEWAY_URL ?? "http://deerflow:8001";
  private readonly zaloApiBase =
    process.env.ZALO_OA_API_BASE ?? "https://openapi.zalo.me/v3.0/oa";

  constructor(private readonly prisma: PrismaService) {}

  /** Xử lý webhook Zalo cho 1 OA (oaId trong path). Trả nhanh để Zalo ack. */
  async handleWebhook(
    oaId: string,
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<{ ok: true }> {
    const binding = await this.prisma.channelBinding.findUnique({
      where: { channel_externalId: { channel: "zalo", externalId: oaId } },
    });
    if (!binding) throw new NotFoundException("OA chưa được liên kết");

    const secret = await this.prisma.secret.findUnique({
      where: { orgId_key: { orgId: binding.orgId, key: binding.secretRef } },
    });
    if (!secret) throw new NotFoundException("Thiếu secret OA");

    let blob: OaSecretBlob;
    try {
      blob = JSON.parse(decryptSecret(secret.valueEnc)) as OaSecretBlob;
    } catch {
      throw new BadRequestException("Secret OA hỏng");
    }

    const adapter = new ZaloAdapter(blob.app_id, blob.oa_secret_key);
    if (!adapter.verifySignature(rawBody, headers)) {
      throw new UnauthorizedException("Chữ ký webhook không hợp lệ");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException("Body không phải JSON");
    }
    const msg = adapter.parseInbound(payload);

    // Cập nhật thời điểm tương tác cuối (enforce cửa sổ 48h/7 ngày sau này).
    // Xử lý bất đồng bộ: forward DeerFlow + trả lời — best-effort, không chặn ack.
    if (msg.eventKind === "message" && msg.text) {
      this.forwardAndReply(binding.orgId, binding.ventureId, oaId, msg.externalUserId, msg.text, blob).catch(
        (e) => this.logger.warn(`Zalo forward lỗi: ${(e as Error).message}`),
      );
    }
    return { ok: true };
  }

  /** Đẩy tin vào DeerFlow thread (key = oaId+userId) rồi gửi reply về Zalo. */
  private async forwardAndReply(
    orgId: string,
    ventureId: string | null,
    oaId: string,
    userId: string,
    text: string,
    blob: OaSecretBlob,
  ) {
    const threadId = `zalo:${oaId}:${userId}`;
    // Tạo/tiếp tục thread + chạy run (R1 §5). Best-effort — DeerFlow có thể chưa deploy.
    let reply = "";
    try {
      const r = await fetch(
        `${this.gatewayUrl}/api/threads/${encodeURIComponent(threadId)}/runs/wait`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { message: text },
            metadata: { org_id: orgId, venture_id: ventureId, channel: "zalo" },
          }),
        },
      );
      const data = (await r.json()) as { output?: { text?: string }; reply?: string };
      reply = data.output?.text ?? data.reply ?? "";
    } catch (e) {
      this.logger.warn(`DeerFlow chưa sẵn sàng: ${(e as Error).message}`);
      return;
    }
    if (reply && blob.oa_access_token) {
      await this.sendText(blob.oa_access_token, userId, reply);
    }
  }

  /** Gửi tin văn bản tới user qua Zalo OA API (tin tư vấn trong phiên). */
  private async sendText(accessToken: string, userId: string, text: string) {
    await fetch(`${this.zaloApiBase}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: accessToken },
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: { text },
      }),
    }).catch((e) => this.logger.warn(`Gửi Zalo lỗi: ${(e as Error).message}`));
  }
}
