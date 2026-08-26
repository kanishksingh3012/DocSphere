import type { DocumentRecord, IngestionStep, IngestionStepId } from "@/types";
import { buildOutline, cleanOversizedLines, extractDomain, guessTitle } from "./markdown";

const JINA_BASE = import.meta.env.VITE_JINA_READER_BASE || "https://r.jina.ai";
const FETCH_TIMEOUT_MS = 20_000;

export class IngestionError extends Error {
  constructor(
    public step: IngestionStepId,
    message: string,
  ) {
    super(message);
  }
}

export const INITIAL_STEPS: IngestionStep[] = [
  { id: "fetch", label: "Fetching source", status: "pending" },
  { id: "convert", label: "Converting to clean Markdown", status: "pending" },
  { id: "outline", label: "Building outline", status: "pending" },
  { id: "cache", label: "Caching for offline reading", status: "pending" },
];

function isGitHubBlobUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/blob\//.test(url);
}

function toGitHubRawUrl(url: string): string {
  return url
    .replace("github.com", "raw.githubusercontent.com")
    .replace("/blob/", "/");
}

// Many sites (docs portals especially) render their full sidebar/nav tree
// into the DOM — including collapsed entries with full article previews, for
// client-side search — which a static HTML-to-Markdown pass can't tell apart
// from real page content. Stripping these standard chrome landmarks before
// conversion keeps ingestion from pulling in the entire site nav alongside
// the actual article.
const JINA_REMOVE_SELECTOR = "nav, header, footer, aside, [role=navigation], [role=banner], [role=contentinfo]";

async function fetchWithTimeout(url: string, headers?: HeadersInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    if (!res.ok) {
      throw new IngestionError("fetch", `Source responded with ${res.status} ${res.statusText}`);
    }
    return res;
  } catch (err) {
    if (err instanceof IngestionError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new IngestionError("fetch", "Request timed out — the source took too long to respond.");
    }
    throw new IngestionError("fetch", "Could not reach that URL. Check the address and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Jina Reader wraps its output in a "Title: ... / URL Source: ... / Markdown
 * Content: ..." envelope. Pull the title out and strip the envelope so only
 * the actual document body is stored/rendered.
 */
function unwrapJinaResponse(text: string): { title: string | null; markdown: string } {
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  const bodyMarker = text.indexOf("Markdown Content:");
  if (bodyMarker === -1) {
    return { title: titleMatch?.[1]?.trim() ?? null, markdown: text };
  }
  return {
    title: titleMatch?.[1]?.trim() ?? null,
    markdown: text.slice(bodyMarker + "Markdown Content:".length).trim(),
  };
}

/** Fetches + converts a doc URL to clean markdown, trying GitHub-raw first, then Jina Reader. */
async function fetchAsMarkdown(sourceUrl: string): Promise<{ title: string | null; markdown: string }> {
  if (isGitHubBlobUrl(sourceUrl)) {
    const res = await fetchWithTimeout(toGitHubRawUrl(sourceUrl));
    return { title: null, markdown: await res.text() };
  }

  const res = await fetchWithTimeout(`${JINA_BASE}/${sourceUrl}`, {
    "X-Remove-Selector": JINA_REMOVE_SELECTOR,
  });
  const text = await res.text();
  if (!text.trim()) {
    throw new IngestionError("convert", "The source returned no readable content.");
  }
  return unwrapJinaResponse(text);
}

const MAX_CACHED_IMAGES = 25;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Downloads each image referenced in the markdown and inlines it as a data
 * URI so diagrams/screenshots survive being read offline (matches the same
 * offline guarantee already applied to text). Best-effort: some sites block
 * cross-origin image fetches, in which case that image is left pointing at
 * its original URL and just falls back to a live network load.
 */
async function cacheImages(markdown: string): Promise<string> {
  const pattern = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  const urls = Array.from(new Set(Array.from(markdown.matchAll(pattern), (m) => m[1]))).slice(
    0,
    MAX_CACHED_IMAGES,
  );
  if (urls.length === 0) return markdown;

  const replacements = new Map<string, string>();
  await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      if (blob.size > MAX_IMAGE_BYTES) return;
      replacements.set(url, await blobToDataUrl(blob));
    }),
  );

  if (replacements.size === 0) return markdown;
  let result = markdown;
  for (const [url, dataUrl] of replacements) {
    result = result.split(url).join(dataUrl);
  }
  return result;
}

export interface IngestOptions {
  sourceUrl: string;
  category: string;
  tags: string[];
  onStep?: (step: IngestionStep) => void;
}

export async function ingestDocument({
  sourceUrl,
  category,
  tags,
  onStep,
}: IngestOptions): Promise<DocumentRecord> {
  const report = (id: IngestionStepId, status: IngestionStep["status"], error?: string) =>
    onStep?.({ id, label: INITIAL_STEPS.find((s) => s.id === id)!.label, status, error });

  let markdown: string;
  let jinaTitle: string | null;
  try {
    report("fetch", "active");
    report("convert", "pending");
    ({ title: jinaTitle, markdown } = await fetchAsMarkdown(sourceUrl));
    markdown = cleanOversizedLines(markdown);
    report("fetch", "done");
    report("convert", "done");
  } catch (err) {
    const ingestionError = err instanceof IngestionError ? err : new IngestionError("fetch", "Ingestion failed.");
    report(ingestionError.step, "failed", ingestionError.message);
    throw ingestionError;
  }

  report("outline", "active");
  const outline = buildOutline(markdown);
  report("outline", "done");

  report("cache", "active");
  const cachedMarkdown = await cacheImages(markdown);
  const now = Date.now();
  const record: DocumentRecord = {
    id: crypto.randomUUID(),
    userId: null,
    sourceUrl,
    domain: extractDomain(sourceUrl),
    title: jinaTitle ?? guessTitle(markdown, extractDomain(sourceUrl)),
    category: category || "Uncategorized",
    tags,
    content: cachedMarkdown,
    outline,
    scrollProgress: 0,
    isCompleted: false,
    addedAt: now,
    lastReadAt: now,
    updatedAt: now,
  };
  report("cache", "done");

  return record;
}
