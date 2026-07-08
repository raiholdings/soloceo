import { Injectable, Logger } from "@nestjs/common";

/**
 * Client API đại lý Nhân Hòa (docs.nhanhoa.com).
 * Giao thức: POST form-encoded, các trường: cmd, auth-id, auth-user, auth-pwd,
 * formdata[<key>]=<value> (kiểu PHP array).
 * - Lệnh chung (register/renew/pricing/balance): https://api.nhanhoa.com/
 * - Lệnh whois (check tên miền): https://api.zonedns.vn/
 * IP máy chủ PHẢI nằm trong whitelist trên customer.nhanhoa.com/reseller/api.
 *
 * NHANHOA_FAKE=1: giả lập cho dev/demo khi chưa có credentials.
 */

export interface WhoisResult {
  available: boolean;
  raw: string;
}

export interface NhanHoaResponse {
  status: string;
  msg?: string;
  data?: unknown;
  [k: string]: unknown;
}

@Injectable()
export class NhanHoaClient {
  private readonly logger = new Logger(NhanHoaClient.name);
  private readonly apiBase =
    process.env.NHANHOA_API_BASE ?? "https://api.nhanhoa.com/";
  private readonly whoisBase =
    process.env.NHANHOA_WHOIS_BASE ?? "https://api.zonedns.vn/";

  private get fake(): boolean {
    return process.env.NHANHOA_FAKE === "1" || !process.env.NHANHOA_AUTH_PWD;
  }

  private async call(
    base: string,
    cmd: string,
    formdata: Record<string, string | number>,
  ): Promise<NhanHoaResponse> {
    const body = new URLSearchParams();
    body.set("cmd", cmd);
    body.set("auth-id", process.env.NHANHOA_AUTH_ID ?? "");
    body.set("auth-user", process.env.NHANHOA_AUTH_USER ?? "");
    body.set("auth-pwd", process.env.NHANHOA_AUTH_PWD ?? "");
    for (const [k, v] of Object.entries(formdata)) {
      body.set(`formdata[${k}]`, String(v));
    }
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as NhanHoaResponse;
    } catch {
      this.logger.warn(`Nhân Hòa trả về không phải JSON: ${text.slice(0, 200)}`);
      return { status: "error", msg: text.slice(0, 500) };
    }
  }

  /** Kiểm tra tên miền còn trống không. domain KHÔNG kèm ext; ext dạng ".com" */
  async whois(domain: string, ext: string): Promise<WhoisResult> {
    if (this.fake) {
      // giả lập: tên có "soloceo" coi như đã đăng ký
      const taken = domain.includes("soloceo");
      return {
        available: !taken,
        raw: taken ? "đã đăng ký (fake)" : "chưa đăng ký (fake)",
      };
    }
    const r = await this.call(this.whoisBase, "whois", {
      domain,
      ext,
      type: "0",
    });
    const msg = (r.msg ?? "").toLowerCase();
    // "chưa đăng ký" = còn trống; "đã đăng ký" = mất rồi
    const available =
      msg.includes("chưa đăng ký") ||
      msg.includes("chua dang ky") ||
      msg.includes("available");
    return { available, raw: r.msg ?? r.status };
  }

  /** Bảng giá: type 1 = quốc tế, 2 = Việt Nam. Trả raw data để service cache/parse. */
  async pricing(type: 1 | 2): Promise<NhanHoaResponse> {
    if (this.fake) {
      return { status: "ok", data: FAKE_PRICING[type] };
    }
    return this.call(this.apiBase, "domain_pricing", { type });
  }

  /** Số dư tài khoản đại lý (để admin đối chiếu trước khi duyệt) */
  async balance(): Promise<NhanHoaResponse> {
    if (this.fake) return { status: "ok", data: { balance: 10_000_000 } };
    return this.call(this.apiBase, "balance", {});
  }

  /** Đăng ký tên miền — CHI TIỀN số dư đại lý. Chỉ gọi sau checkpoint duyệt. */
  async registerDomain(input: {
    domain: string; // "cuahang"
    ext: string; // "com" (không dấu chấm)
    years: number;
    realname: string;
    phone: string; // +84...
    email: string;
    address?: string;
    company?: string;
    city: string;
    country?: string;
    dns1?: string;
    dns2?: string;
  }): Promise<NhanHoaResponse> {
    if (this.fake) {
      return {
        status: "ok",
        msg: `(fake) Domain ${input.domain}.${input.ext} đã được gửi yêu cầu đăng ký.`,
      };
    }
    return this.call(this.apiBase, "register_domain", {
      domainNameList: `${input.domain}.${input.ext}`,
      domainName: input.domain,
      domainExt: input.ext,
      domainYear: String(input.years),
      domainDNS1: input.dns1 ?? "ns1.zonedns.vn",
      domainDNS2: input.dns2 ?? "ns2.zonedns.vn",
      domain_realname: input.realname,
      domain_phone: input.phone,
      domain_email: input.email,
      domain_address: input.address ?? "",
      domain_company: input.company ?? "",
      domain_city: input.city,
      domain_country: input.country ?? "Vietnam",
    });
  }
}

// Giá fallback/demo (VND/năm) — thay bằng bảng giá thật khi có credentials
const FAKE_PRICING: Record<number, Array<{ ext: string; register: number; renew: number }>> = {
  1: [
    { ext: ".com", register: 325000, renew: 350000 },
    { ext: ".net", register: 350000, renew: 380000 },
    { ext: ".org", register: 320000, renew: 350000 },
    { ext: ".io", register: 1250000, renew: 1350000 },
    { ext: ".ai", register: 2500000, renew: 2500000 },
  ],
  2: [
    { ext: ".vn", register: 750000, renew: 460000 },
    { ext: ".com.vn", register: 650000, renew: 380000 },
  ],
};
