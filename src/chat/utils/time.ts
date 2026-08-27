const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatTimestamp(d: Date) {
  // Format used by the UI: 'YYYY-MM-DD HH:mm:ss'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}:${pad2(d.getSeconds())}`;
}

export function toHHmm(ts: string) {
  const parts = ts.split(" ");
  if (parts.length >= 2) return parts[1].slice(0, 5); // HH:mm
  return ts;
}
