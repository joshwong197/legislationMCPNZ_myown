import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/base-url";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const base = getBaseUrl(req);
  return NextResponse.json({
    resource: `${base}/api/mcp/mcp`,
    authorization_servers: [base],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
  });
}
