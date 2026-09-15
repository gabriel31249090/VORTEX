const PUBLIC_EXACT_PATHS = new Set([
  '/', '/login', '/register', '/pricing', '/faq', '/termos', '/privacidade',
])
const PUBLIC_PREFIXES = ['/auth/']
export function isPublicPath(pathname: string) {
  return PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
