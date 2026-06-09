import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

// ---------------------------------------------------------------------------
// Secret management
// ---------------------------------------------------------------------------

function getSecret(): Uint8Array {
  const raw = process.env.OAUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "OAUTH_SECRET environment variable must be set to a random string of at least 32 characters.",
    );
  }
  return new TextEncoder().encode(raw);
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

type CodePayload = {
  type: "code";
  user: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: "S256" | "plain";
};

type AccessPayload = {
  type: "access";
  user: string;
  client_id: string;
};

type ClientPayload = {
  type: "client";
  redirect_uris: string[];
};

async function signJwt(payload: object, expiresIn: string): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

async function verifyJwt<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Client registration tokens
// ---------------------------------------------------------------------------

export async function issueClientId(redirectUris: string[]): Promise<string> {
  return await signJwt({ type: "client", redirect_uris: redirectUris } satisfies ClientPayload, "30d");
}

export async function verifyClientId(
  clientId: string,
  redirectUri: string,
): Promise<{ valid: boolean }> {
  const payload = await verifyJwt<ClientPayload>(clientId);
  if (!payload || payload.type !== "client") return { valid: false };
  if (!payload.redirect_uris.includes(redirectUri)) return { valid: false };
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Authorization codes
// ---------------------------------------------------------------------------

export async function issueAuthCode(input: Omit<CodePayload, "type">): Promise<string> {
  return await signJwt({ type: "code", ...input } satisfies CodePayload, "60s");
}

export async function verifyAuthCode(
  code: string,
  expectedClientId: string,
  expectedRedirectUri: string,
  codeVerifier: string,
): Promise<{ valid: boolean; user?: string; reason?: string }> {
  const payload = await verifyJwt<CodePayload>(code);
  if (!payload || payload.type !== "code") return { valid: false, reason: "invalid_code" };
  if (payload.client_id !== expectedClientId) return { valid: false, reason: "client_mismatch" };
  if (payload.redirect_uri !== expectedRedirectUri) return { valid: false, reason: "redirect_mismatch" };

  // PKCE verification
  if (payload.code_challenge_method === "S256") {
    const hash = createHash("sha256").update(codeVerifier).digest();
    const expected = hash.toString("base64url");
    if (!safeStrEqual(expected, payload.code_challenge)) {
      return { valid: false, reason: "pkce_mismatch" };
    }
  } else if (payload.code_challenge_method === "plain") {
    if (!safeStrEqual(codeVerifier, payload.code_challenge)) {
      return { valid: false, reason: "pkce_mismatch" };
    }
  }

  return { valid: true, user: payload.user };
}

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

export async function issueAccessToken(user: string, clientId: string): Promise<string> {
  return await signJwt(
    { type: "access", user, client_id: clientId } satisfies AccessPayload,
    "30d",
  );
}

export async function verifyAccessToken(token: string): Promise<{ user: string } | null> {
  const payload = await verifyJwt<AccessPayload>(token);
  if (!payload || payload.type !== "access") return null;
  return { user: payload.user };
}

// ---------------------------------------------------------------------------
// Credential check (used by /authorize POST)
// ---------------------------------------------------------------------------

function safeStrEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Build the effective {username: password} map from both configuration sources:
 *   - the single MCP_USER / MCP_PASS pair (legacy, single-user), and
 *   - the MCP_USERS_JSON object (multi-user).
 * The two are merged; on a username clash the JSON map wins. If neither is
 * configured the map is empty (and every login is denied — fail closed).
 * Malformed MCP_USERS_JSON is ignored, falling back to the single pair.
 */
function buildUserMap(): Map<string, string> {
  const map = new Map<string, string>();

  // Single pair first, so the JSON map can override it on a clash.
  const singleUser = process.env.MCP_USER;
  const singlePass = process.env.MCP_PASS;
  if (singleUser && singlePass) {
    map.set(singleUser, singlePass);
  }

  // Multi-user JSON map.
  const raw = process.env.MCP_USERS_JSON;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [name, password] of Object.entries(parsed as Record<string, unknown>)) {
          if (name.length > 0 && typeof password === "string" && password.length > 0) {
            map.set(name, password); // JSON map wins any clash with the single pair
          }
        }
      }
    } catch {
      // Malformed MCP_USERS_JSON — ignore it and fall back to the single pair.
    }
  }

  return map;
}

export function checkCredentials(user: string, pass: string): boolean {
  const users = buildUserMap();
  const expectedPass = users.get(user);

  // Always run the constant-time compare, even for an unknown username
  // (against an empty dummy value), so a missing username is not
  // distinguishable from a wrong password by timing.
  const passMatch = safeStrEqual(pass, expectedPass ?? "");

  // Fail closed: empty/unconfigured map => expectedPass is undefined => denied.
  return expectedPass !== undefined && passMatch;
}

// ---------------------------------------------------------------------------
// CSRF token for the login form
// ---------------------------------------------------------------------------

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
