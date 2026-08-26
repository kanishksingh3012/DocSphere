import { isValidElement, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { Check } from "lucide-react";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";
import { slugify } from "@/lib/markdown";
import { Outline } from "@/components/Outline";
import { CodeBlock } from "@/components/CodeBlock";
import { ShortcutHintBar } from "@/components/ShortcutHintBar";
import { EmptyState } from "@/components/EmptyState";
import { DocumentCard } from "@/components/DocumentCard";

// Ingested images are cached as data: URIs for offline reading (see
// docFetcher.ts); the default sanitize schema only allows http/https on
// <img src>, so extend it to keep those data URIs instead of stripping them.
const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), "data"],
  },
};

// react-markdown separately runs its own urlTransform on every href/src
// *before* rehype-sanitize ever sees the tree, and its default only allows
// http(s)/irc(s)/mailto/xmpp — so the schema fix above isn't enough on its
// own. Only widen it for `src`, not `href`, so a data:text/html link can't
// slip through as an XSS vector.
function allowCachedImageDataUrls(value: string, key: string) {
  if (key === "src" && value.startsWith("data:image/")) return value;
  return defaultUrlTransform(value);
}

// Headings can contain inline markup (links, code, emphasis) — notably Jina
// Reader's empty permalink anchors. `String(children)` on that React tree
// stringifies elements as "[object Object]" instead of their text, which
// silently produced ids like "creating-and-nesting-components-object-object"
// that no longer matched buildOutline's slug for the same heading. Walk the
// tree instead and keep only the actual text.
function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

function useDebounced<T extends (...args: never[]) => void>(fn: T, delay: number) {
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  return (...args: Parameters<T>) => {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => fn(...args), delay);
  };
}

export function Workspace() {
  const { docId } = useParams();
  const settings = useAppStore((s) => s.settings);
  const updateScrollProgress = useAppStore((s) => s.updateScrollProgress);
  const toggleCompleted = useAppStore((s) => s.toggleCompleted);

  const doc = useLiveQuery(() => (docId ? db.documents.get(docId) : undefined), [docId]);
  const allDocs = useLiveQuery(() => db.documents.toArray(), []) ?? [];

  const relatedDocs = useMemo(
    () => (doc ? allDocs.filter((d) => d.category === doc.category && d.id !== doc.id).slice(0, 4) : []),
    [doc, allDocs],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef<string | null>(null);

  const debouncedSave = useDebounced((id: string, pct: number) => {
    updateScrollProgress(id, pct);
  }, 300);

  useEffect(() => {
    if (!doc || !scrollRef.current) return;
    if (!settings.autoScrollToLastPosition) return;
    if (restoredRef.current === doc.id) return;
    restoredRef.current = doc.id;

    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop = (doc.scrollProgress / 100) * max;
    });
  }, [doc, settings.autoScrollToLastPosition]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || !doc) return;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max <= 0 ? 100 : Math.min(100, Math.max(0, (el.scrollTop / max) * 100));
    debouncedSave(doc.id, pct);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (!doc) return;
      const el = scrollRef.current;

      if (e.key === "j") el?.scrollBy({ top: 120, behavior: "smooth" });
      if (e.key === "k") el?.scrollBy({ top: -120, behavior: "smooth" });

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        toggleCompleted(doc.id);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleCompleted(doc.id);
      }

      if (e.key === "n" || e.key === "p") {
        const headings = doc.outline.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
        if (headings.length === 0 || !el) return;
        const current = headings.findIndex((h) => h.getBoundingClientRect().top > 80);
        const target =
          e.key === "n" ? headings[Math.max(current, 0)] : headings[Math.max((current === -1 ? headings.length : current) - 2, 0)];
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doc, toggleCompleted]);

  if (!docId) {
    return (
      <EmptyState
        title="Pick a document to start reading"
        description="Choose a doc from the sidebar, or add a new one to get started."
        ctaLabel="Add your first doc"
      />
    );
  }

  if (doc === undefined) {
    return <div className="flex h-full items-center justify-center text-body">Loading…</div>;
  }

  if (doc === null || !doc) {
    return <EmptyState title="Document not found" description="This document may have been removed." />;
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header
        className="flex shrink-0 items-center justify-between border-b px-6 py-3"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="min-w-0">
          <h1 className="truncate text-heading">{doc.title}</h1>
          <p className="text-caption">
            {doc.domain} · {Math.round(doc.scrollProgress)}% read
          </p>
        </div>
        <button
          onClick={() => toggleCompleted(doc.id)}
          className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-label"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: doc.isCompleted ? "var(--color-primary)" : "transparent",
            color: doc.isCompleted ? "var(--color-bg)" : "var(--color-text)",
          }}
        >
          <Check size={14} /> {doc.isCompleted ? "Completed" : "Mark as read"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-w-0 flex-1 overflow-y-auto px-8 py-8"
          style={{ fontSize: `${settings.fontSize}px` }}
        >
          <article className="prose mx-auto max-w-3xl dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeHighlight]}
              urlTransform={allowCachedImageDataUrls}
              components={{
                h1: ({ children }) => <h1 id={slugify(extractText(children))}>{children}</h1>,
                h2: ({ children }) => <h2 id={slugify(extractText(children))}>{children}</h2>,
                h3: ({ children }) => <h3 id={slugify(extractText(children))}>{children}</h3>,
                pre: ({ children }) => <>{children}</>,
                code: ({ className, children }) => <CodeBlock className={className}>{children}</CodeBlock>,
              }}
            >
              {doc.content}
            </ReactMarkdown>
          </article>

          {relatedDocs.length > 0 && (
            <div className="mx-auto mt-12 max-w-3xl border-t pt-6" style={{ borderColor: "var(--color-border)" }}>
              <p className="mb-3 text-label">More in {doc.category}</p>
              <div className="grid grid-cols-2 gap-3">
                {relatedDocs.map((d) => (
                  <DocumentCard key={d.id} doc={d} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside
          className="hidden w-60 shrink-0 overflow-y-auto border-l lg:block"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
        >
          <p className="px-4 pt-4 text-label">Outline</p>
          <Outline outline={doc.outline} />
        </aside>
      </div>

      <ShortcutHintBar />
    </div>
  );
}
