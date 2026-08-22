export function lineContactUrl(lineId: string): string | null {
  const value = lineId.trim();
  if (!value) return null;

  if (/^https:\/\/(?:line\.me|lin\.ee)\//i.test(value)) return value;
  if (!/^@?[A-Za-z0-9._-]+$/.test(value)) return null;

  const pathId = value.startsWith("@") ? value : `~${value}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(pathId)}`;
}
