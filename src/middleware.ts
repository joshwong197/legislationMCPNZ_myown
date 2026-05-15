import { NextResponse, type NextRequest } from "next/server";

// Claude.ai is a browser-based client, so it makes cross-origin requests
// from claude.ai to this server. Without CORS, the browser silently drops
// responses (including the WWW-Authenticate header that bootstraps OAuth),
// and from Claude's perspective the server "can't be reached."
//
// We expose CORS broadly because all routes guarded by this middleware are
// either public discovery docs, public OAuth endpoints, or already gated by
// bearer-token auth.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, X-Requested-With",
  "Access-Control-Expose-Headers":
    "WWW-Authenticate, MCP-Protocol-Version, MCP-Session-Id",
  "Access-Control-Max-Age": "86400",
};

function applyCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }
  return applyCors(NextResponse.next());
}

export const config = {
  matcher: [
    "/api/:path*",
    "/.well-known/:path*",
  ],
};
