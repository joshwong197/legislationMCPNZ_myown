import { NextResponse } from "next/server";
import { issueAccessToken, verifyAuthCode } from "@/lib/oauth";

export const dynamic = "force-dynamic";

function errorResponse(error: string, description?: string, status = 400) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  // Token endpoint accepts application/x-www-form-urlencoded per OAuth 2.1.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse("invalid_request", "Body must be form-encoded.");
  }

  const grantType = String(form.get("grant_type") ?? "");
  if (grantType !== "authorization_code") {
    return errorResponse("unsupported_grant_type");
  }

  const code = String(form.get("code") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const codeVerifier = String(form.get("code_verifier") ?? "");

  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return errorResponse("invalid_request", "Missing required parameter.");
  }

  const check = await verifyAuthCode(code, clientId, redirectUri, codeVerifier);
  if (!check.valid || !check.user) {
    return errorResponse("invalid_grant", check.reason);
  }

  const accessToken = await issueAccessToken(check.user, clientId);

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 30 * 24 * 60 * 60,
      scope: "mcp",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
