import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { encryptSecret } from "../ai/crypto.util";

// Thông tin user trả về từ WoWonder app_api?type=get_user_data
export interface WowonderUser {
  user_id?: string;
  id?: string;
  username: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  avatar?: string;
  cover?: string;
  verified?: string;
  about?: string;
}

const WOWONDER_TOKEN_SECRET = "wowonder_access_token";

@Injectable()
export class WowonderService {
  private readonly logger = new Logger(WowonderService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private get baseUrl(): string {
    return (
      this.config.get<string>("WOWONDER_BASE_URL") ?? "https://my.soloceo.vn"
    );
  }

  /** URL để đưa user tới trang duyệt OAuth của WoWonder (kiểu Facebook) */
  getLoginUrl(): string {
    const appId = this.config.get<string>("WOWONDER_APP_ID");
    if (!appId) {
      throw new BadRequestException(
        "WOWONDER_APP_ID chưa cấu hình — tạo development app trong admin WoWonder",
      );
    }
    return `${this.baseUrl}/oauth?app_id=${encodeURIComponent(appId)}`;
  }

  /** Đổi code → access_token (giữ app_secret ở server, không lộ ra frontend) */
  private async exchangeCode(code: string): Promise<string> {
    const appId = this.config.get<string>("WOWONDER_APP_ID");
    const appSecret = this.config.get<string>("WOWONDER_APP_SECRET");
    if (!appId || !appSecret) {
      throw new BadRequestException("WOWONDER_APP_ID/SECRET chưa cấu hình");
    }
    const url = `${this.baseUrl}/authorize?app_id=${encodeURIComponent(
      appId,
    )}&app_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(
      code,
    )}`;
    const res = await fetch(url);
    const json = (await res.json().catch(() => null)) as {
      access_token?: string;
      status?: number;
    } | null;
    if (!json?.access_token) {
      this.logger.warn(`Đổi code thất bại: ${JSON.stringify(json)}`);
      throw new UnauthorizedException("Mã xác thực không hợp lệ hoặc hết hạn");
    }
    return json.access_token;
  }

  /** Lấy thông tin user từ access_token */
  private async fetchUser(accessToken: string): Promise<WowonderUser> {
    const url = `${this.baseUrl}/app_api?access_token=${encodeURIComponent(
      accessToken,
    )}&type=get_user_data`;
    const res = await fetch(url);
    const json = (await res.json().catch(() => null)) as {
      user_data?: WowonderUser;
      api_status?: string;
    } | null;
    if (!json?.user_data?.username) {
      throw new UnauthorizedException("Không lấy được thông tin tài khoản");
    }
    return json.user_data;
  }

  /**
   * Toàn bộ luồng callback: code → token → user → upsert Org → JWT phiên.
   * Trả về JWT của nền tảng (AuthGuard verify được) + cờ user mới.
   */
  async handleCallback(
    code: string,
  ): Promise<{ token: string; isNew: boolean; user: WowonderUser }> {
    const accessToken = await this.exchangeCode(code);
    const user = await this.fetchUser(accessToken);

    // Khoá danh tính ổn định: ưu tiên user_id, fallback username
    const identity = `wo:${user.user_id ?? user.id ?? user.username}`;

    let org = await this.prisma.org.findFirst({
      where: { ownerUserId: identity },
    });
    const isNew = !org;
    if (!org) {
      org = await this.prisma.org.create({
        data: {
          name: this.displayName(user),
          ownerUserId: identity,
          plan: "STARTER",
        },
      });
      this.logger.log(`Org mới từ WoWonder: ${user.username} → ${org.id}`);
    }

    // Lưu access_token WoWonder (mã hoá) để đồng bộ hồ sơ sau này
    await this.prisma.secret.upsert({
      where: {
        orgId_key: { orgId: org.id, key: WOWONDER_TOKEN_SECRET },
      },
      update: { valueEnc: encryptSecret(accessToken) },
      create: {
        orgId: org.id,
        key: WOWONDER_TOKEN_SECRET,
        valueEnc: encryptSecret(accessToken),
      },
    });

    const token = this.authService.issueSessionToken({
      userId: identity,
      email: user.email ?? null,
    });
    return { token, isNew, user };
  }

  private displayName(user: WowonderUser): string {
    if (user.name) return user.name;
    const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return full || user.username;
  }

  /** Hồ sơ hiển thị (account management) — từ dữ liệu WoWonder */
  profileView(user: WowonderUser) {
    const avatar = user.avatar?.startsWith("http")
      ? user.avatar
      : user.avatar
        ? `${this.baseUrl}/${user.avatar}`
        : null;
    return {
      username: user.username,
      email: user.email ?? null,
      name: this.displayName(user),
      avatar,
      verified: user.verified === "1",
      communityUrl: `${this.baseUrl}/${user.username}`,
    };
  }

  /** Lấy hồ sơ hiện tại của org bằng token WoWonder đã lưu */
  async getProfileForOrg(orgId: string) {
    const secret = await this.prisma.secret.findUnique({
      where: { orgId_key: { orgId, key: WOWONDER_TOKEN_SECRET } },
    });
    if (!secret) return null;
    const { decryptSecret } = await import("../ai/crypto.util");
    try {
      const user = await this.fetchUser(decryptSecret(secret.valueEnc));
      return this.profileView(user);
    } catch {
      return null; // token hết hạn → cần đăng nhập lại
    }
  }
}
