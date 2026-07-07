"use client";

import dynamic from "next/dynamic";

// OS Shell là client-only (localStorage, kéo thả) — tắt SSR
const ShellRoot = dynamic(
  () => import("@/shell/desktop").then((m) => m.ShellRoot),
  { ssr: false },
);

export default function PlatformPage() {
  return <ShellRoot />;
}
