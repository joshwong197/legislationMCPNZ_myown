const BASE_URL = "https://api.legislation.govt.nz";

type RateLimitState = {
  limit: number | null;
  remaining: number | null;
  resetAt: number | null;
};

const rateLimit: RateLimitState = { limit: null, remaining: null, resetAt: null };

export function rateLimitFooter(): string {
  if (rateLimit.remaining !== null && rateLimit.limit !== null) {
    return `\n\n[Rate limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining]`;
  }
  return "";
}

export class ApiError extends Error {}

function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") sp.append(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function apiRequest(
  path: string,
  params: Record<string, unknown> = {},
  options: { expectXml?: boolean } = {},
): Promise<unknown> {
  const apiKey = process.env.NZ_LEGISLATION_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      "NZ_LEGISLATION_API_KEY environment variable is not set on the server.",
    );
  }

  if (
    rateLimit.remaining !== null &&
    rateLimit.remaining <= 0 &&
    rateLimit.resetAt !== null &&
    Date.now() / 1000 < rateLimit.resetAt
  ) {
    const resetUtc = new Date(rateLimit.resetAt * 1000).toISOString();
    throw new ApiError(
      `Daily rate limit exhausted. Resets at ${resetUtc}. Please try again after that time.`,
    );
  }

  const url = `${BASE_URL}${path}${buildQuery(params)}`;
  const headers: Record<string, string> = {
    "X-Api-Key": apiKey,
    Accept: options.expectXml ? "application/xml" : "application/json",
  };

  let resp: Response;
  try {
    resp = await fetch(url, { headers });
  } catch (err) {
    throw new ApiError(`Network error connecting to NZ Legislation API: ${(err as Error).message}`);
  }

  for (const [header, key] of [
    ["X-RateLimit-Limit", "limit"],
    ["X-RateLimit-Remaining", "remaining"],
    ["X-RateLimit-Reset", "resetAt"],
  ] as const) {
    const val = resp.headers.get(header);
    if (val !== null) {
      const n = Number.parseInt(val, 10);
      if (!Number.isNaN(n)) rateLimit[key] = n;
    }
  }

  if (resp.status === 401) {
    throw new ApiError("Authentication failed (401). Check that NZ_LEGISLATION_API_KEY is correct.");
  }
  if (resp.status === 403) {
    throw new ApiError(
      "Request blocked (403) — burst rate limit exceeded (max 2,000 requests per 5 minutes). Wait a few minutes and try again.",
    );
  }
  if (resp.status === 404) {
    throw new ApiError(
      "Not found (404). The requested legislation or version does not exist.",
    );
  }
  if (resp.status === 429) {
    const retryAfter = resp.headers.get("Retry-After") ?? "unknown";
    const resetStr = rateLimit.resetAt
      ? ` Resets at ${new Date(rateLimit.resetAt * 1000).toISOString()}.`
      : "";
    throw new ApiError(`Daily rate limit exceeded (429).${resetStr} Retry after ${retryAfter} seconds.`);
  }
  if (resp.status >= 400) {
    const body = (await resp.text()).slice(0, 200);
    throw new ApiError(`API returned status ${resp.status}: ${body}`);
  }

  if (options.expectXml) return await resp.text();
  return await resp.json();
}

export type RssItem = { title: string; link: string; description: string; pubDate: string };

export function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const field = (block: string, tag: string): string => {
    const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
    if (!m) return "";
    let v = m[1].trim();
    const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(v);
    if (cdata) v = cdata[1];
    return v.trim();
  };
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      title: field(block, "title"),
      link: field(block, "link"),
      description: field(block, "description"),
      pubDate: field(block, "pubDate"),
    });
  }
  return items;
}
