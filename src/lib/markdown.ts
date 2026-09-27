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

const MAX_LINE_LENGTH = 400;
const TRUNCATED_PREVIEW_LENGTH = 160;

/**
 * Some directory/index pages (a "docs home" listing every article, for
 * instance) embed each linked article's *entire* text inside that link's
 * label — likely for SEO/crawlability. That isn't real navigation chrome
 * (so header/nav/footer stripping in docFetcher.ts never touches it), but a
 * single markdown line running to several KB is never legitimate prose —
 * truncate any such line to a short plain-text preview instead of storing
 * the whole embedded article as noise.
 */
export function cleanOversizedLines(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      if (line.length <= MAX_LINE_LENGTH) return line;
      const plain = line
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // drop images first — otherwise their
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // nested `]` breaks the link regex below
        .replace(/[`*_#]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return plain.length > TRUNCATED_PREVIEW_LENGTH
        ? `${plain.slice(0, TRUNCATED_PREVIEW_LENGTH).trim()}…`
        : plain;
    })
    .join("\n");
}

/**
 * Strips residual page chrome that survives extraction: empty heading
 * permalink anchors (`[](url)`), "N mins READ" badges, and logo images
 * sitting above the first heading.
 */
export function cleanNoise(markdown: string): string {
  let seenHeading = false;
  return markdown
    .split("\n")
    .filter((line) => {
      if (/^\s{0,3}#{1,6}\s/.test(line)) seenHeading = true;
      if (/^\s*\d+\s*mins?\s+read\s*$/i.test(line)) return false;
      if (!seenHeading && /^\s*!\[[^\]]*logo[^\]]*\]\([^)]*\)\s*$/i.test(line)) return false;
      return true;
    })
    .map((line) => line.replace(/\[\]\([^)]*\)/g, ""))
    .join("\n");
}

/** Compares source URLs ignoring protocol, "www.", trailing slash, and fragment. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Docs sites often bake their own "on this page" index links straight into
 * the article as absolute URLs back to themselves (`https://site.com/page
 * #section`), which Jina Reader carries over unchanged. Rendered naively
 * those look external and open the live source site in a new tab instead of
 * scrolling within our own copy. Resolves such a link (or a plain `#id`
 * link) back to one of this doc's own heading ids, if it matches one.
 */
export function resolveInPageAnchor(href: string, sourceUrl: string, outline: ToCItem[]): string | null {
  let fragment: string | null = null;

  if (href.startsWith("#")) {
    fragment = href.slice(1);
  } else {
    try {
      const linkUrl = new URL(href);
      const docUrl = new URL(sourceUrl);
      if (linkUrl.origin === docUrl.origin && linkUrl.pathname === docUrl.pathname && linkUrl.hash) {
        fragment = linkUrl.hash.slice(1);
      }
    } catch {
      return null;
    }
  }

  if (!fragment) return null;
  const decoded = decodeURIComponent(fragment);
  const slug = slugify(decoded);
  const match = outline.find((h) => h.id === decoded || h.id === slug || slugify(h.text) === slug);
  return match?.id ?? null;
}

export interface TreeNode {
  item: ToCItem;
  children: TreeNode[];
}

/** Nests a flat heading list by level (H2 under H1, H3 under H2, ...). */
export function buildTree(items: ToCItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const stack: TreeNode[] = [];

  for (const item of items) {
    const node: TreeNode = { item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].item.level >= item.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return root;
}
