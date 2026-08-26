import type { ToCItem } from "@/types";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Strips inline markdown formatting down to plain display text. Notably
 * collapses `[label](url)` to just `label` — Jina Reader appends empty
 * permalink anchors like `[](url "title")` straight after heading text,
 * which otherwise leaks into the heading/outline as literal syntax.
 */
function toPlainText(raw: string): string {
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Scans H1–H3 headings in raw markdown and builds a ToC, de-duping slugs. */
export function buildOutline(markdown: string): ToCItem[] {
  const headingPattern = /^(#{1,3})\s+(.+)$/gm;
  const seen = new Map<string, number>();
  const outline: ToCItem[] = [];

  for (const match of markdown.matchAll(headingPattern)) {
    const level = match[1].length;
    const text = toPlainText(match[2]);
    let slug = slugify(text);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    if (count > 0) slug = `${slug}-${count}`;
    outline.push({ id: slug, text, level });
  }

  return outline;
}

export function guessTitle(markdown: string, fallback: string): string {
  const firstHeading = markdown.match(/^#\s+(.+)$/m);
  return firstHeading ? toPlainText(firstHeading[1]) : fallback;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
