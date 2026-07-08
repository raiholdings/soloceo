"use client";

import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import {
  Bot,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Puzzle,
  Settings,
  Store,
  TrendingUp,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { AppId } from "../types";

export interface AppDefinition {
  title: string;
  icon: LucideIcon;
  component: LazyExoticComponent<ComponentType>;
  defaultWidth: number;
  defaultHeight: number;
}

// Mỗi app là 1 window component lazy-load (DoD Giai đoạn 2)
export const APP_REGISTRY: Record<AppId, AppDefinition> = {
  overview: {
    title: "Tổng quan",
    icon: LayoutDashboard,
    component: lazy(() => import("./overview")),
    defaultWidth: 760,
    defaultHeight: 520,
  },
  store: {
    title: "App Store",
    icon: Store,
    component: lazy(() => import("./store")),
    defaultWidth: 820,
    defaultHeight: 560,
  },
  ai: {
    title: "AI Studio",
    icon: Bot,
    component: lazy(() => import("./ai-studio")),
    defaultWidth: 720,
    defaultHeight: 500,
  },
  clawhub: {
    title: "Chợ kỹ năng",
    icon: Puzzle,
    component: lazy(() => import("./clawhub")),
    defaultWidth: 900,
    defaultHeight: 600,
  },
  automation: {
    title: "Automation",
    icon: Workflow,
    component: lazy(() => import("./automation")),
    defaultWidth: 720,
    defaultHeight: 500,
  },
  revenue: {
    title: "Doanh thu",
    icon: Wallet,
    component: lazy(() => import("./revenue")),
    defaultWidth: 820,
    defaultHeight: 560,
  },
  community: {
    title: "Cộng đồng",
    icon: MessageSquare,
    component: lazy(() => import("./community")),
    defaultWidth: 680,
    defaultHeight: 560,
  },
  marketplace: {
    title: "Sàn M&A",
    icon: TrendingUp,
    component: lazy(() => import("./marketplace")),
    defaultWidth: 820,
    defaultHeight: 560,
  },
  domains: {
    title: "Tên miền",
    icon: Globe,
    component: lazy(() => import("./domains")),
    defaultWidth: 760,
    defaultHeight: 560,
  },
  settings: {
    title: "Cài đặt",
    icon: Settings,
    component: lazy(() => import("./settings-app")),
    defaultWidth: 620,
    defaultHeight: 460,
  },
};
