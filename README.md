# NZ Legislation MCP (web)

Remote [MCP](https://modelcontextprotocol.io) server wrapping the [New Zealand Legislation API](https://api.legislation.govt.nz). Built with Next.js + [`mcp-handler`](https://www.npmjs.com/package/mcp-handler), gated by HTTP Basic Auth, and deployable to Vercel in a few minutes.

This is the hosted/HTTP counterpart to the stdio Python server in `../nz-legislation-mcp`.

## What it does

Exposes five MCP tools to an LLM client:

| Tool | Purpose |
|---|---|
| `search_legislation` | Find Acts, bills, regulations by name, type, status, agency, etc. |
| `get_work_versions` | List historical versions of a work. |
| `get_version_details` | Get metadata and format links for one version. |
| `search_legislation_rss` | Legacy full-text fallback search. |
| `get_legislation_content` | Fetch the actual text of a section or Part from legislation.govt.nz. |

The NZ-legislation skill (4-part output: Quick Answer / Verbatim Text / Explanation / Citation) is shipped as MCP `instructions`, so clients that surface server instructions will see the operating contract automatically.

## Architecture

- **Transport:** streamable HTTP at `/api/mcp/mcp`, legacy SSE at `/api/mcp/sse`. The dynamic `[transport]` segment is auto-routed by `mcp-handler`.
- **Auth:** HTTP Basic Auth wrapper checks `Authorization: Basic …` against `MCP_USER` / `MCP_PASS` env vars (timing-safe compare). Configure these in your hosting provider.
- **Upstream API key:** the PCO key (`NZ_LEGISLATION_API_KEY`) is held server-side and never returned to the client. Each upstream request adds it as `X-Api-Key`.
- **Rate limits:** the server tracks PCO's `X-RateLimit-*` response headers and short-circuits when the daily limit is exhausted. PCO's published limit is 10,000 requests/day with a 2,000-per-5-min burst.

## Local development

```bash
cd nz-legislation-mcp-web
npm install
cp .env.example .env.local
# edit .env.local — set NZ_LEGISLATION_API_KEY, MCP_USER, MCP_PASS
npm run dev
```

The server runs at <http://localhost:3000>. The MCP endpoint is at <http://localhost:3000/api/mcp/mcp>.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. Import the repo into Vercel.
3. Set environment variables in the Vercel project:
   - `NZ_LEGISLATION_API_KEY` — your PCO API key.
   - `MCP_USER` — Basic Auth username.
   - `MCP_PASS` — Basic Auth password. Generate with `openssl rand -base64 24`.
4. Deploy. Your endpoint is `https://<your-project>.vercel.app/api/mcp/mcp`.

## Connecting from Claude.ai

In Claude.ai, add a custom connector:

- **URL:** `https://<your-project>.vercel.app/api/mcp/mcp`
- **Auth:** Basic
- **Username:** the value of `MCP_USER`
- **Password:** the value of `MCP_PASS`

Claude stores the credentials in its connector config and sends them as `Authorization: Basic <base64>` on every request. They are not stored by this server.

## Connecting from Claude Desktop

Claude Desktop's custom connector UI similarly supports remote MCP servers with Basic Auth. Add the same URL and credentials.

## Security notes

- The MCP endpoint denies all requests unless `MCP_USER` and `MCP_PASS` are set — there is no "no auth" mode.
- Credentials are compared with `crypto.timingSafeEqual` to avoid timing leaks.
- The PCO API key is never logged or returned in responses.
- All traffic is HTTPS (Vercel terminates TLS).
- Source is auditable. The Basic Auth scheme has no scopes or expiry — rotate the password by changing the env var and redeploying.

## Tools in detail

### `search_legislation`
Mirrors the legislation.govt.nz site search. Optional params include `search_term`, `search_field` (title/content), `legislation_type`, `act_status`, `administering_agencies`, `sort_by`, etc. See `src/lib/tools.ts` for the full schema.

### `get_work_versions(work_id, sort?)`
Returns paginated versions of a work. Use the `work_id` from `search_legislation` results (e.g. `act_public_2020_031`).

### `get_version_details(version_id)`
Returns metadata and format links (HTML / PDF / XML on legislation.govt.nz).

### `search_legislation_rss(...)`
Legacy XML-RSS endpoint. `search_field` enum is `title | fulltext`.

### `get_legislation_content({ url? | work_id? , section?, part? })`
Fetches and parses the actual HTML of a legislation page. If `section` is set, returns the verbatim section text plus Part/Subpart context. If `part` is set, returns the full Part (truncated at ~4000 words). With neither, returns the table of contents and a preview of the first three sections.

## License

MIT.
