/**
 * Derive the canonical base URL of this server. Used to populate OAuth
 * metadata documents and redirect URLs.
 *
 * We use the incoming request's host so the issuer always matches whatever
 * hostname the client is actually connecting through (project alias, custom
 * domain, or per-deployment hash URL). Vercel's `VERCEL_URL` env var points
 * at the deployment-hash URL even when the client used the project alias, so
 * we deliberately do not read it.
 *
 * OAUTH_ISSUER can still be set to pin a canonical hostname when fronted by
 * a CDN that rewrites the Host header.
 */
export function getBaseUrl(req: Request): string {
  const envUrl = process.env.OAUTH_ISSUER;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
