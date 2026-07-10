import { PrismaClient, Plan } from "@prisma/client";

const prisma = new PrismaClient();

// Catalog App Store v2 (C9 — R0): claw3d/openclaw đã sang openclawos.vn → vô
// hiệu hoá (active=false) bên dưới, KHÔNG xoá bản ghi. Bộ v2 tạm: ERPNext + web
// bán hàng mẫu; AI (DeerFlow/AIO) nối ở PHA 3.
const CATALOG_APPS = [
  {
    key: "erpnext",
    name: "Quản trị doanh nghiệp (ERPNext)",
    category: "erp",
    composeTemplate: "infra/coolify/templates/erpnext.yml",
    defaultEnv: {},
    planMin: Plan.STARTER,
  },
  // C1 (v2 cleanup): web bán hàng mẫu — app mặc định TẠM cho khách mới trong lúc
  // build v2. Deploy qua APP_CONFIGS (image registry), composeTemplate không được
  // đọc (chỉ để thoả field bắt buộc). GIỮ (không đụng) theo ràng buộc v2.
  {
    key: "commerce-starter",
    name: "Web bán hàng mẫu (Commerce Starter)",
    category: "web",
    composeTemplate: "infra/coolify/templates/commerce-starter.yml",
    defaultEnv: {},
    planMin: Plan.STARTER,
  },
];

async function main() {
  // Vô hiệu hoá app cũ (giữ dữ liệu venture đã cài), thêm app mới.
  // ADR-005 app cũ + C9 (v2): claw3d/openclaw (cụm sang openclawos.vn).
  const OLD_KEYS = [
    "site-nextjs",
    "crm-twenty",
    "dify",
    "activepieces",
    "commerce-medusa",
    "claw3d",
    "openclaw",
  ];
  await prisma.catalogApp.updateMany({
    where: { key: { in: OLD_KEYS } },
    data: { active: false },
  });

  for (const app of CATALOG_APPS) {
    await prisma.catalogApp.upsert({
      where: { key: app.key },
      update: { ...app, active: true },
      create: app,
    });
  }
  console.log(
    `Đã vô hiệu ${OLD_KEYS.length} app cũ, seed ${CATALOG_APPS.length} app AI-native (ADR-005).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
