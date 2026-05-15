import { createMcpHandler } from "mcp-handler";
import { checkBasicAuth, unauthorizedResponse } from "@/lib/auth";
import { SKILL_INSTRUCTIONS } from "@/lib/skill-instructions";
import {
  searchLegislation, searchLegislationSchema,
  getWorkVersions, getWorkVersionsSchema,
  getVersionDetails, getVersionDetailsSchema,
  searchLegislationRss, searchLegislationRssSchema,
  getLegislationContent, getLegislationContentSchema,
} from "@/lib/tools";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "search_legislation",
      "Search New Zealand legislation. Mirrors the legislation.govt.nz site search. " +
        "Supports ElasticSearch simple query string syntax (stemming on by default; quote terms to disable). " +
        "Filter by legislation type, status, administering agency, etc. Results are paginated.",
      searchLegislationSchema,
      searchLegislation,
    );

    server.tool(
      "get_work_versions",
      "List all versions of a specific piece of NZ legislation. Pass a work_id from search_legislation " +
        "results (e.g. 'act_public_2020_031').",
      getWorkVersionsSchema,
      getWorkVersions,
    );

    server.tool(
      "get_version_details",
      "Get details and format links for a specific version of NZ legislation. " +
        "Pass a version_id (e.g. 'act_public_2020_031_en_2025-11-27').",
      getVersionDetailsSchema,
      getVersionDetails,
    );

    server.tool(
      "search_legislation_rss",
      "Legacy full-text search via the RSS endpoint. Fallback when the main search_legislation " +
        "doesn't surface what you need. Note: search_field here uses 'fulltext' not 'content'.",
      searchLegislationRssSchema,
      searchLegislationRss,
    );

    server.tool(
      "get_legislation_content",
      "Fetch the actual text of NZ legislation from legislation.govt.nz. Returns verbatim section " +
        "or part text. Pass either 'url' or 'work_id'. For a specific section use section='22'; " +
        "for a whole Part use part='6'. With neither, returns the table of contents and a preview. " +
        "Use this whenever you need to quote statutory text — paraphrasing retrieved text is prohibited.",
      getLegislationContentSchema,
      getLegislationContent,
    );
  },
  {
    serverInfo: { name: "nz-legislation", version: "0.1.0" },
    instructions: SKILL_INSTRUCTIONS,
  },
);

async function withAuth(req: Request): Promise<Response> {
  if (!checkBasicAuth(req)) return unauthorizedResponse();
  return handler(req);
}

export { withAuth as GET, withAuth as POST, withAuth as DELETE };
