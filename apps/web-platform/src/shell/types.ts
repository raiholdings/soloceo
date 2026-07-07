export type AppId =
  | "overview"
  | "store"
  | "ai"
  | "clawhub"
  | "automation"
  | "revenue"
  | "community"
  | "marketplace"
  | "settings";

export interface WindowState {
  appId: AppId;
  open: boolean;
  minimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}

export type WindowsState = Partial<Record<AppId, WindowState>>;
