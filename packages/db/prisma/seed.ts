import { PrismaClient, Plan } from "@prisma/client";

const prisma = new PrismaClient();

// Catalog App Store — ADR-005: bộ AI-native (bỏ Dify/Activepieces/Twenty/Medusa/site-nextjs)
const CATALOG_APPS = [
  {
    key: "claw3d",
    name: "Văn phòng ảo 3D (Claw3D)",
    category: "workspace",
    composeTemplate: "infra/coolify/templates/claw3d.yml",
    defaultEnv: {},
    planMin: Plan.STARTER,
  },
  {
    key: "openclaw",
    name: "Trợ lý ra lệnh AI (OpenClaw)",
    category: "ai",
    composeTemplate: "infra/coolify/templates/openclaw.yml",
    defaultEnv: {},
    planMin: Plan.STARTER,
  },
  {
    key: "erpnext",
    name: "Quản trị doanh nghiệp (ERPNext)",
    category: "erp",
    composeTemplate: "infra/coolify/templates/erpnext.yml",
    defaultEnv: {},
    planMin: Plan.STARTER,
  },
];

async function main() {
  // ADR-005: vô hiệu hoá app cũ (giữ dữ liệu venture đã cài), thêm app mới
  const OLD_KEYS = [
    "site-nextjs",
    "crm-twenty",
    "dify",
    "activepieces",
    "commerce-medusa",
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
