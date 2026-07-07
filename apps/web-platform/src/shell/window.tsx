"use client";

import { Suspense } from "react";
import { Rnd } from "react-rnd";
import type { AppId, WindowState } from "./types";
import { APP_REGISTRY } from "./apps/registry";
import { useWindowManager } from "./window-manager";

export function ShellWindow({ win }: { win: WindowState }) {
  const { closeApp, minimizeApp, focusApp, moveResize } = useWindowManager();
  const def = APP_REGISTRY[win.appId as AppId];
  const Content = def.component;

  if (!win.open || win.minimized) return null;

  return (
    <Rnd
      position={{ x: win.x, y: win.y }}
      size={{ width: win.width, height: win.height }}
      minWidth={360}
      minHeight={240}
      bounds="parent"
      dragHandleClassName="shell-window-titlebar"
      style={{ zIndex: win.z }}
      onDragStart={() => focusApp(win.appId)}
      onDragStop={(_e, d) =>
        moveResize(win.appId, {
          x: d.x,
          y: d.y,
          width: win.width,
          height: win.height,
        })
      }
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        moveResize(win.appId, {
          x: pos.x,
          y: pos.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        })
      }
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-glass border border-surface-border bg-[#14141f]/80 shadow-2xl shadow-black/50 backdrop-blur-glass"
        onMouseDown={() => focusApp(win.appId)}
      >
        <div className="shell-window-titlebar flex h-9 shrink-0 cursor-move items-center gap-2 border-b border-surface-border px-3">
          <button
            aria-label="Đóng"
            onClick={() => closeApp(win.appId)}
            className="h-3 w-3 rounded-full bg-[#FF5F57] hover:brightness-125"
          />
          <button
            aria-label="Thu nhỏ"
            onClick={() => minimizeApp(win.appId)}
            className="h-3 w-3 rounded-full bg-[#FEBC2E] hover:brightness-125"
          />
          <span className="h-3 w-3 rounded-full bg-surface" />
          <span className="ml-2 select-none text-xs font-medium text-[#A0A0B8]">
            {def.title}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <Suspense
            fallback={
              <p className="p-8 text-center text-sm text-[#A0A0B8]">
                Đang tải...
              </p>
            }
          >
            <Content />
          </Suspense>
        </div>
      </div>
    </Rnd>
  );
}
