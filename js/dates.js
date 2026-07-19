// js/dates.js — date/time helpers. Timeline delays are hour-based, so we
// work with real timestamps (ISO strings), not just YYYY-MM-DD.

export function nowIso() {
  return new Date().toISOString();
}

export function addHours(isoOrNull, hours) {
  const base = isoOrNull ? new Date(isoOrNull) : new Date();
  base.setTime(base.getTime() + hours * 60 * 60 * 1000);
  return base.toISOString();
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Human "in 3h" / "2d overdue" style label for next-action dates. */
export function relativeLabel(iso) {
  if (!iso) return "—";
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const hours = Math.round(abs / (60 * 60 * 1000));
  const days = Math.round(abs / (24 * 60 * 60 * 1000));

  if (diffMs <= 0) {
    if (hours < 24) return hours <= 1 ? "Due now" : `${hours}h overdue`;
    return `${days}d overdue`;
  }
  if (hours < 24) return `in ${hours}h`;
  return `in ${days}d`;
}

export function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}
