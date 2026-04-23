"use client";

const configs: Record<string, { label: string; classes: string; dot: string }> = {
  green:       { label: "On Track",    classes: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/20", dot: "bg-emerald-500" },
  yellow:      { label: "At Risk",     classes: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/20",           dot: "bg-amber-500" },
  red:         { label: "Off Track",   classes: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-500/20",                       dot: "bg-red-500" },
  complete:    { label: "Complete",    classes: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/20", dot: "bg-emerald-500" },
  in_progress: { label: "In Progress", classes: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/20",                 dot: "bg-blue-500" },
  not_started: { label: "Not Started", classes: "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-white/10",                   dot: "bg-slate-400 dark:bg-slate-500" },
  open:        { label: "Open",        classes: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-500/20",     dot: "bg-orange-500" },
  cancelled:   { label: "Cancelled",  classes: "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-white/10",                   dot: "bg-slate-400" },
};

export default function StatusBadge({ status, size = "sm" }: { status: string; size?: "xs" | "sm" | "md" }) {
  const cfg = configs[status] ?? configs.not_started;
  const text = size === "md" ? "text-xs" : "text-[11px]";
  const px = size === "md" ? "px-2.5 py-1" : size === "xs" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const dot = size === "xs" ? "w-1 h-1" : "w-1.5 h-1.5";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide ${text} ${px} ${cfg.classes}`}>
      <span className={`rounded-full shrink-0 ${dot} ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
