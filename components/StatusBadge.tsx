"use client";
import { RAGStatus } from "@/app/types";

const configs: Record<string, { label: string; classes: string; dot: string }> = {
  green: { label: "On Track", classes: "bg-emerald-900/40 text-emerald-300 border border-emerald-700", dot: "bg-emerald-400" },
  yellow: { label: "At Risk", classes: "bg-amber-900/40 text-amber-300 border border-amber-700", dot: "bg-amber-400" },
  red: { label: "Off Track", classes: "bg-red-900/40 text-red-300 border border-red-700", dot: "bg-red-400" },
  complete: { label: "Complete", classes: "bg-emerald-900/40 text-emerald-300 border border-emerald-700", dot: "bg-emerald-400" },
  in_progress: { label: "In Progress", classes: "bg-blue-900/40 text-blue-300 border border-blue-700", dot: "bg-blue-400" },
  not_started: { label: "Not Started", classes: "bg-slate-800/60 text-slate-400 border border-slate-600", dot: "bg-slate-500" },
};

export default function StatusBadge({ status, size = "sm" }: { status: RAGStatus | string; size?: "xs" | "sm" | "md" }) {
  const cfg = configs[status] ?? configs.not_started;
  const textSize = size === "xs" ? "text-xs" : size === "md" ? "text-sm" : "text-xs";
  const padding = size === "xs" ? "px-1.5 py-0.5" : size === "md" ? "px-3 py-1" : "px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${textSize} ${padding} ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
