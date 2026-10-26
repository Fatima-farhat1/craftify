/** Only allow redirects to paths inside this app (prevents open-redirect via ?returnUrl=https://evil.com). */
export function safeReturnUrl(url: string | null | undefined, fallback: string): string {
  return url && url.charAt(0) === '/' && url.charAt(1) !== '/' ? url : fallback;
}
