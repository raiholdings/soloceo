import type { Metadata } from "next";
import { store } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: store.name,
  description: store.slogan,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ ["--accent" as string]: store.accent }}>{children}</body>
    </html>
  );
}
