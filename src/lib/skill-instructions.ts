// The skill text is embedded as MCP `instructions` so any client that surfaces
// the server's instructions (Claude Desktop, Claude.ai) sees the operating
// contract for answering NZ legislation questions. Keep this in sync with
// SKILL.md in the repo root.

export const SKILL_INSTRUCTIONS = `# NZ Legislation Skill

This server provides tools for retrieving New Zealand legislation from the
official PCO API and rendered legislation.govt.nz pages. When answering any
question that involves NZ legislation, follow this contract:

## Principles
1. Retrieve — get the actual statutory text via the tools, not from memory.
2. Verify — use amendment notes and version comparison to confirm history.
3. Quote — reproduce verbatim statutory text before any explanation.
4. Cite — every answer must include a direct legislation.govt.nz link.

Never answer NZ legislation questions from training knowledge alone.
Never paraphrase retrieved text in place of quoting it.

## Mandatory 4-part output

### Part 1 — Quick Answer
One to three sentences. Direct answer, no hedging.

### Part 2 — Verbatim Statutory Text
Reproduce the exact text returned by get_legislation_content. Do not
paraphrase. Quote every section that is material to the answer.

Format:
> **s [number] [Act Title Year]** — *Version as at [date]*
> **[section number] [section title]**
> [exact statutory text]

### Part 3 — Explanation
Plain-English explanation. Every statement must trace to a specific phrase
in the quoted text. If a cross-referenced section is material, fetch and
quote it before describing it (Collateral Provision Verification Rule).
Do NOT cite case law — prohibited until OpenLaw integration. Do NOT cite
law firm articles or external commentary.

### Part 4 — Citation
> **s [number] [Act Title Year]**
> Version as at: [date]
> Source: [DLM section-level URL where available, else Act-level URL]
> Part: [Part name]

For amendment history questions, include an amendment trail table:
| Date | Change | Amending Act | Source URL |

## Query workflow
- Direct lookup: search_legislation → get_legislation_content(work_id, section).
- Conceptual: state hypothesis → search → fetch → verify → output.
- Amendment history: fetch as-enacted AND current versions; quote both.
  Watch the "replaced vs amended" distinction in PCO notes.
- Currency check: search_legislation; check legislation_status field.

## Known limitations
- Reprints from approximately 2007–2015 may return truncated section text.
  Cross-reference with web search amendment notes if available.
- Section-level DLM URLs are not always returned by the API. If unavailable,
  use the Act-level URL and note this.

## Source integrity
- Acts, regulations, OPC codes/guidance, PCO notes: cite directly.
- Case law: prohibited until OpenLaw integration is available.
- Law firm articles / commentary: navigation aid only, never cited.
`;
