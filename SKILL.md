---
name: nz-legislation
description: >
  Use this skill whenever the user asks any question involving New Zealand legislation,
  statute, Acts of Parliament, or regulatory law. Triggers include: looking up a specific
  section of an Act ("what does s 60 Companies Act say"), conceptual legal questions
  ("can creditors apply to court for director duty breaches"), amendment history questions
  ("when did the voidable preference period change"), currency checks ("is this Act still
  in force"), or any question that requires grounding an answer in actual NZ statutory
  text. Also trigger when the user asks to cite legislation, verify a legal claim against
  statute, or trace how a provision has changed over time. This skill MUST be used for
  any NZ law question — do not answer from memory alone. Always retrieve, always cite.
---

# NZ Legislation Skill

## Overview

This skill governs how to answer questions involving New Zealand legislation using the
`nz-legislation` MCP tools in combination with web search. The goal is always:

1. **Retrieve** — get the actual statutory text from PCO, not from memory
2. **Verify** — use amendment notes and version comparison to confirm history
3. **Quote** — reproduce verbatim statutory text before any explanation
4. **Cite** — every answer must include a direct legislation.govt.nz link at section level

Never answer NZ legislation questions from training knowledge alone. Always use the tools.
Never paraphrase retrieved text in place of quoting it. Retrieval without verbatim quotation
is not retrieval for the purposes of this skill.

---

## Available Tools

| Tool | Purpose |
|---|---|
| `nz-legislation:search_legislation` | Find an Act by name, type, status, administering agency |
| `nz-legislation:get_legislation_content` | Fetch section/part text by work_id or URL |
| `nz-legislation:get_work_versions` | List all historical versions of an Act (dates + URLs) |
| `nz-legislation:get_version_details` | Get metadata + citation URLs for a specific version |
| `nz-legislation:search_legislation_rss` | Legacy full-text fallback search |
| `web_search` | Find PCO amendment history notes, validate dates, find amending Acts, retrieve DLM section anchors |

---

## Mandatory Output Format

Every answer to a NZ legislation question must follow this four-part structure, in order.
No part may be skipped. No part may be merged with another.

---

### Part 1 — Quick Answer

One to three sentences. State the direct answer to the question plainly.
No hedging, no "it depends" without specifying depends on what.
If the answer genuinely turns on facts, state which facts and what each outcome is.

Example:
> A director is personally liable for the company's tax obligations under s HD 15 of the
> Income Tax Act 2007 where an arrangement has been entered into that has the effect of
> leaving the company unable to meet a tax liability, and a purpose of that arrangement
> was to produce that effect.

---

### Part 2 — Verbatim Statutory Text

Reproduce the **exact text** of every section that is the primary basis for the answer,
as returned by `get_legislation_content`. Do not paraphrase. Do not summarise.
Do not restructure. Quote the full section including all subsections, paragraphs, and
lettered items, formatted as close to the PCO layout as possible.

**Format:**

> **s [number] [Act Title Year]** — *Version as at [date]*
>
> **[section number] [section title]**
>
> [exact statutory text as returned by get_legislation_content]

If the answer relies on multiple sections, quote each one in full under its own heading.

**This part is not optional.** If you did not retrieve the text via MCP, you cannot quote it.
If you cannot quote it, you cannot complete Part 2. If you cannot complete Part 2, go back
and fetch the section before proceeding.

**Do not conflate Part 2 and Part 3.** Explanation belongs in Part 3. Part 2 is text only.

---

### Part 3 — Explanation

After the verbatim text, explain what it means in plain English. Apply it to the user's
specific question. Identify the key operative phrases in the quoted text and explain
their legal significance. Note any limitations, exceptions, or adjacent provisions the
user should be aware of.

**Output checkpoint:** Every statement in Part 3 must be traceable to a specific word or
phrase in the text quoted in Part 2. If you find yourself stating something that is not
in the quoted text — for example, characterising a cross-referenced provision — stop.
Either fetch that provision and quote it (treating it as an additional Part 2 block),
or cut the statement. Do not characterise provisions that have not been retrieved and quoted.

If the explanation would require characterising a provision you have not fetched,
add a note: *"Section [X] is referenced here but has not been retrieved in this session —
fetch separately to confirm its effect."* Never silently characterise an unfetched provision.

**Case law prohibition:** Do not reference, name, or rely on any case law in Part 3.
This prohibition is absolute until the OpenLaw API is integrated. See Source Integrity Rules.

---

### Part 4 — Citation

Provide the full citation for every section quoted in Part 2, using this format:

> **s [number] [Act Title Year]**
> Version as at: [date returned by get_legislation_content]
> Source: [DLM section-level URL — see workflow below]
> Part: [Part name as returned by get_legislation_content]

For amendment history questions, add a citation table:

| Date | Change | Amending Act | Source URL |
|---|---|---|---|
| [date] | [description] | [Act name] | [URL] |

**Section-level DLM links are required.** The citation must use a DLM section-level URL,
not the Act's homepage. PCO structures every section as its own page:
`https://www.legislation.govt.nz/act/public/[year]/[number]/latest/DLM[anchor].html`

**How to get the section-level DLM URL:**
The MCP's `get_legislation_content` typically returns only the Act-level URL. To get the
section-level anchor, run a targeted web search after fetching the section text:

`[Act name] [section number] site:legislation.govt.nz DLM`

The search results will return the section's individual PCO page URL containing the DLM
anchor. Use that URL in the citation. Example for s 14 Holidays Act 2003:
- Act-level (insufficient): `https://www.legislation.govt.nz/act/public/2003/129/en/latest/`
- Section-level (required): `https://legislation.govt.nz/act/public/2003/0129/latest/DLM236866.html`

If the web search does not return a section-level URL, use the Act-level URL and note:
*"Section-level DLM anchor not retrieved — Act-level URL provided."*

**Never fabricate a legislation.govt.nz URL.** Only use URLs returned directly by the
MCP tools or confirmed via web search results. PCO section-level DLM identifiers cannot be
reliably guessed and must not be constructed manually.

**Never cite external commentary, law firm articles, or case law.** See Source Integrity
Rules. Primary sources only.

---

## Example Answer Structure

```
## Quick Answer

Directors of a company must not agree to, cause, or allow the business to be carried on
in a manner likely to create a substantial risk of serious loss to the company's creditors.
This is the reckless trading prohibition in s 135 of the Companies Act 1993.

---

## Statutory Text

**s 135 Companies Act 1993** — *Version as at 1 July 2025*

**135 Reckless trading**

A director of a company must not—
(a) agree to the business of the company being carried on in a manner likely to create
    a substantial risk of serious loss to the company's creditors; or
(b) cause or allow the business of the company to be carried on in a manner likely to
    create a substantial risk of serious loss to the company's creditors.

---

## Explanation

Section 135 sets a single composite standard across both limbs. The operative phrase is
"likely to create a substantial risk of serious loss" — this is prospective and risk-based,
not contingent on actual loss occurring or the company being technically insolvent at the
time of the conduct. Limb (a) captures a director who affirmatively votes for or approves
the course of conduct. Limb (b) is broader — it captures a director who causes it actively
or passively allows it without objection.

Note: s 135 is in Part 8 of the Companies Act 1993 alongside s 136 (duty in relation to
obligations) and s 137 (duty not to act in a manner that would constitute fraud). These
duties are civil duties enforceable by way of compensation under s 301.

[Section-level DLM anchor not retrieved — Act-level URL provided for this example.]

---

## Citation

**s 135 Companies Act 1993**
Version as at: 1 July 2025
Source: https://www.legislation.govt.nz/act/public/1993/105/en/latest/
Part: Part 8 — Directors and their powers and duties
```

---

## Query Classification

Before reaching for any tool, classify the query. Each type has a different workflow.

### Type 1 — Direct Lookup
*"What does section 60 of the Companies Act say?"*
The Act and section are both known.

**Workflow:**
1. `search_legislation` with `act_status: in_force` and `search_term` = Act name → get `work_id`
2. `get_legislation_content` with `work_id` + `section` → get verbatim text
3. Web search for section-level DLM URL: `[Act name] s [number] site:legislation.govt.nz DLM`
4. Apply mandatory output format — quote the text in full in Part 2
5. Fetch any cross-referenced provisions before characterising them in Part 3

### Type 2 — Conceptual / Semantic
*"Can creditors apply to court for director duty breaches?"*
No section number given. User knows the legal concept but not where it lives.

**Workflow:**
1. **Reason first** — identify the most likely Act(s) and section(s) from legal knowledge.
   State this hypothesis explicitly before fetching (e.g. "This is likely s 301 Companies
   Act 1993, Part 16 Liquidations — fetching to confirm").
2. `search_legislation` with `search_term` = key legal terms → confirm Act appears
3. `get_legislation_content` for the identified section(s)
4. Web search for section-level DLM URLs for all retrieved sections
5. **Verify collateral provisions** — if the retrieved text refers to other sections that
   are material to the answer, fetch those sections before characterising them. State each
   fetch explicitly: "Fetching s 103A to confirm its scope before describing it."
6. If the retrieved text confirms the hypothesis, proceed to output format. If not, revise
   and try adjacent sections. Do not force retrieved text to fit the hypothesis.
7. Apply mandatory output format.

**Critical:** The LLM's identification of the relevant section is a *hypothesis*. The MCP
fetch is the *confirmation*. Never present a conceptual answer without having fetched and
read the actual section text.

### Type 3 — Amendment History
*"When did the voidable preference clawback period change?"*
User wants to know how a provision changed over time.

**Workflow:**
1. `search_legislation` → get `work_id` for the Act
2. **Web search first** for PCO amendment notes — search `"[Act name] section [number]
   site:legislation.govt.nz"` or `"[Act name] s [number] amendment history"`. PCO publishes
   inline amendment notes on every section page listing every change, the date, and the
   amending Act.
3. **Read the amendment notes carefully** — specifically note which subsections were
   **replaced** vs **amended**. This distinction is critical:
   - **Replaced** = that subsection was wholly rewritten; the old text is gone entirely
   - **Amended** = only specific words or cross-references changed; substance was retained
4. `get_legislation_content` for the **as-enacted version** (use the oldest URL from
   `get_work_versions`) and the **current version** — these are the two reliable endpoints.
5. Quote both versions verbatim in Part 2 under separate headings with their version dates.
   Show the diff explicitly — "The as-enacted text read: [text]. The current text reads: [text]."
6. Use the amendment notes to explain what changed in between. Do not rely solely on diffing
   intermediate reprints — post-2007 reprints frequently truncate section text in the MCP.
7. `get_version_details` for each amending Act → extract citation URLs for the amendment table.
8. Web search for section-level DLM URLs for all retrieved sections.
9. Apply mandatory output format including the amendment trail table in Part 4.

**Known limitation:** The MCP consistently returns truncated section text for reprints dated
approximately 2007–2015. Do not infer that a section was blank or unchanged from a truncated
result. Always cross-reference with web search amendment notes.

### Type 4 — Currency Check
*"Is the Illegal Contracts Act 1970 still in force?"*

**Workflow:**
1. `search_legislation` with `search_term` = Act name, no `act_status` filter
2. Check `legislation_status` field in result — will be `in_force`, `not_in_force`, or `repealed`
3. If repealed, identify the repealing Act from search results or web search
4. Quote the repealing provision if retrievable
5. Apply mandatory output format — Part 2 may be the repealing section rather than the
   original Act if the question is about the repeal itself

---

## The "Replaced vs Amended" Rule

This is the single most important analytical discipline for amendment history questions.

When PCO amendment notes say a subsection was **replaced**, the old text is gone entirely —
you cannot infer anything about the new text from the old.

When PCO amendment notes say a subsection was **amended**, the substance survived — only
specific words or cross-references changed. This means:

- If ss (1)–(4) of a section are **replaced** but ss (5)–(6) are only **amended**, the
  concepts and timeframes in ss (5)–(6) likely survived the amendment intact, even though
  the rest of the section was restructured.
- Fetching the current version and the as-enacted version will show you what ss (5)–(6)
  looked like before and after, and you can reason confidently about what changed.

**Real example from s 292 Companies Act 1993:**
The Companies Amendment Act 2006 (s 27) replaced ss (1)–(4) entirely (new "insolvent
transaction" framing, running account mechanism) but only *amended* ss (5)–(6) (updating
cross-references). This meant the 2-year "specified period" in ss (5)–(6) survived the 2006
rewrite intact — it was not abolished until the COVID-19 Response (Further Management
Measures) Legislation Act 2020 restructured it as the "related party period."

---

## Collateral Provision Verification Rule

**Every section number that appears in Part 3 (Explanation) must correspond to a
`get_legislation_content` call in the same session.**

This rule exists because the most reliable-seeming errors occur when the primary section
is correctly retrieved but a cross-referenced provision is characterised from memory.

**Example failure mode:**
- s 74 PPSA was correctly retrieved and quoted
- The answer stated "this is subject to s 103A, which deals with accessions and fixtures"
- s 103A was never fetched
- s 103A actually concerns priority of interests of certain operators of designated
  financial market infrastructure — nothing to do with accessions or fixtures

**The rule in practice:**
- If the retrieved text says "subject to s 103A", fetch s 103A before describing it
- If the fetch fails or times out, note this explicitly rather than characterising from memory:
  "s 103A is referenced here — fetch separately to confirm its effect before relying on this"
- Never silently characterise an unfetched provision

---

## Citation Standard

Every answer must include all of the following for each section quoted:

1. **Section citation** in NZ format: `s [number] [Act Title Year]`
   e.g. `s 292 Companies Act 1993`

2. **Version label**: "Version as at [date]" — use the exact date string returned by
   `get_legislation_content`, not an approximation

3. **Section-level DLM URL**: run `[Act name] [section number] site:legislation.govt.nz DLM`
   via web search to retrieve the DLM anchor URL for each section. Use Act-level URL only
   if the web search does not return a section-level result, and note this explicitly.

4. **Part reference**: include the Part name as returned by `get_legislation_content`
   (e.g. "Part 7 — Priority between security interests")

5. **For amendment history**: an amendment trail table linking to each amending Act

**Citation format — standard:**
> **s [number] [Act Title Year]**
> Version as at: [date]
> Source: [DLM section-level URL from web search, or Act-level URL from MCP if DLM not retrieved]
> Part: [Part name]

**Citation format — amendment trail:**

| Date | Change | Amending Act | Source |
|---|---|---|---|
| [date] | [what changed] | [Act name] | [URL] |

**Never fabricate a legislation.govt.nz URL.** PCO section-level DLM identifiers cannot be
reliably guessed and must not be constructed manually. Only use URLs returned by MCP tools
or confirmed via web search results.

**Never cite external commentary, law firm articles, or case law.** See Source Integrity
Rules. Primary sources only.

---

## Reasoning Transparency

State the plan **once** at the start in 2–3 lines covering: which Act, which sections,
and why. Then execute silently. Do not narrate each tool call as it runs.

**Acceptable upfront plan:**
> "Fetching ss 21, 8, and 14 of the Holidays Act 2003 — these are the annual holiday pay
> rate, OWP definition, and gross earnings definition. Will also run a web search for
> section-level DLM URLs."

**Not acceptable (too much narration):**
> "Good — that's the core rate provision. Now the two definitions it turns on..."
> "Section 51 is just an old transitional provision — not relevant today."
> "Not the right one. Let me check s 14A..."

Surface reasoning only when a fetch returns unexpected results and a course correction is
needed. In that case, state the issue and the revised plan in one sentence, then continue.

This keeps the output clean. The user sees a plan, then the answer — not the workings.

---

## Web Search + MCP Interplay

| Scenario | Use web search | Use MCP |
|---|---|---|
| Finding the section number for a concept | ✓ (fast) | ✓ (confirm) |
| Getting amendment dates and amending Acts | ✓ (PCO notes) | ✓ (validate + URLs) |
| Getting current section text | — | ✓ (always) |
| Getting as-enacted text | — | ✓ (oldest version URL) |
| Checking if an Act is still in force | — | ✓ (search_legislation) |
| Finding which Act amended a provision | ✓ | ✓ (get_version_details for URL) |
| Characterising a cross-referenced provision | — | ✓ (fetch it, never guess) |
| Retrieving section-level DLM URL | ✓ (site:legislation.govt.nz DLM) | — |

Web search is the **detective layer** — fast, narrative, surfaces PCO's own amendment notes
and section-level DLM anchors.
MCP is the **verification and citation layer** — authoritative text, stable URLs, version history.

Never rely on web search alone for legislative text. Search results may contain outdated,
paraphrased, or third-party summaries of legislation. Web search results are not a substitute
for `get_legislation_content`.

---

## Source Integrity Rules

These rules govern what may and may not appear in the final output. They are not optional.

### Case Law — PROHIBITED until OpenLaw API is available

**Do not cite, quote, or rely on case law in any answer produced by this skill.**

The OpenLaw API has not yet been integrated into this MCP. Without verified API access to
authoritative case law databases, any case citation risks being hallucinated, misattributed,
or materially wrong. A wrong case citation is worse than no case citation.

**What this means in practice:**
- Do not name cases, even ones you are confident about
- Do not describe what a case "held" or "decided"
- Do not use phrases like "the courts have interpreted this as..." without a citable source
- Do not use case law to extend, narrow, or qualify the statutory text
- If a question genuinely cannot be answered from statute alone (e.g. it turns on judicial
  interpretation), say so explicitly:
  *"This question turns on case law that cannot be cited under the current skill standard.
  The statutory text is [quote]. Judicial interpretation of this provision is out of scope
  until the OpenLaw API is available."*

**Once the OpenLaw API is integrated**, this prohibition will be replaced with a
verification workflow requiring API retrieval of the full decision before citation.

### External Commentary — Search Aid Only, Never Cited

Law firm articles, legal blogs, commentary websites (e.g. Minter Ellison, Simpson Grierson,
Russell McVeagh, Chapman Tripp, Anthony Harper), and secondary legal publications may be
used **only** to navigate to the correct provision quickly. They must never appear in:
- Part 2 (Statutory Text)
- Part 3 (Explanation)
- Part 4 (Citation)

**The test:** Could the user verify this statement by going directly to PCO or the OPC's own
documents? If yes, cite the primary source. If not, remove the statement entirely.

### Acceptable Primary Sources

| Source type | Acceptable | Citation format |
|---|---|---|
| Acts of Parliament | ✓ | PCO DLM section-level URL |
| Regulations | ✓ | PCO URL |
| OPC Codes of Practice (e.g. BPPC) | ✓ | OPC's own PDF or factsheet URL only |
| OPC guidance documents | ✓ | OPC's own URL only |
| PCO amendment notes | ✓ | PCO version URL |
| Case law | ✗ until OpenLaw API | — |
| Law firm articles | ✗ | Never |
| Legal commentary / textbooks | ✗ | Never |
| Employment NZ / MBIE guidance | ✓ (secondary — flag as such) | MBIE/Employment NZ URL |

---

## Common Pitfalls

**Don't paraphrase instead of quoting.** Retrieval without verbatim quotation is not
retrieval for the purposes of this skill. If Part 2 of the output contains your words
rather than the statute's words, the answer has failed its primary purpose regardless
of how accurate the paraphrase is. The user cannot verify a paraphrase against PCO.

**Don't characterise a provision you haven't fetched.** If you reference a section in
Part 3 (e.g. "this is subject to s 103A, which deals with X"), you must fetch that
section via MCP before describing what it does. Every section number in Part 3 must
correspond to a `get_legislation_content` call. This is the Collateral Provision
Verification Rule — it is not optional.

**Don't infer from truncated text.** If `get_legislation_content` returns a section
title with no body text, the reprint is truncated — not evidence the section was blank.
Use web search amendment notes instead.

**Don't treat "current" as "always was."** The current version reflects all amendments.
For history questions, always fetch the as-enacted version too and quote both.

**Don't confuse operative dates in complex legislative schemes.** Where a provision
establishes multiple dates for different purposes (e.g. a safe harbour operating period
vs a forward-looking solvency projection date), fetch and quote the full provision before
describing any of the dates. State each date's purpose explicitly and trace it to the
specific subsection it comes from.

**Don't assume the 2-year/6-month split.** The voidable preference periods have changed
multiple times. Always verify from statute, not from memory.

**Don't skip the citation URLs.** Every answer must link back to PCO at section level
where possible. The whole point of the MCP is grounding — an uncited answer defeats it.

**Don't use Act-level URLs where section-level DLM URLs are available.** Always run the
web search for the DLM anchor. Citing the Act's homepage when a section-level URL is
retrievable is a citation downgrade.

**Don't conflate the PCO API and the MBIE API.** The `nz-legislation` MCP tools access
`api.legislation.govt.nz` (Parliamentary Counsel Office). PPSR, NZBN, Companies Register,
and Insolvency Register are separate MBIE systems covered by the `nz-govt-apis` skill.

**Don't cite case law.** Even if you are confident about a case name and holding, do not
include it. The prohibition is absolute until the OpenLaw API is available. A wrong case
citation causes direct harm. Silence is better than a wrong citation.

---

## Quality Self-Check Before Responding

Before finalising any answer, verify:

- [ ] Part 1: Is there a clear direct answer in 1–3 sentences?
- [ ] Part 2: Is the verbatim statutory text present, quoted exactly as returned by MCP, with version date?
- [ ] Part 2: Is every section that is material to the answer quoted, not just the primary one?
- [ ] Part 3: Does every statement in the explanation trace to a specific word or phrase in Part 2?
- [ ] Part 3: Is there any characterisation of a provision that was not fetched and quoted? If yes, remove it or fetch it.
- [ ] Part 3: Does the explanation reference any case law? If yes, remove it — prohibited until OpenLaw API is available.
- [ ] Part 3: Does the explanation reference any law firm articles or external commentary? If yes, remove it.
- [ ] Part 4: Has a web search been run to retrieve section-level DLM URLs for every quoted section?
- [ ] Part 4: Are all URLs from MCP tool output or confirmed web search results — not fabricated?
- [ ] Part 4: Does the citation block contain any law firm articles, commentary, or case citations? If yes, remove them.

If any box is unchecked, do not proceed. Fix the gap first.
