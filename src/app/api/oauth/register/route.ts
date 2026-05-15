import { NextResponse } from "next/server";
import { issueClientId } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// RFC 7591 — Dynamic Client Registration.
// We don't persist anything; the client_id is a signed JWT containing the
// registered redirect_uris, so it can be statelessly validated on /authorize.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris is required" },
      { status: 400 },
    );
  }
  const uris = redirectUris.filter((u): u is string => typeof u === "string");
  if (uris.length === 0) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const clientId = await issueClientId(uris);
  console.log("[oauth/register]", { redirect_uris: uris });

  return NextResponse.json({
    client_id: clientId,
    redirect_uris: uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
}
