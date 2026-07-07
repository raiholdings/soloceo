"use client";

import { useEffect, useRef, useState } from "react";
import { api, API_URL, getToken } from "@/lib/api";
import { Button, Card, CardContent } from "@soloceo/ui";

interface Venture {
  id: string;
  name: string;
  slug: string;
  status: string;
}
interface InstallEvt {
  id: string;
  key: string;
  name: string;
  status: string;
  url?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "⏳ Trong hàng đợi",
  DEPLOYING: "🚀 Đang cài đặt",
  RUNNING: "✅ Sẵn sàng",
  FAILED: "❌ Lỗi",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Wizard khởi động lần đầu: tạo doanh nghiệp (nếu chưa) → cài mặc định
 * OpenClaw + Claw3D theo từng bước → vào bàn làm việc.
 */
export function OnboardingWizard({
  venture,
  onDone,
}: {
  venture: Venture | null;
  onDone: () => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(venture ? 1 : 0);
  const [name, setName] = useState(venture?.name ?? "");
  const [slug, setSlug] = useState(venture?.slug ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vid, setVid] = useState(venture?.id ?? "");
  const [installs, setInstalls] = useState<InstallEvt[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => () => esRef.current?.close(), []);

  async function createVenture() {
    setBusy(true);
    setError(null);
    try {
      const v = await api<Venture>("/ventures", {
        method: "POST",
        body: JSON.stringify({ name, slug, industry: "services" }),
      });
      setVid(v.id);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được doanh nghiệp");
    } finally {
      setBusy(false);
    }
  }

  function startInstall() {
    setBusy(true);
    setError(null);
    setStep(2);
    api(`/ventures/${vid}/launch`, { method: "POST" })
      .then(() => streamProgress())
      .catch((e) => {
        // nếu đã launch trước đó vẫn stream tiến trình
        streamProgress();
        setError(e instanceof Error ? e.message : null);
      });
  }

  function streamProgress() {
    esRef.current?.close();
    const es = new EventSource(
      `${API_URL}/v1/ventures/${vid}/provision-events?access_token=${getToken()}`,
    );
    esRef.current = es;
    es.onmessage = (ev) => {
      const data = JSON.parse(ev.data) as { installs: InstallEvt[] };
      // chỉ quan tâm 2 app mặc định
      setInstalls(
        data.installs.filter((i) => ["claw3d", "openclaw"].includes(i.key)),
      );
    };
    es.addEventListener("end", () => {
      es.close();
      setBusy(false);
    });
    es.onerror = () => {
      es.close();
      setBusy(false);
    };
  }

  const allRunning =
    installs.length > 0 && installs.every((i) => i.status === "RUNNING");

  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-canvas/80 px-6 backdrop-blur-glass">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col gap-5 p-8">
          {/* chỉ báo bước */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((s) => (
              <span
                key={s}
                className={`h-1 flex-1 rounded ${s <= step ? "bg-accent" : "bg-surface"}`}
              />
            ))}
          </div>

          {step === 0 && (
            <>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-b from-accent to-accent/40 text-3xl font-black text-white">
                  S
                </div>
                <h2 className="text-xl font-bold">
                  Chào mừng đến SoloCEO OS 👋
                </h2>
                <p className="mt-2 text-sm text-[#A0A0B8]">
                  Chỉ vài bước, chúng tôi sẽ thiết lập bàn làm việc AI cho doanh
                  nghiệp của bạn: trợ lý ra lệnh <b>OpenClaw</b> và văn phòng ảo
                  3D <b>Claw3D</b>.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  autoFocus
                  placeholder="Tên doanh nghiệp của bạn"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(slugify(e.target.value));
                  }}
                  className="h-11 rounded-xl border border-surface-border bg-transparent px-4 text-sm outline-none focus:border-accent"
                />
                {slug && (
                  <p className="text-xs text-[#A0A0B8]">
                    Địa chỉ: {slug}.app.soloceo.vn
                  </p>
                )}
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button
                  disabled={!name || !slug || busy}
                  onClick={createVenture}
                >
                  {busy ? "Đang tạo..." : "Tiếp tục"}
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold">Sẵn sàng bắt đầu làm việc</h2>
                <p className="mt-2 text-sm text-[#A0A0B8]">
                  Chúng tôi sẽ cài 2 công cụ mặc định để bạn bắt đầu ngay. Các
                  sản phẩm khác (ERPNext, kỹ năng...) bạn chủ động cài sau trong
                  App Store theo gói.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  ["🤖", "OpenClaw", "Trợ lý ra lệnh AI — điều khiển mọi hoạt động"],
                  ["🧊", "Claw3D", "Văn phòng ảo 3D — không gian làm việc của bạn"],
                ].map(([icon, t, d]) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface px-4 py-3"
                  >
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{t}</p>
                      <p className="text-xs text-[#A0A0B8]">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button onClick={startInstall}>
                🚀 Cài đặt & bắt đầu làm việc
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  {allRunning ? "Xong! 🎉" : "Đang thiết lập..."}
                </h2>
                <p className="mt-2 text-sm text-[#A0A0B8]">
                  {allRunning
                    ? "Bàn làm việc AI của bạn đã sẵn sàng."
                    : "Đang dựng OpenClaw + Claw3D trên hạ tầng riêng của bạn (vài phút)."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {(installs.length
                  ? installs
                  : [
                      { id: "a", key: "openclaw", name: "OpenClaw", status: "QUEUED" },
                      { id: "b", key: "claw3d", name: "Claw3D", status: "QUEUED" },
                    ]
                ).map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm"
                  >
                    <span>{i.name}</span>
                    <span className="text-xs text-[#A0A0B8]">
                      {STATUS_LABEL[i.status] ?? i.status}
                    </span>
                  </div>
                ))}
              </div>
              {allRunning ? (
                <Button onClick={onDone}>Vào bàn làm việc →</Button>
              ) : (
                <Button variant="outline" onClick={onDone}>
                  Vào bàn làm việc (chạy nền)
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
