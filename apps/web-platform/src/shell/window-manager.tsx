"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AppId, WindowsState, WindowState } from "./types";
import { APP_REGISTRY } from "./apps/registry";

const STORAGE_KEY = "soloceo_shell_windows_v1";

interface WindowManagerApi {
  windows: WindowsState;
  openApp: (appId: AppId) => void;
  closeApp: (appId: AppId) => void;
  minimizeApp: (appId: AppId) => void;
  focusApp: (appId: AppId) => void;
  moveResize: (
    appId: AppId,
    rect: { x: number; y: number; width: number; height: number },
  ) => void;
}

const WindowManagerContext = createContext<WindowManagerApi | null>(null);

export function useWindowManager(): WindowManagerApi {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager ngoài WindowManagerProvider");
  return ctx;
}

let zCounter = 10;

function defaultWindow(appId: AppId, index: number): WindowState {
  const def = APP_REGISTRY[appId];
  return {
    appId,
    open: true,
    minimized: false,
    x: 80 + index * 32,
    y: 60 + index * 24,
    width: def.defaultWidth,
    height: def.defaultHeight,
    z: ++zCounter,
  };
}

export function WindowManagerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [windows, setWindows] = useState<WindowsState>({});
  const loaded = useRef(false);

  // Khôi phục vị trí cửa sổ từ localStorage (DoD Giai đoạn 2)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WindowsState;
        zCounter =
          Math.max(10, ...Object.values(parsed).map((w) => w?.z ?? 0)) + 1;
        setWindows(parsed);
      }
    } catch {
      // dữ liệu hỏng — bỏ qua
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  }, [windows]);

  const openApp = useCallback((appId: AppId) => {
    setWindows((prev) => {
      const existing = prev[appId];
      if (existing?.open) {
        return {
          ...prev,
          [appId]: { ...existing, minimized: false, z: ++zCounter },
        };
      }
      return {
        ...prev,
        [appId]:
          existing != null
            ? { ...existing, open: true, minimized: false, z: ++zCounter }
            : defaultWindow(appId, Object.keys(prev).length),
      };
    });
  }, []);

  const closeApp = useCallback((appId: AppId) => {
    setWindows((prev) => {
      const w = prev[appId];
      if (!w) return prev;
      return { ...prev, [appId]: { ...w, open: false } };
    });
  }, []);

  const minimizeApp = useCallback((appId: AppId) => {
    setWindows((prev) => {
      const w = prev[appId];
      if (!w) return prev;
      return { ...prev, [appId]: { ...w, minimized: true } };
    });
  }, []);

  const focusApp = useCallback((appId: AppId) => {
    setWindows((prev) => {
      const w = prev[appId];
      if (!w) return prev;
      return { ...prev, [appId]: { ...w, z: ++zCounter } };
    });
  }, []);

  const moveResize = useCallback(
    (
      appId: AppId,
      rect: { x: number; y: number; width: number; height: number },
    ) => {
      setWindows((prev) => {
        const w = prev[appId];
        if (!w) return prev;
        return { ...prev, [appId]: { ...w, ...rect } };
      });
    },
    [],
  );

  return (
    <WindowManagerContext.Provider
      value={{ windows, openApp, closeApp, minimizeApp, focusApp, moveResize }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}
