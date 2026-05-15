import * as cheerio from "cheerio";

type CheerioAPI = cheerio.CheerioAPI;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = cheerio.Cheerio<any>;

const LEGISLATION_WEBSITE = "https://www.legislation.govt.nz";
export const MAX_CONTENT_WORDS = 4000;

const indent = (depth: number): string => "  ".repeat(depth);

export function workIdToUrlFlexible(workId: string): string {
  if (workId.startsWith("secondary-legislation_")) {
    const rest = workId.slice("secondary-legislation_".length);
    const parts = rest.split("_");
    if (parts.length < 3) {
      throw new Error(`Invalid secondary-legislation work_id: '${workId}'`);
    }
    const subtype = parts[0];
    const year = parts[1];
    let number = parts.slice(2).join("_");
    number = number.replace(/^0+/, "") || "0";
    return `${LEGISLATION_WEBSITE}/secondary-legislation/${subtype}/${year}/${number}/en/latest/`;
  }
  const parts = workId.split("_");
  if (parts.length < 4) {
    throw new Error(
      `Invalid work_id format: '${workId}'. Expected format: type_subtype_year_number (e.g. act_public_2020_031)`,
    );
  }
  const [legType, subtype, year, ...rest] = parts;
  const number = rest.join("_").replace(/^0+/, "") || "0";
  return `${LEGISLATION_WEBSITE}/${legType}/${subtype}/${year}/${number}/en/latest/`;
}

// legislation.govt.nz is fronted by CloudFront + AWS WAF, which serves a
// JS challenge page to requests that don't look like a real browser session.
// Sending the full set of sec-fetch / sec-ch-ua headers + Accept-Encoding +
// upgrade-insecure-requests sometimes lets us through; if not, we'll need to
// proxy the fetch through a non-AWS-edge host.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-NZ,en-GB;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Cache-Control": "max-age=0",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  "Sec-Ch-Ua":
    '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  Referer: "https://www.google.com/",
};

export type FetchResult = {
  html: string;
  finalUrl: string;
  status: number;
  contentType: string;
};

export async function fetchLegislationHtml(url: string): Promise<FetchResult> {
  let resp: Response;
  try {
    resp = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });
  } catch (err) {
    throw new Error(`Network error fetching legislation page: ${(err as Error).message}`);
  }
  if (resp.status === 404) {
    throw new Error(`Legislation not found at this URL. Check the work_id or URL.\nURL: ${url}`);
  }
  if (resp.status >= 400) {
    throw new Error(`HTTP ${resp.status} fetching ${url}`);
  }
  return {
    html: await resp.text(),
    finalUrl: resp.url,
    status: resp.status,
    contentType: resp.headers.get("content-type") ?? "",
  };
}

function tagName($c: El): string {
  return (($c.prop("tagName") as string | undefined) ?? "").toLowerCase();
}

function extractPara($: CheerioAPI, para: El, depth: number): string {
  const lines: string[] = [];
  const ind = indent(depth);
  para.children("p.text").each((_, p) => {
    lines.push(`${ind}${$(p).text().trim()}`);
  });
  para.children("div.label-para").each((_, lp) => {
    lines.push(extractLabelPara($, $(lp), depth));
  });
  if (lines.length === 0) {
    const t = para.text().trim();
    if (t) lines.push(`${ind}${t}`);
  }
  return lines.join("\n");
}

function extractLabelPara($: CheerioAPI, lp: El, depth: number): string {
  const lines: string[] = [];
  const ind = indent(depth);
  const labelEl = lp.find("h5.label-para").first();
  let label = "";
  if (labelEl.length) {
    label = labelEl.find("span.label").first().text().trim();
  }
  const para = lp.children("div.para").first();
  if (para.length) {
    const textParts: string[] = [];
    para.children("p.text").each((_, p) => {
      textParts.push($(p).text().trim());
    });
    const mainText = textParts.join(" ");
    if (label) {
      lines.push(`${ind}${label} ${mainText}`.trim());
    } else if (mainText) {
      lines.push(`${ind}${mainText}`);
    }
    para.children("div.label-para").each((_, sub) => {
      lines.push(extractLabelPara($, $(sub), depth + 1));
    });
  } else if (label) {
    lines.push(`${ind}${label}`);
  }
  return lines.join("\n");
}

export function extractText($: CheerioAPI, el: El, depth = 0): string {
  const lines: string[] = [];
  const ind = indent(depth);

  if (el.is("div.prov")) {
    const heading = el.find("h5.prov").first();
    if (heading.length) {
      const label = heading.find("span.label").first().text().trim();
      let titleText = heading.text().trim();
      if (label && titleText.startsWith(label)) {
        titleText = titleText.slice(label.length).trim();
      }
      lines.push(`${ind}${label} ${titleText}`.trim());
    }
    const body = el.find("div.prov-body").first();
    if (body.length) {
      lines.push(extractText($, body, depth));
    }
    return lines.join("\n");
  }

  if (el.is("div.subprov")) {
    const labelEl = el.find("p.subprov").first();
    let label = "";
    if (labelEl.length) {
      label = labelEl.find("span.label").first().text().trim();
    }
    el.children("div.para").each((_, child) => {
      const paraText = extractPara($, $(child), depth + 1);
      if (label) {
        lines.push(`${ind}${label} ${paraText.trim()}`);
        label = "";
      } else {
        lines.push(`${ind}${paraText.trim()}`);
      }
    });
    el.children("div.label-para").each((_, lp) => {
      lines.push(extractLabelPara($, $(lp), depth + 1));
    });
    return lines.join("\n");
  }

  if (el.is("div.prov-body")) {
    el.children().each((_, child) => {
      const c = $(child);
      if (c.hasClass("subprov")) {
        lines.push(extractText($, c, depth));
      } else if (c.hasClass("label-para")) {
        lines.push(extractLabelPara($, c, depth + 1));
      } else if (c.hasClass("para")) {
        lines.push(`${ind}${extractPara($, c, depth)}`);
      } else if (c.hasClass("def-para")) {
        lines.push(`${ind}${extractPara($, c, depth)}`);
      }
    });
    return lines.join("\n");
  }

  return `${ind}${el.text().trim()}`;
}

export type TocPart = { part: string; title: string; sections: string };

export function parseToc($: CheerioAPI): TocPart[] {
  const tocDiv = $("div.contents").first();
  if (!tocDiv.length) return [];
  const tocTable = tocDiv.find("table.tocentrylayout").first();
  if (!tocTable.length) return [];

  const parts: TocPart[] = [];
  let currentPart = "";
  let currentTitle = "";
  let inPart = false;
  let secs: string[] = [];

  const flush = (): void => {
    if (inPart && secs.length > 0) {
      parts.push({
        part: currentPart,
        title: currentTitle,
        sections: `${secs[0]}-${secs[secs.length - 1]}`,
      });
    }
  };

  tocTable.find("tr").each((_, tr) => {
    const $tr = $(tr);
    const col2 = $tr.find("td.tocColumn2").first();
    if (!col2.length) return;

    const partLabel = col2.find("div.tocPartLabel").first();
    if (partLabel.length) {
      flush();
      secs = [];
      const partHeading = col2.find("div.tocPartHeading").first();
      currentPart = partLabel.text().trim().replace(/^Part\s*/, "");
      currentTitle = partHeading.length ? partHeading.text().trim() : "";
      inPart = true;
      return;
    }

    const prov = col2.find("span.tocProvHeading").first();
    if (prov.length) {
      const col1 = $tr.find("td.tocColumn1").first();
      if (col1.length) {
        const sec = col1.text().trim();
        if (sec) secs.push(sec);
      }
    }
  });

  flush();
  return parts;
}

export function findSection($: CheerioAPI, body: El, section: string): El | null {
  let result: El | null = null;
  body.find("div.prov").each((_, prov) => {
    if (result) return false;
    const heading = $(prov).find("h5.prov").first();
    if (heading.length) {
      const label = heading.find("span.label").first().text().trim();
      if (label === section) {
        result = $(prov);
        return false;
      }
    }
  });
  return result;
}

export function findSectionContext(sectionEl: El): { part?: string; subpart?: string } {
  const ctx: { part?: string; subpart?: string } = {};
  let parent = sectionEl.parent();
  while (parent.length) {
    if (parent.hasClass("subpart") && !ctx.subpart) {
      const h = parent.find("h3.subpart").first();
      if (h.length) ctx.subpart = h.text().trim();
    }
    if (parent.hasClass("part") && !ctx.part) {
      const h = parent.find("h2.part").first();
      if (h.length) ctx.part = h.text().trim();
    }
    parent = parent.parent();
  }
  return ctx;
}

export function findPart($: CheerioAPI, body: El, partNum: string): El | null {
  let result: El | null = null;
  body.find("div.part").each((_, part) => {
    if (result) return false;
    const heading = $(part).find("h2.part").first();
    if (heading.length) {
      const labelSpan = heading.find("span.label").first();
      if (labelSpan.length) {
        const labelText = labelSpan.text().trim().replace(/\s+/g, " ");
        if (labelText === `Part ${partNum}` || labelText === partNum) {
          result = $(part);
          return false;
        }
      }
    }
  });
  return result;
}

export function extractPartContent($: CheerioAPI, partDiv: El): { text: string; sectionCount: number } {
  const heading = partDiv.find("h2.part").first();
  const headingText = heading.length ? heading.text().trim() : "";
  const lines: string[] = [headingText, ""];
  let sectionCount = 0;

  partDiv.find("*").each((_, child) => {
    const $c = $(child);
    const tag = tagName($c);
    if (tag === "h3" && $c.hasClass("subpart")) {
      lines.push(`\n${$c.text().trim()}\n`);
    } else if (tag === "h4" && $c.hasClass("crosshead")) {
      lines.push(`\n  ${$c.text().trim()}\n`);
    } else if (tag === "div" && $c.hasClass("prov")) {
      sectionCount++;
      lines.push(extractText($, $c, 0));
      lines.push("");
    }
  });

  return { text: lines.join("\n"), sectionCount };
}

export function countSections(body: El): number {
  return body.find("div.prov").length;
}

export function extractTitleAndVersion($: CheerioAPI): { title: string; version: string } {
  const title = $("h1.title").first().text().trim();
  const version = $("p.reprint-date").first().text().trim();
  return { title, version };
}

export function truncateByWords(text: string, maxWords: number): { text: string; truncated: boolean } {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text, truncated: false };
  return { text: words.slice(0, maxWords).join(" "), truncated: true };
}

export function loadHtml(html: string): CheerioAPI {
  return cheerio.load(html);
}
