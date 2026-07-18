export function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function getMondayOfWeek(d) {
  const r = new Date(d);
  const dow = r.getDay();
  r.setDate(r.getDate() + (dow === 0 ? -6 : 1 - dow));
  r.setHours(0, 0, 0, 0);
  return r;
}

export function getMonthCells(year, month) {
  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay();
  return Array.from(
    { length: 42 },
    (_, i) => new Date(year, month, 1 - offset + i),
  );
}

export function fmtShort(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
