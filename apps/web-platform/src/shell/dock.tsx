"use client";

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

export function Dock() {
  const { windows, openApp } = useWindowManager();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
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
  );
}
