"use client";

export function Placeholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm text-[#A0A0B8]">{phase}</p>
    </div>
  );
}
