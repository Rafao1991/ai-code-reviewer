/** Demo: Long transform pipeline — extract steps */
export function transformInput(raw: string): unknown {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const noExtraSpaces = lower.replace(/\s+/g, ' ');
  const parts = noExtraSpaces.split(' ');
  const filtered = parts.filter((p) => p.length > 1);
  const mapped = filtered.map((p) => p.replace(/[^a-z0-9]/g, ''));
  const deduped = [...new Set(mapped)];
  const sorted = deduped.sort();
  const joined = sorted.join('-');
  const prefixed = `out_${joined}`;
  const suffixed = `${prefixed}_v1`;
  return JSON.parse(JSON.stringify({ value: suffixed }));
}
