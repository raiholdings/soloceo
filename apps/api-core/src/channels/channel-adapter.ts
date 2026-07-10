import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Trừu tượng kênh nhắn tin — SoloCEO OS v2 (research/R7 §7). Telegram và Zalo OA
 * chia sẻ interface này; khác biệt (token refresh 1-lần, cửa sổ 48h/7 ngày của
 * Zalo) được đóng gói trong adapter cụ thể.
 */
export interface InboundMessage {
  channel: string;
  oaId: string;
  externalUserId: string;
  eventKind: "message" | "follow" | "unfollow" | "other";
  type?: "text" | "image" | "file";
  text?: string;
  mediaUrls?: string[];
  ts: number;
}

export interface ChannelAdapter {
  readonly channel: "zalo" | "telegram";
  verifySignature(rawBody: string, headers: Record<string, string>): boolean;
  parseInbound(payload: unknown): InboundMessage;
}

/** Zalo OA adapter. Verify X-ZEvent-Signature = SHA256(appId+rawBody+timestamp+OASecret).
 *  LƯU Ý: dùng OA Secret Key (không phải App Secret) — R7 §2. */
export class ZaloAdapter implements ChannelAdapter {
  readonly channel = "zalo" as const;

  constructor(
    private readonly appId: string,
    private readonly oaSecretKey: string,
  ) {}

  verifySignature(rawBody: string, headers: Record<string, string>): boolean {
    const header =
      headers["x-zevent-signature"] ?? headers["X-ZEvent-Signature"] ?? "";
    if (!header) return false;
    // timestamp lấy từ body JSON (R7: nối appId + rawBody + timestamp + OASecret)
    let timestamp = "";
    try {
      timestamp = String((JSON.parse(rawBody) as { timestamp?: unknown }).timestamp ?? "");
    } catch {
      return false;
    }
    const mac = createHash("sha256")
      .update(this.appId + rawBody + timestamp + this.oaSecretKey)
      .digest("hex");
    const expected = `mac=${mac}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseInbound(payload: unknown): InboundMessage {
    const p = (payload ?? {}) as Record<string, any>;
    const eventName = String(p.event_name ?? "");
    const oaId = String(p.oa_id ?? p.recipient?.id ?? "");
    const externalUserId = String(p.sender?.id ?? p.user_id ?? "");
    const ts = Number(p.timestamp ?? 0);

    let eventKind: InboundMessage["eventKind"] = "other";
    if (eventName.startsWith("user_send")) eventKind = "message";
    else if (eventName === "follow") eventKind = "follow";
    else if (eventName === "unfollow") eventKind = "unfollow";

    let type: InboundMessage["type"] | undefined;
    if (eventName === "user_send_text") type = "text";
    else if (eventName === "user_send_image") type = "image";
    else if (eventName === "user_send_file") type = "file";

    return {
      channel: "zalo",
      oaId,
      externalUserId,
      eventKind,
      type,
      text: p.message?.text ? String(p.message.text) : undefined,
      ts,
    };
  }
}
