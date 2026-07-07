"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, API_URL, getToken } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface CatalogApp {
  key: string;
  name: string;
  category: string;
  planMin: string;
  allowed: boolean;
}

interface Install {
  id: string;
  status: string;
  url?: string | null;
  catalogApp: { key: string; name: string };
}

interface Venture {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface SseEvent {
  ventureStatus?: string;
  installs: Array<{
    id: string;
    key: string;
    name: string;
    status: string;
    url?: string | null;
  }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  web: "Website",
  crm: "CRM",
  ai: "AI",
  automation: "Automation",
  commerce: "Thương mại",
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "⏳ Trong hàng đợi",
  DEPLOYING: "🚀 Đang cài đặt",
  RUNNING: "✅ Đang chạy",
  FAILED: "❌ Lỗi",
};

export default function StoreApp() {
  const [venture, setVenture] = useState<Venture | null>(null);
  const [apps, setApps] = useState<CatalogApp[]>([]);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const lastStatuses = useRef<Record<string, string>>({});

  const reload = useCallback(async () => {
    const ventures = await api<Venture[]>("/ventures");
    const v = ventures[0] ?? null;
    setVenture(v);
    setApps(await api<CatalogApp[]>("/store/apps"));
    if (v) {
      setInstalls(await api<Install[]>(`/ventures/${v.id}/installs`));
    }
  }, []);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
    return () => esRef.current?.close();
  }, [reload]);

  const startStream = useCallback(
    (ventureId: string) => {
      esRef.current?.close();
      setStreaming(true);
      setProgressLog(["> Bắt đầu khởi tạo hạ tầng..."]);
      lastStatuses.current = {};
      const es = new EventSource(
        `${API_URL}/v1/ventures/${ventureId}/provision-events?access_token=${getToken()}`,
      );
      esRef.current = es;
      es.onmessage = (ev) => {
        const data: SseEvent = JSON.parse(ev.data);
        for (const i of data.installs) {
          if (lastStatuses.current[i.id] !== i.status) {
            lastStatuses.current[i.id] = i.status;
            setProgressLog((log) => [
              ...log,
              `> [${i.name}] ${STATUS_LABELS[i.status] ?? i.status}${
                i.status === "RUNNING" && i.url ? ` → ${i.url}` : ""
              }`,
            ]);
          }
        }
        setInstalls(
          data.installs.map((i) => ({
            id: i.id,
            status: i.status,
            url: i.url,
            catalogApp: { key: i.key, name: i.name },
          })),
        );
        if (data.ventureStatus && data.ventureStatus !== "PROVISIONING") {
          setVenture((v) => (v ? { ...v, status: data.ventureStatus! } : v));
        }
      };
      es.addEventListener("end", () => {
        setProgressLog((log) => [...log, "> Hoàn tất."]);
        setStreaming(false);
        es.close();
        reload().catch(() => {});
      });
      es.onerror = () => {
        setStreaming(false);
        es.close();
      };
    },
    [reload],
  );

  async function launch() {
    if (!venture) return;
    setError(null);
    try {
      await api(`/ventures/${venture.id}/launch`, { method: "POST" });
      setVenture({ ...venture, status: "PROVISIONING" });
      startStream(venture.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khởi chạy");
    }
  }

  async function installApp(key: string) {
    if (!venture) return;
    setError(null);
    try {
      await api(`/ventures/${venture.id}/installs`, {
        method: "POST",
        body: JSON.stringify({ catalogAppKey: key }),
      });
      startStream(venture.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi cài đặt");
    }
  }

  async function removeApp(install: Install) {
    if (
      !window.confirm(
        `Gỡ "${install.catalogApp.name}"? Toàn bộ dữ liệu app sẽ bị xóa.`,
      )
    )
      return;
    await api(`/installs/${install.id}?confirm=true`, { method: "DELETE" });
    await reload();
  }

  if (!venture) {
    return (
      <p className="py-16 text-center text-sm text-[#A0A0B8]">
        {error ?? "Chưa có venture — tạo doanh nghiệp tại soloceo.vn trước."}
      </p>
    );
  }

  const installedKeys = new Map(
    installs.map((i) => [i.catalogApp.key, i] as const),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">{venture.name}</p>
            <p className="text-xs text-[#A0A0B8]">
              {venture.slug}.app.soloceo.vn — {venture.status}
            </p>
          </div>
          {venture.status === "DRAFT" && (
            <Button onClick={launch}>🚀 Khởi chạy doanh nghiệp</Button>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {(streaming || progressLog.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tiến trình khởi tạo</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-40 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-emerald-300">
              {progressLog.join("\n")}
              {streaming && "\n> ▋"}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {apps.map((app) => {
          const install = installedKeys.get(app.key);
          return (
            <Card key={app.key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {app.name}
                  <span className="rounded-full border border-surface-border px-2 py-0.5 text-[10px] font-normal text-[#A0A0B8]">
                    {CATEGORY_LABELS[app.category] ?? app.category}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-xs text-[#A0A0B8]">
                  {install
                    ? (STATUS_LABELS[install.status] ?? install.status)
                    : app.allowed
                      ? `Sẵn sàng cài`
                      : `Cần gói ${app.planMin}`}
                </span>
                {install ? (
                  install.status === "RUNNING" ? (
                    <div className="flex gap-2">
                      {install.url && (
                        <a href={install.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">
                            Mở
                          </Button>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeApp(install)}
                      >
                        Gỡ
                      </Button>
                    </div>
                  ) : null
                ) : (
                  <Button
                    size="sm"
                    disabled={!app.allowed || streaming}
                    onClick={() => installApp(app.key)}
                  >
                    {app.allowed ? "Cài đặt" : "Nâng gói"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
