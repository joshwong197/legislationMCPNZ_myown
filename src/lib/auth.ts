import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function checkBasicAuth(req: Request): boolean {
  const expectedUser = process.env.MCP_USER;
  const expectedPass = process.env.MCP_PASS;
  if (!expectedUser || !expectedPass) {
    // If credentials aren't configured, deny by default — prevents accidental
    // public exposure if the env vars were never set.
    return false;
  }
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return false;
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  return safeEqual(user, expectedUser) && safeEqual(pass, expectedPass);
}

export function unauthorizedResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="nz-legislation-mcp"' },
  });
}
