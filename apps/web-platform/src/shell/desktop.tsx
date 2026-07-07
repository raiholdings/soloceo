"use client";

import { useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "@/lib/api";
import { Button } from "@soloceo/ui";
import { Dock } from "./dock";
import { ShellWindow } from "./window";
import { WindowManagerProvider, useWindowManager } from "./window-manager";
import type { WindowState } from "./types";

interface OrgMe {
  id: string;
  name: string;
  plan: string;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string }>("/auth/dev-login", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setToken(res.accessToken);
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
      <form onSubmit={login} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="email"
          required
          placeholder="email@cua-ban.vn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl border border-surface-border bg-surface px-4 text-sm outline-none backdrop-blur-glass focus:border-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Đang khởi động..." : "Đăng nhập"}
        </Button>
      </form>
    </main>
  );
}

export function ShellRoot() {
  const [state, setState] = useState<"boot" | "login" | "desktop">("boot");
  const [org, setOrg] = useState<OrgMe | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setState("login");
      return;
    }
    api<OrgMe>("/orgs/me")
      .then((o) => {
        setOrg(o);
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
              window.location.href = "http://localhost:3000/bat-dau";
            });
        }}
      />
    );
  }

  return (
    <WindowManagerProvider>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* wallpaper */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_20%,rgba(124,92,255,0.25),transparent),radial-gradient(ellipse_50%_40%_at_20%_80%,rgba(56,189,248,0.12),transparent)]" />
        <MenuBar
          org={org}
          onLogout={() => {
            clearToken();
            window.location.reload();
          }}
        />
        <div className="absolute inset-0 top-8 bottom-0">
          <WindowLayer />
        </div>
        <Dock />
      </div>
    </WindowManagerProvider>
  );
}
