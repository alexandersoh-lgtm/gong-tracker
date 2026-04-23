"use client";

export default function ProgressBar({ percent, color = "indigo" }: { percent: number; color?: "indigo" | "emerald" | "amber" | "blue" }) {
  const track = "bg-slate-100 dark:bg-white/5";
  const fills = {
    indigo:  "bg-gradient-to-r from-indigo-500 to-violet-500",
    emerald: "bg-gradient-to-r from-emerald-400 to-teal-500",
    amber:   "bg-gradient-to-r from-amber-400 to-orange-500",
    blue:    "bg-gradient-to-r from-blue-400 to-indigo-500",
  };
  return (
    <div className={`w-full ${track} rounded-full h-1.5 overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${fills[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
