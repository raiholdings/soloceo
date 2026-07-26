"use client";
// Thanh tab gộp luồng vận hành: Việc theo lịch → Quy trình → Phê duyệt.
// Dùng chung ở 3 trang; sidebar chỉ còn 1 mục "Việc theo lịch".
import { CalendarClock, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const OPS_TABS = [
  { href: "/workspace/scheduled-tasks", label: "Việc theo lịch", icon: CalendarClock },
  { href: "/workspace/quy-trinh", label: "Quy trình", icon: Workflow },
  { href: "/workspace/phe-duyet", label: "Phê duyệt", icon: ShieldCheck },
];

export function SoloceoOpsTabs() {
  const pathname = usePathname();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-4">
      <div className="flex gap-1 border-b">
        {OPS_TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`-mb-px flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
