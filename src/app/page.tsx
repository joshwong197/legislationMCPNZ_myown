export default function Home() {
  return (
    <main>
      <h1>NZ Legislation MCP</h1>
      <p>
        Remote MCP server wrapping the New Zealand Legislation API
        (<a href="https://api.legislation.govt.nz">api.legislation.govt.nz</a>),
        intended for use with MCP-compatible AI clients such as Claude Desktop and Claude.ai.
      </p>

      <h2>Endpoint</h2>
      <p>
        Streamable HTTP: <code>/api/mcp/mcp</code><br />
        Legacy SSE: <code>/api/mcp/sse</code>
      </p>

      <h2>Access</h2>
      <p>
        The MCP endpoint is gated by OAuth 2.1. To connect, paste the endpoint URL into your MCP
        client&rsquo;s custom-connector setup — your client will redirect you to a login screen
        hosted here, where you authenticate with a username and password. The upstream PCO API
        key is held server-side and never leaves this server.
      </p>

      <h2>Tools</h2>
      <ul>
        <li><code>search_legislation</code> — search Acts, bills, regulations.</li>
        <li><code>get_work_versions</code> — list versions of a work.</li>
        <li><code>get_version_details</code> — details + format links for one version.</li>
        <li><code>search_legislation_rss</code> — legacy full-text fallback.</li>
        <li><code>get_legislation_content</code> — verbatim section or part text.</li>
      </ul>

      <h2>Privacy</h2>
      <p>
        This server forwards queries to the PCO API and returns the responses. It does not store
        query content, user identity, or credentials. Login credentials are compared to
        environment variables in memory per request; they are never logged or persisted. Bearer
        tokens are stateless signed JWTs &mdash; no database, no token store.
      </p>
    </main>
  );
}
