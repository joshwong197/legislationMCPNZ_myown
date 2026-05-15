/**
 * Derive the canonical base URL of this server. Used to populate OAuth
 * metadata documents and redirect URLs.
 *
 * On Vercel the deployment URL is exposed via VERCEL_URL (without scheme).
 * For local dev, fall back to the incoming request's host header.
 */
export function getBaseUrl(req: Request): string {
  const envUrl = process.env.OAUTH_ISSUER ?? process.env.NEXTAUTH_URL ?? null;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
