/**
 * Derive the canonical base URL of this server. Used to populate OAuth
 * metadata documents and redirect URLs.
 *
 * On Vercel, `new URL(req.url).host` returns the internal deployment-hash
 * hostname, not the project alias the client actually typed. We read the
 * forwarded host header instead, which Vercel sets to the original hostname.
 *
 * OAUTH_ISSUER overrides everything for custom-domain setups.
 */
export function getBaseUrl(req: Request): string {
  const envUrl = process.env.OAUTH_ISSUER;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";

  if (host) return `${forwardedProto}://${host}`;

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
