import { PrismaClient, Plan } from "@prisma/client";

const prisma = new PrismaClient();

// Catalog App Store tối thiểu cho MVP — CLAUDE.md Phần 7.1
const CATALOG_APPS = [
  {
    key: "site-nextjs",
    name: "Website bán hàng (Next.js)",
    category: "web",
    composeTemplate: "infra/coolify/templates/site-nextjs.yml",
    defaultEnv: {},
    planMin: Plan.STARTER,
  },
  {
    key: "crm-twenty",
    name: "CRM Twenty",
    category: "crm",
    composeTemplate: "infra/coolify/templates/crm-twenty.yml",
    defaultEnv: {},
    planMin: Plan.STARTER,
  },
  {
    key: "dify",
    name: "AI Studio (Dify)",
    category: "ai",
    composeTemplate: "infra/coolify/templates/dify.yml",
    defaultEnv: {},
    planMin: Plan.GROWTH,
  },
  {
    key: "activepieces",
    name: "Automation (Activepieces)",
    category: "automation",
    composeTemplate: "infra/coolify/templates/activepieces.yml",
    defaultEnv: {},
    planMin: Plan.GROWTH,
  },
  {
    key: "commerce-medusa",
    name: "Thương mại quốc tế (Medusa.js)",
    category: "commerce",
    composeTemplate: "infra/coolify/templates/commerce-medusa.yml",
    defaultEnv: {},
    planMin: Plan.GROWTH,
  },
];

async function main() {
  for (const app of CATALOG_APPS) {
    await prisma.catalogApp.upsert({
      where: { key: app.key },
      update: app,
      create: app,
    });
  }
  console.log(`Đã seed ${CATALOG_APPS.length} catalog app.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
