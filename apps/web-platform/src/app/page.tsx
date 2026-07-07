import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

// Màn hình giữ chỗ kiểu boot — OS Shell đầy đủ (dock, cửa sổ react-rnd)
// được dựng ở Giai đoạn 2 theo CLAUDE.md.
export default async function BootPage() {
  const t = await getTranslations("Boot");

  const appKeys = [
    "overview",
    "store",
    "ai",
    "automation",
    "revenue",
    "community",
    "marketplace",
    "settings",
  ] as const;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-accent-soft">
          {t("title")}
        </h1>
        <p className="mt-3 text-lg text-[#A0A0B8]">{t("subtitle")}</p>
      </div>

      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{t("status")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {appKeys.map((key) => (
              <div
                key={key}
                className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface p-4 text-center text-xs text-[#A0A0B8]"
              >
                <span className="h-8 w-8 rounded-lg bg-accent/30" />
                {t(`apps.${key}`)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
