import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPublicKey, randomBytes } from "node:crypto";
import * as jwt from "jsonwebtoken";
import { WowonderService } from "../auth/wowonder.service";

/**
 * OIDC Provider tối thiểu bọc đăng nhập WoWonder — để DeerFlow (và app khác hỗ
 * trợ OIDC) đăng nhập bằng tài khoản mạng xã hội SoloCEO.
 *
 * Luồng authorization-code:
 *   client → /oidc/authorize (client_id, redirect_uri, state, nonce)
 *     → lưu request, chuyển sang WoWonder login
 *     → WoWonder callback về /oidc/wowonder-callback
 *     → sinh code, redirect về client redirect_uri?code=&state=
 *   client → POST /oidc/token (code) → id_token (JWT RS256) + access_token
 *   client → /oidc/userinfo (Bearer) → claims
 *
 * State/code lưu in-memory TTL ngắn (single-instance api-core; single-use).
 */

interface PendingAuth {
  clientId: string;
  redirectUri: string;
  state?: string;
  nonce?: string;
  createdAt: number;
}

interface IssuedCode {
  claims: OidcClaims;
  clientId: string;
  redirectUri: string;
  nonce?: string;
  createdAt: number;
}

export interface OidcClaims {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  preferred_username?: string;
}

const TTL_MS = 10 * 60 * 1000; // 10 phút

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private readonly pending = new Map<string, PendingAuth>(); // wowStateKey → req
  private readonly codes = new Map<string, IssuedCode>(); // code → claims
  private readonly accessTokens = new Map<string, OidcClaims>(); // token → claims

  constructor(
    private readonly config: ConfigService,
    private readonly wowonder: WowonderService,
  ) {}

  private issuer(): string {
    return (
      this.config.get<string>("OIDC_ISSUER") ?? "https://api.soloceo.vn/v1/oidc"
    );
  }

  private privateKey(): string {
    const k = this.config.get<string>("OIDC_PRIVATE_KEY");
    if (!k) throw new Error("OIDC_PRIVATE_KEY chưa cấu hình");
    // Khoá lưu dạng base64 (1 dòng — PEM nhiều dòng làm hỏng .env của Coolify).
    // Chấp nhận cả PEM thô (dev) lẫn base64 (prod).
    if (k.includes("BEGIN")) return k.replace(/\\n/g, "\n");
    return Buffer.from(k, "base64").toString("utf8");
  }

  private cleanup() {
    const now = Date.now();
    for (const [k, v] of this.pending) if (now - v.createdAt > TTL_MS) this.pending.delete(k);
    for (const [k, v] of this.codes) if (now - v.createdAt > TTL_MS) this.codes.delete(k);
  }

  /** Metadata discovery */
  discovery() {
    const iss = this.issuer();
    return {
      issuer: iss,
      authorization_endpoint: `${iss}/authorize`,
      token_endpoint: `${iss}/token`,
      userinfo_endpoint: `${iss}/userinfo`,
      jwks_uri: `${iss}/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "email", "profile"],
      token_endpoint_auth_methods_supported: [
        "client_secret_post",
        "client_secret_basic",
      ],
      claims_supported: ["sub", "email", "name", "picture", "preferred_username"],
    };
  }

  /** JWKS: public key từ private key */
  jwks() {
    const pub = createPublicKey(this.privateKey());
    const jwk = pub.export({ format: "jwk" }) as Record<string, string>;
    return {
      keys: [{ ...jwk, use: "sig", alg: "RS256", kid: "soloceo-oidc-1" }],
    };
  }

  /**
   * /authorize — lưu request của client, trả {loginUrl, key}. Controller đặt
   * cookie oidc_k=key + redirect tới loginUrl. WoWonder có callback CỐ ĐỊNH nên
   * dùng cookie để nhận biết đây là luồng OIDC khi quay lại.
   */
  buildAuthorize(params: {
    clientId: string;
    redirectUri: string;
    state?: string;
    nonce?: string;
    scope?: string;
  }): { loginUrl: string; key: string } {
    this.cleanup();
    if (!params.clientId || !params.redirectUri) {
      throw new BadRequestException("Thiếu client_id/redirect_uri");
    }
    // Chống open-redirect: redirect_uri chỉ được về domain SoloCEO
    try {
      const host = new URL(params.redirectUri).hostname;
      if (host !== "soloceo.vn" && !host.endsWith(".soloceo.vn")) {
        throw new Error();
      }
    } catch {
      throw new BadRequestException("redirect_uri không hợp lệ");
    }
    const key = randomBytes(24).toString("hex");
    this.pending.set(key, {
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      state: params.state,
      nonce: params.nonce,
      createdAt: Date.now(),
    });
    return { loginUrl: this.wowonder.getLoginUrl(), key };
  }

  /**
   * WoWonder callback: đổi code → user, sinh OIDC code, trả về redirect client.
   */
  async handleWowonderCallback(key: string, wowCode: string): Promise<string> {
    const req = this.pending.get(key);
    this.pending.delete(key);
    if (!req) throw new BadRequestException("Phiên đăng nhập hết hạn");
    const user = await this.wowonder.getUserFromCode(wowCode);
    const claims: OidcClaims = {
      sub: String(user.user_id),
      email: user.email || `${user.username}@users.soloceo.vn`,
      name:
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username,
      picture: user.avatar,
      preferred_username: user.username,
    };
    const code = randomBytes(24).toString("hex");
    this.codes.set(code, {
      claims,
      clientId: req.clientId,
      redirectUri: req.redirectUri,
      nonce: req.nonce,
      createdAt: Date.now(),
    });
    const u = new URL(req.redirectUri);
    u.searchParams.set("code", code);
    if (req.state) u.searchParams.set("state", req.state);
    return u.toString();
  }

  /** /token — code → id_token (JWT) + access_token */
  token(params: { code: string; clientId: string; redirectUri?: string }) {
    this.cleanup();
    const issued = this.codes.get(params.code);
    this.codes.delete(params.code); // single-use
    if (!issued) throw new BadRequestException("Code không hợp lệ hoặc đã dùng");
    if (issued.clientId !== params.clientId) {
      throw new BadRequestException("client_id không khớp");
    }
    const now = Math.floor(Date.now() / 1000);
    const idToken = jwt.sign(
      {
        iss: this.issuer(),
        sub: issued.claims.sub,
        aud: issued.clientId,
        iat: now,
        exp: now + 3600,
        email: issued.claims.email,
        email_verified: true,
        name: issued.claims.name,
        picture: issued.claims.picture,
        preferred_username: issued.claims.preferred_username,
        ...(issued.nonce ? { nonce: issued.nonce } : {}),
      },
      this.privateKey(),
      { algorithm: "RS256", keyid: "soloceo-oidc-1" },
    );
    const accessToken = randomBytes(32).toString("hex");
    this.accessTokens.set(accessToken, issued.claims);
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      id_token: idToken,
      scope: "openid email profile",
    };
  }

  /** /userinfo — Bearer access_token → claims */
  userinfo(accessToken: string) {
    const claims = this.accessTokens.get(accessToken);
    if (!claims) throw new BadRequestException("access_token không hợp lệ");
    return claims;
  }
}
