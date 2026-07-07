"use client";

import { useEffect, useState } from "react";
import { api, API_URL, clearToken, getToken, setToken } from "@/lib/api";
import { signIn } from "@/lib/auth";
import { Button } from "@soloceo/ui";

// Đăng nhập email chỉ dùng khi phát triển local — production chỉ OAuth Community.
const DEV_LOGIN = process.env.NODE_ENV !== "production";
import { Dock } from "./dock";
import { ShellWindow } from "./window";
import { WindowManagerProvider, useWindowManager } from "./window-manager";
import { OnboardingWizard } from "./onboarding";
import type { WindowState } from "./types";

interface OrgMe {
  id: string;
  name: string;
  plan: string;
}

interface VentureLite {
  id: string;
  name: string;
  slug: string;
  status: string;
  installs?: Array<{ status: string; catalogApp?: { key: string } }>;
}

function MenuBar({ org, onLogout }: { org: OrgMe; onLogout: () => void }) {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-x-0 top-0 z-[9999] flex h-8 items-center justify-between border-b border-surface-border bg-canvas/60 px-4 text-xs text-[#A0A0B8] backdrop-blur-glass">
      <span className="font-semibold text-accent-soft">SoloCEO OS</span>
      <div className="flex items-center gap-4">
        <span>
          {org.name} · Gói {org.plan}
        </span>
        <button onClick={onLogout} className="hover:text-white">
          Đăng xuất
        </button>
        <span>{clock}</span>
      </div>
    </div>
  );
}

function WindowLayer() {
  const { windows } = useWindowManager();
  return (
    <>
      {(Object.values(windows) as WindowState[]).map((w) => (
        <ShellWindow key={w.appId} win={w} />
      ))}
    </>
  );
}

function BootScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b from-accent to-accent/40 text-4xl font-black text-white shadow-2xl shadow-accent/30">
          S
        </div>
        <h1 className="text-3xl font-bold">SoloCEO OS</h1>
        <p className="mt-1 text-sm text-[#A0A0B8]">
          Đăng nhập để vào bàn làm việc của bạn
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <a
          href={`${API_URL}/v1/auth/wowonder/login?return_url=${encodeURIComponent(
            typeof window !== "undefined"
              ? window.location.origin + "/"
              : "https://platform.soloceo.vn/",
          )}`}
        >
          <Button className="w-full gap-2" disabled={busy}>
            <span className="text-lg">👥</span> Đăng nhập bằng SoloCEO Community
          </Button>
        </a>

        {/* Dev/local fallback */}
        {DEV_LOGIN && (
          <form onSubmit={login} className="mt-2 flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="email@cua-ban.vn (dev)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border border-surface-border bg-surface px-4 text-sm outline-none backdrop-blur-glass focus:border-accent"
            />
            <input
              type="password"
              required
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl border border-surface-border bg-surface px-4 text-sm outline-none backdrop-blur-glass focus:border-accent"
            />
            <Button type="submit" variant="outline" disabled={busy}>
              {busy ? "Đang khởi động..." : "Đăng nhập email (dev)"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

export function ShellRoot() {
  const [state, setState] = useState<"boot" | "login" | "desktop">("boot");
  const [org, setOrg] = useState<OrgMe | null>(null);
  // null = chưa biết; true/false = cần onboarding hay không
  const [needsOnboard, setNeedsOnboard] = useState<boolean | null>(null);
  const [firstVenture, setFirstVenture] = useState<VentureLite | null>(null);

  async function checkOnboarding() {
    const vs = await api<VentureLite[]>("/ventures").catch(() => []);
    const v = vs[0] ?? null;
    setFirstVenture(v);
    // Cần onboarding nếu: chưa có venture, HOẶC chưa cài đủ claw3d+openclaw
    const keys = new Set(
      (v?.installs ?? [])
        .filter((i) => i.status !== "REMOVED")
        .map((i) => i.catalogApp?.key),
    );
    const setup = keys.has("claw3d") && keys.has("openclaw");
    setNeedsOnboard(!setup);
  }

  useEffect(() => {
    // Nhận token từ callback OAuth WoWonder (?token=...)
    const url = new URL(window.location.href);
    const tokenParam = url.searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      url.searchParams.delete("token");
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    if (!getToken()) {
      setState("login");
      return;
    }
    api<OrgMe>("/orgs/me")
      .then(async (o) => {
        setOrg(o);
        await checkOnboarding();
        setState("desktop");
      })
      .catch(() => {
        clearToken();
        setState("login");
      });
  }, []);

  if (state === "boot") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-sm text-[#A0A0B8]">
          Đang khởi động SoloCEO OS...
        </p>
      </main>
    );
  }

  if (state === "login" || !org) {
    return (
      <BootScreen
        onLoggedIn={() => {
          api<OrgMe>("/orgs/me")
            .then((o) => {
              setOrg(o);
              setState("desktop");
            })
            .catch(() => {
              // đã đăng nhập nhưng chưa có Org → đưa về web-community onboarding
              window.location.href = `${process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "https://soloceo.vn"}/bat-dau`;
            });
        }}
      />
    );
  }

  return (
    <WindowManagerProvider>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Nền desktop = văn phòng ảo 3D Claw3D của tenant (ADR-005) */}
        <Claw3DBackground />
        <MenuBar
          org={org}
          onLogout={() => {
            clearToken();
            window.location.reload();
          }}
        />
        <div className="pointer-events-none absolute inset-0 top-8 bottom-0">
          <WindowLayer />
        </div>
        <Dock />
        {/* Wizard khởi động lần đầu: cài mặc định OpenClaw + Claw3D */}
        {needsOnboard && (
          <OnboardingWizard
            venture={firstVenture}
            onDone={() => setNeedsOnboard(false)}
          />
        )}
      </div>
    </WindowManagerProvider>
  );
}

interface InstallLite {
  status: string;
  url?: string | null;
  catalogApp?: { key: string };
}

// Nền desktop: iframe Claw3D khi đã RUNNING; vùng đen (như ảnh) khi chưa provisioning.
function Claw3DBackground() {
  const [claw, setClaw] = useState<{ status: string; url?: string | null } | null>(
    null,
  );

  useEffect(() => {
    let stop = false;
    const load = () =>
      api<Array<{ id: string }>>("/ventures")
        .then(async (vs) => {
          const v = vs[0];
          if (!v) return;
          const installs = await api<InstallLite[]>(
            `/ventures/${(v as { id: string }).id}/installs`,
          );
          const c = installs.find((i) => i.catalogApp?.key === "claw3d");
          if (!stop) setClaw(c ? { status: c.status, url: c.url } : null);
        })
        .catch(() => {});
    load();
    // poll đến khi Claw3D chạy (đang provisioning)
    const t = setInterval(() => {
      if (claw?.status !== "RUNNING") load();
    }, 8000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [claw?.status]);

  if (claw?.status === "RUNNING" && claw.url) {
    return (
      <iframe
        src={claw.url}
        title="Văn phòng ảo 3D"
        className="absolute inset-0 h-full w-full border-0"
        allow="fullscreen; xr-spatial-tracking"
      />
    );
  }

  // Vùng đen + gradient nhẹ khi chưa có Claw3D (giống ảnh anh gửi)
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_20%,rgba(124,92,255,0.18),transparent),radial-gradient(ellipse_50%_40%_at_20%_85%,rgba(56,189,248,0.10),transparent),#0a0a12]">
      {claw?.status && claw.status !== "RUNNING" && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-sm text-[#8a8aa0]">
          <p className="animate-pulse">Đang dựng văn phòng ảo 3D...</p>
        </div>
      )}
    </div>
  );
}
