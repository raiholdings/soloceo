import { getTranslations } from "next-intl/server";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

export default async function HomePage() {
  const t = await getTranslations("Home");

  const features = ["store", "ai", "ma"] as const;

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-16 px-6 py-24 text-center">
      <section className="flex flex-col items-center gap-6">
        <span className="rounded-full border border-surface-border bg-surface px-4 py-1 text-sm text-accent-soft">
          {t("badge")}
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-lg text-[#A0A0B8]">{t("subtitle")}</p>
        <div className="flex gap-4">
          <Button size="lg">{t("ctaPrimary")}</Button>
          <Button size="lg" variant="outline">
            {t("ctaSecondary")}
          </Button>
        </div>
      </section>

      <section className="grid w-full gap-6 md:grid-cols-3">
        {features.map((key) => (
          <Card key={key} className="text-left">
            <CardHeader>
              <CardTitle className="text-accent-soft">
                {t(`features.${key}.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#A0A0B8]">
              {t(`features.${key}.description`)}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
