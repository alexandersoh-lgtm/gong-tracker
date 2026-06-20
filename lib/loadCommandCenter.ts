import ccData from "@/data/command-center.json";
import { searchJira } from "@/lib/jira";
import { assessWave, type WaveConfig, type WaveAssessment, type RiskThresholds } from "@/lib/risk";

export const ccConfig = ccData.config;
export const WAVE_ACCENTS = ["#2347e8", "#7c3aed", "#0d9488"];

const thresholds: RiskThresholds = {
  dueSoonDays: ccData.config.dueSoonDays,
  stalledDays: ccData.config.stalledDays,
};

// Shared loader: fetches + assesses every wave once. Used by all Command Center tabs.
export async function loadCommandCenter(): Promise<{ assessments: WaveAssessment[]; today: Date }> {
  const waves = ccData.waves as unknown as WaveConfig[];
  const today = new Date();
  const assessments = await Promise.all(
    waves.map(async (w) => assessWave(w, await searchJira(w.jql), thresholds, today))
  );
  return { assessments, today };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
export function daysTo(iso: string, today: Date): number {
  const a = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const t = new Date(iso);
  return Math.round((Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - a) / 86_400_000);
}
export function tMinus(days: number): string {
  return days < 0 ? `${Math.abs(days)}d ago` : `T−${days}d`;
}
