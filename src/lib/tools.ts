import { z } from "zod";
import { apiRequest, ApiError, parseRssXml, rateLimitFooter } from "./api-client";
import {
  ACT_CLASSIFICATIONS, ACT_STATUSES, ACT_TYPES, BILL_STATUSES, BILL_TYPES,
  INSTRUMENT_CLASSIFICATIONS, INSTRUMENT_STATUSES, INSTRUMENT_TYPE_GROUPS,
  LEGISLATION_STATUSES, LEGISLATION_TYPES, PUBLISHERS, RSS_SEARCH_FIELDS,
  SEARCH_FIELDS, SORT_BY_OPTIONS, VERSION_SORT,
} from "./enums";
import {
  countSections, extractPartContent, extractText, extractTitleAndVersion,
  fetchLegislationHtml, findPart, findSection, findSectionContext,
  loadHtml, MAX_CONTENT_WORDS, parseToc, truncateByWords, workIdToUrlFlexible,
} from "./html-parser";

type ToolResult = { content: { type: "text"; text: string }[] };
const textResult = (text: string): ToolResult => ({ content: [{ type: "text", text }] });

// ---------------------------------------------------------------------------
// search_legislation
// ---------------------------------------------------------------------------

export const searchLegislationSchema = {
  search_term: z.string().optional().describe("ElasticSearch simple query string. Stemming is on by default; wrap in quotes to disable."),
  search_field: z.enum(SEARCH_FIELDS).optional().describe("Search in title or full content."),
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
  legislation_status: z.enum(LEGISLATION_STATUSES).optional(),
  legislation_type: z.enum(LEGISLATION_TYPES).optional(),
  act_type: z.enum(ACT_TYPES).optional(),
  act_classification: z.enum(ACT_CLASSIFICATIONS).optional(),
  act_status: z.enum(ACT_STATUSES).optional(),
  instrument_type_group: z.enum(INSTRUMENT_TYPE_GROUPS).optional(),
  instrument_status: z.enum(INSTRUMENT_STATUSES).optional(),
  instrument_classification: z.enum(INSTRUMENT_CLASSIFICATIONS).optional(),
  bill_type: z.enum(BILL_TYPES).optional(),
  bill_status: z.enum(BILL_STATUSES).optional(),
  administering_agencies: z.string().optional().describe("Exact agency name as on legislation.govt.nz/browse/agencies"),
  sort_by: z.enum(SORT_BY_OPTIONS).optional(),
  publisher: z.enum(PUBLISHERS).optional(),
};

export async function searchLegislation(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    const data = await apiRequest("/v0/works/", args) as Record<string, unknown>;
    const total = (data.total as number) ?? 0;
    if (total === 0) return textResult("No results found for the given search criteria." + rateLimitFooter());
    const page = (data.page as number) ?? 1;
    const perPage = (data.per_page as number) ?? 20;
    const totalPages = Math.ceil(total / perPage);
    const header = `Found ${total} result(s) (page ${page} of ${totalPages}).\n\n`;
    return textResult(header + JSON.stringify(data.results, null, 2) + rateLimitFooter());
  } catch (err) {
    if (err instanceof ApiError) return textResult(`Error: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// get_work_versions
// ---------------------------------------------------------------------------

export const getWorkVersionsSchema = {
  work_id: z.string().min(1).describe("e.g. 'act_public_2020_031'"),
  sort: z.enum(VERSION_SORT).optional(),
};

export async function getWorkVersions(args: { work_id: string; sort?: string }): Promise<ToolResult> {
  try {
    const data = await apiRequest(
      `/v0/works/${encodeURIComponent(args.work_id)}/versions/`,
      { sort: args.sort },
    ) as Record<string, unknown>;
    const total = (data.total as number) ?? 0;
    if (total === 0) return textResult(`No versions found for work '${args.work_id}'.` + rateLimitFooter());
    const page = (data.page as number) ?? 1;
    const perPage = (data.per_page as number) ?? 20;
    const totalPages = Math.ceil(total / perPage);
    const header = `Found ${total} version(s) of '${args.work_id}' (page ${page} of ${totalPages}).\n\n`;
    return textResult(header + JSON.stringify(data.results, null, 2) + rateLimitFooter());
  } catch (err) {
    if (err instanceof ApiError) return textResult(`Error: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// get_version_details
// ---------------------------------------------------------------------------

export const getVersionDetailsSchema = {
  version_id: z.string().min(1).describe("e.g. 'act_public_2020_031_en_2025-11-27'"),
};

export async function getVersionDetails(args: { version_id: string }): Promise<ToolResult> {
  try {
    const data = await apiRequest(`/v0/versions/${encodeURIComponent(args.version_id)}/`) as Record<string, unknown>;
    return textResult(JSON.stringify(data, null, 2) + rateLimitFooter());
  } catch (err) {
    if (err instanceof ApiError) return textResult(`Error: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// search_legislation_rss
// ---------------------------------------------------------------------------

export const searchLegislationRssSchema = {
  search_term: z.string().optional(),
  search_field: z.enum(RSS_SEARCH_FIELDS).optional().describe("Note: uses 'fulltext' here, not 'content'."),
  legislation_status: z.enum(LEGISLATION_STATUSES).optional(),
  legislation_type: z.enum(LEGISLATION_TYPES).optional(),
};

export async function searchLegislationRss(args: Record<string, unknown>): Promise<ToolResult> {
  try {
    const xml = await apiRequest("/api/rss/search/", args, { expectXml: true }) as string;
    const items = parseRssXml(xml);
    if (items.length === 0) return textResult("No results found." + rateLimitFooter());
    return textResult(`Found ${items.length} result(s) from RSS search.\n\n` + JSON.stringify(items, null, 2) + rateLimitFooter());
  } catch (err) {
    if (err instanceof ApiError) return textResult(`Error: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// get_legislation_content
// ---------------------------------------------------------------------------

export const getLegislationContentSchema = {
  url: z.string().optional().describe("Direct URL to the legislation page."),
  work_id: z.string().optional().describe("Work ID, e.g. 'act_public_2020_031'."),
  section: z.union([z.string(), z.number()]).optional().describe("Section number to fetch, e.g. '22'."),
  part: z.union([z.string(), z.number()]).optional().describe("Part number to fetch, e.g. '6'."),
};

export async function getLegislationContent(args: {
  url?: string; work_id?: string; section?: string | number; part?: string | number;
}): Promise<ToolResult> {
  const section = args.section !== undefined ? String(args.section) : undefined;
  const part = args.part !== undefined ? String(args.part) : undefined;

  if (!args.url && !args.work_id) {
    return textResult(JSON.stringify({ error: "Either 'url' or 'work_id' must be provided." }));
  }

  let targetUrl: string;
  try {
    targetUrl = args.url ?? workIdToUrlFlexible(args.work_id!);
  } catch (err) {
    return textResult(JSON.stringify({ error: (err as Error).message }));
  }

  let html: string;
  let finalUrl: string;
  let upstreamStatus: number;
  let upstreamContentType: string;
  try {
    ({ html, finalUrl, status: upstreamStatus, contentType: upstreamContentType } =
      await fetchLegislationHtml(targetUrl));
  } catch (err) {
    return textResult(JSON.stringify({ error: (err as Error).message }));
  }

  const $ = loadHtml(html);
  const { title, version } = extractTitleAndVersion($);

  const legislationDiv = $("div#legislation").first();
  if (!legislationDiv.length) {
    return textResult(JSON.stringify({
      error: "Could not parse the legislation page. The website structure may have changed.",
      url: finalUrl,
      debug: {
        upstream_status: upstreamStatus,
        upstream_content_type: upstreamContentType,
        html_bytes: html.length,
        has_id_legislation_literal: html.includes('id="legislation"'),
        has_body_class_literal: html.includes('class="body"'),
        h1_text: $("h1").first().text().slice(0, 120),
        title_text: $("title").first().text().slice(0, 120),
        first_400_chars: html.slice(0, 400),
      },
    }));
  }
  const bodyMaybe = legislationDiv.find("div.body").first();
  const body = bodyMaybe.length ? bodyMaybe : legislationDiv;
  const totalSections = countSections(body);

  if (section) {
    const sectionEl = findSection($, body, section);
    if (!sectionEl) {
      return textResult(JSON.stringify({
        error: `Section ${section} not found in ${title || "this legislation"}.`,
        total_sections: totalSections,
        url: finalUrl,
      }));
    }
    const context = findSectionContext(sectionEl);
    const sectionHeading = sectionEl.find("h5.prov").first();
    let sectionTitle = "";
    if (sectionHeading.length) {
      const label = sectionHeading.find("span.label").first().text().trim();
      sectionTitle = sectionHeading.text().trim();
      if (label && sectionTitle.startsWith(label)) {
        sectionTitle = sectionTitle.slice(label.length).trim();
      }
    }
    const text = extractText($, sectionEl, 0);
    const result: Record<string, unknown> = {
      title, version, url: finalUrl,
      requested: `section ${section}`,
      content: {
        section_number: section,
        section_title: sectionTitle,
        text,
        ...(context.part ? { part: context.part } : {}),
        ...(context.subpart ? { subpart: context.subpart } : {}),
      },
      note: `Showing section ${section} of ${totalSections} sections in ${title}`,
    };
    return textResult(JSON.stringify(result, null, 2));
  }

  if (part) {
    const partEl = findPart($, body, part);
    if (!partEl) {
      return textResult(JSON.stringify({
        error: `Part ${part} not found in ${title || "this legislation"}.`,
        url: finalUrl,
      }));
    }
    const { text, sectionCount } = extractPartContent($, partEl);
    const { text: clipped, truncated } = truncateByWords(text, MAX_CONTENT_WORDS);
    const result: Record<string, unknown> = {
      title, version, url: finalUrl,
      requested: `Part ${part}`,
      content: clipped,
      sections_in_part: sectionCount,
      ...(truncated
        ? {
            note: `Content was truncated to ~${MAX_CONTENT_WORDS} words. Part ${part} contains ${sectionCount} sections. Use the 'section' parameter to retrieve specific sections.`,
          }
        : {}),
    };
    return textResult(JSON.stringify(result, null, 2));
  }

  // TOC + preview
  const tocParts = parseToc($);
  const previewSections: string[] = [];
  body.find("div.prov").slice(0, 3).each((_, prov) => {
    previewSections.push(extractText($, $(prov), 0));
  });

  const result: Record<string, unknown> = {
    title, version, url: finalUrl,
    content_type: "table_of_contents",
    total_sections: totalSections,
    parts: tocParts,
    ...(previewSections.length ? { preview: previewSections.join("\n\n") } : {}),
    note: "Use the 'section' or 'part' parameter to retrieve specific content.",
  };
  return textResult(JSON.stringify(result, null, 2));
}
