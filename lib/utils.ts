export function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$2-$3-$1");
}
