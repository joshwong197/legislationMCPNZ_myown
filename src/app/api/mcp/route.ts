import { NextResponse } from "next/server";

// Convenience redirect: bare /api/mcp → streamable HTTP endpoint /api/mcp/mcp
export function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/api/mcp/mcp";
  return NextResponse.redirect(url, 307);
}

export const POST = GET;
