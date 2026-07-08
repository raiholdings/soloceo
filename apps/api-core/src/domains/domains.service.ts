import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import { NhanHoaClient } from "./nhanhoa.client";

/**
 * Mua tên miền ngay trên SoloCEO OS (đại lý Nhân Hòa).
 * Luồng human-in-the-loop (CLAUDE.md — hành động chi tiền phải có checkpoint):
 *   CEO tìm → đặt mua (DomainOrder PENDING_APPROVAL) → admin duyệt →
 *   gọi register_domain (trừ số dư đại lý) → ACTIVE.
 * Giai đoạn sau: chèn bước thanh toán PayOS/Stripe trước PENDING_APPROVAL.
 */

interface PriceRow {
  ext: string;
  register: number;
  renew: number;
}

// Markup nền tảng trên giá đại lý (%): nguồn thu mới của SoloCEO
const MARKUP_PCT = Number(process.env.DOMAIN_MARKUP_PCT ?? 20);

const POPULAR_EXTS = [".com", ".vn", ".com.vn", ".net", ".io", ".ai", ".org"];

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);
  private priceCache: { at: number; rows: PriceRow[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly nhanhoa: NhanHoaClient,
  ) {}

  /** Bảng giá gộp (quốc tế + VN), cache 1 giờ, đã cộng markup nền tảng */
  private async prices(): Promise<PriceRow[]> {
    if (this.priceCache && Date.now() - this.priceCache.at < 3600_000) {
      return this.priceCache.rows;
    }
    const rows: PriceRow[] = [];
    for (const type of [1, 2] as const) {
      try {
        const r = await this.nhanhoa.pricing(type);
        const data = r.data;
        if (Array.isArray(data)) {
          // Đã verify với API thật: [{name:".com", price_register:229000,
          // price_renew:"355000" (string!), price_transfer:"..."}]
          for (const item of data as Array<Record<string, unknown>>) {
            const ext = String(item.name ?? item.ext ?? item.domain_ext ?? "");
            const register = Number(
              item.price_register ?? item.register ?? item.setup ?? 0,
            );
            const renew = Number(item.price_renew ?? item.renew ?? register);
            if (ext && register > 0) rows.push({ ext, register, renew });
          }
        }
      } catch (e) {
        this.logger.warn(`Lỗi lấy bảng giá type=${type}: ${String(e)}`);
      }
    }
    if (rows.length) this.priceCache = { at: Date.now(), rows };
    return rows;
  }

  private applyMarkup(v: number): number {
    return Math.ceil((v * (100 + MARKUP_PCT)) / 100 / 1000) * 1000; // làm tròn nghìn
  }

  /** GET /v1/domains/search?q=tenmien — check các đuôi phổ biến + giá bán */
  async search(user: RequestUser, q: string) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const name = q
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\..*$/, "")
      .replace(/[^a-z0-9-]/g, "");
    if (!name || name.length < 2) {
      throw new BadRequestException("Tên miền không hợp lệ");
    }
    const priceRows = await this.prices();
    const results = await Promise.all(
      POPULAR_EXTS.map(async (ext) => {
        const price = priceRows.find((p) => p.ext === ext);
        try {
          const w = await this.nhanhoa.whois(name, ext);
          return {
            domain: `${name}${ext}`,
            name,
            ext,
            available: w.available,
            priceVnd: price ? this.applyMarkup(price.register) : null,
            renewVnd: price ? this.applyMarkup(price.renew) : null,
          };
        } catch {
          return {
            domain: `${name}${ext}`,
            name,
            ext,
            available: null, // không kiểm tra được
            priceVnd: price ? this.applyMarkup(price.register) : null,
            renewVnd: price ? this.applyMarkup(price.renew) : null,
          };
        }
      }),
    );
    return { query: name, results };
  }

  /** POST /v1/domains/orders — CEO đặt mua (chưa trừ tiền, chờ duyệt) */
  async createOrder(
    user: RequestUser,
    dto: {
      ventureId?: string;
      domain: string;
      ext: string;
      years?: number;
      contact: {
        realname: string;
        phone: string;
        email: string;
        address?: string;
        company?: string;
        city: string;
      };
    },
  ) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const name = dto.domain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    const ext = dto.ext.startsWith(".") ? dto.ext : `.${dto.ext}`;
    if (!name || !ext) throw new BadRequestException("Thiếu tên miền");
    if (!dto.contact?.realname || !dto.contact?.phone || !dto.contact?.email) {
      throw new BadRequestException("Thiếu thông tin liên hệ chủ thể");
    }

    // xác nhận còn trống + chốt giá tại thời điểm đặt
    const w = await this.nhanhoa.whois(name, ext);
    if (!w.available) {
      throw new BadRequestException(`Tên miền ${name}${ext} đã có người đăng ký`);
    }
    const priceRows = await this.prices();
    const price = priceRows.find((p) => p.ext === ext);
    if (!price) throw new BadRequestException(`Chưa hỗ trợ đuôi ${ext}`);
    const years = Math.min(Math.max(dto.years ?? 1, 1), 9);
    const priceVnd =
      this.applyMarkup(price.register) +
      this.applyMarkup(price.renew) * (years - 1);

    const order = await this.prisma.domainOrder.create({
      data: {
        orgId: user.orgId,
        ventureId: dto.ventureId ?? null,
        domain: name,
        ext,
        years,
        priceVnd,
        status: "PENDING_APPROVAL",
        contact: dto.contact,
      },
    });
    this.logger.log(
      `Đơn tên miền mới ${name}${ext} (${order.id}) org=${user.orgId} — chờ admin duyệt`,
    );
    return order;
  }

  /** GET /v1/domains/orders — đơn của org */
  async listOrders(user: RequestUser) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    return this.prisma.domainOrder.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ===== Admin (platform_admin) =====

  async adminListPending() {
    const [orders, balance] = await Promise.all([
      this.prisma.domainOrder.findMany({
        where: { status: "PENDING_APPROVAL" },
        orderBy: { createdAt: "asc" },
      }),
      this.nhanhoa.balance().catch(() => null),
    ]);
    return { orders, resellerBalance: balance?.data ?? null };
  }

  /** Admin duyệt → gọi Nhân Hòa đăng ký thật (trừ số dư đại lý) */
  async adminApprove(orderId: string) {
    const order = await this.prisma.domainOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn");
    if (order.status !== "PENDING_APPROVAL") {
      throw new BadRequestException(`Đơn đang ở trạng thái ${order.status}`);
    }
    await this.prisma.domainOrder.update({
      where: { id: orderId },
      data: { status: "REGISTERING" },
    });
    const c = order.contact as {
      realname: string;
      phone: string;
      email: string;
      address?: string;
      company?: string;
      city: string;
    };
    const r = await this.nhanhoa.registerDomain({
      domain: order.domain,
      ext: order.ext.replace(/^\./, ""),
      years: order.years,
      realname: c.realname,
      phone: c.phone,
      email: c.email,
      address: c.address,
      company: c.company,
      city: c.city,
    });
    const ok = r.status === "ok";
    const updated = await this.prisma.domainOrder.update({
      where: { id: orderId },
      data: {
        status: ok ? "ACTIVE" : "FAILED",
        providerMsg: r.msg ?? String(r.status),
      },
    });
    return updated;
  }

  async adminReject(orderId: string) {
    return this.prisma.domainOrder.update({
      where: { id: orderId },
      data: { status: "CANCELED" },
    });
  }
}
