export function makeToken() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${seg()}-${seg()}-${seg().slice(0, 2)}`;
}

export function buildICS(assignments, members, jobs) {
  const mMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const jMap = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MasterScheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const [dk, dayObj] of Object.entries(assignments)) {
    const [y, mo, d] = dk.split("-");
    const dt = `${y}${mo}${d}`;
    for (const [mid, jids] of Object.entries(dayObj)) {
      const mem = mMap[mid];
      if (!mem) continue;
      for (const jid of jids) {
        const job = jMap[jid];
        if (!job) continue;
        lines.push(
          "BEGIN:VEVENT",
          `UID:${mid}-${jid}-${dk}@ms`,
          `DTSTART;VALUE=DATE:${dt}`,
          `DTEND;VALUE=DATE:${dt}`,
          `SUMMARY:${mem.name} \u2013 ${job.name}`,
          `DESCRIPTION:${job.category} | ${job.mannDays} MD allocated`,
          "END:VEVENT",
        );
      }
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
