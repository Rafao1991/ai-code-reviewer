/** Demo: Complex config parser — high cyclomatic complexity */
export function parseEnv(key: string): string | number | boolean {
  const val = process.env[key];
  if (!val) return '';
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === '0') return 0;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (/^\d+\.\d+$/.test(val)) return parseFloat(val);
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
  return val;
}
