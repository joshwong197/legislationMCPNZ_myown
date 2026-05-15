import { NextResponse } from "next/server";
import { checkCredentials, issueAuthCode, verifyClientId } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Param validation
// ---------------------------------------------------------------------------

type AuthorizeParams = {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  state: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: "S256" | "plain";
};

function readParams(src: URLSearchParams | FormData): Partial<AuthorizeParams> {
  const get = (k: string): string => {
    const v = src.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    response_type: get("response_type"),
    client_id: get("client_id"),
    redirect_uri: get("redirect_uri"),
    state: get("state"),
    scope: get("scope"),
    code_challenge: get("code_challenge"),
    code_challenge_method: (get("code_challenge_method") || "S256") as "S256" | "plain",
  };
}

async function validateParams(
  p: Partial<AuthorizeParams>,
): Promise<{ ok: true; params: AuthorizeParams } | { ok: false; reason: string }> {
  if (p.response_type !== "code") return { ok: false, reason: "Only response_type=code is supported." };
  if (!p.client_id) return { ok: false, reason: "client_id is required." };
  if (!p.redirect_uri) return { ok: false, reason: "redirect_uri is required." };
  if (!p.code_challenge) return { ok: false, reason: "code_challenge is required (PKCE)." };
  if (p.code_challenge_method !== "S256" && p.code_challenge_method !== "plain") {
    return { ok: false, reason: "Unsupported code_challenge_method." };
  }
  const client = await verifyClientId(p.client_id, p.redirect_uri);
  if (!client.valid) return { ok: false, reason: "Invalid client_id or redirect_uri mismatch." };
  return {
    ok: true,
    params: {
      response_type: p.response_type,
      client_id: p.client_id,
      redirect_uri: p.redirect_uri,
      state: p.state ?? "",
      scope: p.scope ?? "",
      code_challenge: p.code_challenge,
      code_challenge_method: p.code_challenge_method,
    },
  };
}

// ---------------------------------------------------------------------------
// Login form HTML
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

function renderLogin(params: AuthorizeParams, errorMsg?: string): string {
  const hidden = (
    ["response_type", "client_id", "redirect_uri", "state", "scope", "code_challenge", "code_challenge_method"] as const
  )
    .map((k) => `<input type="hidden" name="${k}" value="${escapeHtml(params[k] ?? "")}" />`)
    .join("\n  ");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in — NZ Legislation MCP</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f6f6f7; margin: 0; min-height: 100vh; display: grid; place-items: center; }
    .card { background: white; padding: 2rem 2.5rem; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.08); width: min(380px, 92vw); }
    h1 { font-size: 1.15rem; margin: 0 0 .25rem; }
    p.sub { color: #666; font-size: .9rem; margin: 0 0 1.5rem; }
    label { display: block; font-size: .85rem; color: #333; margin-bottom: .25rem; }
    input[type="text"], input[type="password"] { width: 100%; padding: .55rem .65rem; border: 1px solid #d0d0d4; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
    input:focus { outline: none; border-color: #4a5fd1; box-shadow: 0 0 0 3px rgba(74,95,209,.18); }
    .field { margin-bottom: 1rem; }
    button { width: 100%; padding: .65rem; background: #1a1a1a; color: white; border: 0; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer; }
    button:hover { background: #333; }
    .error { background: #fde8e8; color: #9b1c1c; padding: .55rem .75rem; border-radius: 6px; font-size: .85rem; margin-bottom: 1rem; }
    .footer { margin-top: 1.25rem; font-size: .75rem; color: #888; text-align: center; }
  </style>
</head>
<body>
  <form class="card" method="post" action="/api/oauth/authorize">
    <h1>NZ Legislation MCP</h1>
    <p class="sub">Sign in to authorise this connector.</p>
    ${errorMsg ? `<div class="error">${escapeHtml(errorMsg)}</div>` : ""}
    <div class="field">
      <label for="username">Username</label>
      <input id="username" type="text" name="username" autocomplete="username" autofocus required />
    </div>
    <div class="field">
      <label for="password">Password</label>
      <input id="password" type="password" name="password" autocomplete="current-password" required />
    </div>
    ${hidden}
    <button type="submit">Sign in</button>
    <div class="footer">Authorising client <code>${escapeHtml(params.client_id.slice(0, 12))}…</code></div>
  </form>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// GET — render login form
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = readParams(url.searchParams);
  console.log("[oauth/authorize GET]", {
    client_id_prefix: (params.client_id ?? "").slice(0, 16),
    redirect_uri: params.redirect_uri,
    response_type: params.response_type,
    code_challenge_method: params.code_challenge_method,
  });
  const validation = await validateParams(params);
  if (!validation.ok) {
    console.log("[oauth/authorize GET] validation failed:", validation.reason);
    return new NextResponse(`OAuth error: ${validation.reason}`, { status: 400 });
  }
  return new NextResponse(renderLogin(validation.params), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// ---------------------------------------------------------------------------
// POST — validate credentials and issue auth code
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const form = await req.formData();
  const validation = await validateParams(readParams(form));
  if (!validation.ok) {
    return new NextResponse(`OAuth error: ${validation.reason}`, { status: 400 });
  }
  const params = validation.params;

  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  if (!checkCredentials(username, password)) {
    return new NextResponse(renderLogin(params, "Invalid username or password."), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const code = await issueAuthCode({
    user: username,
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
  });

  const redirect = new URL(params.redirect_uri);
  redirect.searchParams.set("code", code);
  if (params.state) redirect.searchParams.set("state", params.state);
  return NextResponse.redirect(redirect, 302);
}
