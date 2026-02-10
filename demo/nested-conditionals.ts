/** Demo: Deep nesting — flatten with early returns or extract */
export function evaluateAccess(
  user: { role?: string; premium?: boolean },
  resource: { public?: boolean; tier?: number }
): boolean {
  if (user) {
    if (user.role === 'admin') {
      return true;
    }
    if (user.role === 'user') {
      if (resource.public) {
        return true;
      }
      if (user.premium && resource.tier) {
        if (resource.tier <= 2) {
          return true;
        }
      }
      return false;
    }
  }
  return !!resource.public;
}
