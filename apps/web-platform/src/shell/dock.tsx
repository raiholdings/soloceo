"use client";

import { useEffect, useRef, useState } from "react";
import type { AppId } from "./types";
import { APP_REGISTRY } from "./apps/registry";
import { useWindowManager } from "./window-manager";

const DOCK_ORDER: AppId[] = [
  "overview",
  "store",
  "ai",
  "clawhub",
  "automation",
  "revenue",
  "community",
  "marketplace",
  "settings",
];

/**
 * Dock tự ẩn (kiểu macOS): nền desktop là văn phòng 3D Claw3D có toolbar riêng
 * ở đáy — dock cố định sẽ đè lên. Mặc định trượt xuống ẩn; rê chuột sát mép
 * dưới màn hình (dải 8px) để hiện lại. Hiện 3 giây đầu để CEO biết dock ở đâu.
 */
export function Dock() {
  const { windows, openApp } = useWindowManager();
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hiện lúc mở desktop, tự ẩn sau 3s (trừ khi chuột đang ở trên dock)
  useEffect(() => {
    hideTimer.current = setTimeout(() => setVisible(false), 3000);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function show() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
  }
  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 600);
  }

  return (
    <>
      {/* Dải kích hoạt sát mép dưới — rê chuột vào đây để hiện dock */}
      <div
        className="absolute inset-x-0 bottom-0 z-40 h-2"
        onMouseEnter={show}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-3 z-50 flex justify-center transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-[130%]"
        }`}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      >
        <div className="pointer-events-auto flex items-end gap-2 rounded-glass border border-surface-border bg-surface px-3 py-2 backdrop-blur-glass">
          {DOCK_ORDER.map((appId) => {
            const def = APP_REGISTRY[appId];
            const Icon = def.icon;
            const isOpen = windows[appId]?.open;
            return (
              <button
                key={appId}
                onClick={() => openApp(appId)}
                title={def.title}
                className="group relative flex flex-col items-center"
              >
                <span className="pointer-events-none absolute -top-9 hidden whitespace-nowrap rounded-lg border border-surface-border bg-[#14141f] px-2 py-1 text-xs group-hover:block">
                  {def.title}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-b from-accent/40 to-accent/15 transition-transform duration-150 group-hover:-translate-y-1.5 group-hover:scale-110">
                  <Icon className="h-6 w-6 text-white" />
                </span>
                <span
                  className={`mt-1 h-1 w-1 rounded-full ${isOpen ? "bg-accent-soft" : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
