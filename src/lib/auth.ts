import { getBaseUrl } from "./base-url";
import { verifyAccessToken } from "./oauth";

export async function checkBearer(req: Request): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice(7).trim();
  if (!token) return false;
  const result = await verifyAccessToken(token);
  return result !== null;
}

export function unauthorizedResponse(req: Request): Response {
  const base = getBaseUrl(req);
  const challenge = [
    `Bearer realm="nz-legislation-mcp"`,
    `resource_metadata="${base}/.well-known/oauth-protected-resource"`,
  ].join(", ");
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": challenge },
  });
}
