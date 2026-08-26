import { isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { ArrowLeft, Check } from "lucide-react";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";
import { slugify } from "@/lib/markdown";
import {
  annotateMarkdownWithXrefs,
  buildReferenceIndex,
  decodeXrefPayload,
  extractSnippet,
} from "@/lib/crossReference";
import { HeadingTree } from "@/components/HeadingTree";
import { ReferencesPanel } from "@/components/ReferencesPanel";
import { CodeBlock } from "@/components/CodeBlock";
import { ShortcutHintBar } from "@/components/ShortcutHintBar";
import { EmptyState } from "@/components/EmptyState";
import type { CrossReferenceMatch, ReferenceTerm } from "@/types";

// Ingested images are cached as data: URIs for offline reading (see
// docFetcher.ts); the default sanitize schema only allows http/https on
// <img src>, so extend it to keep those data URIs instead of stripping them.
const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), "data"],
    href: [...(defaultSchema.protocols?.href ?? []), "xref"],
  },
};

// react-markdown separately runs its own urlTransform on every href/src
// *before* rehype-sanitize (or the `a`/component overrides) ever see the
// tree, and its default only allows http(s)/irc(s)/mailto/xmpp — so neither
// cached-image data: URIs nor our synthetic xref:// links survive it
// untouched. Widen it for exactly those two cases; anything else still goes
// through the default sanitizer.
function customUrlTransform(value: string, key: string) {
  if (key === "src" && value.startsWith("data:image/")) return value;
  if (key === "href" && value.startsWith("xref://")) return value;
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
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const updateScrollProgress = useAppStore((s) => s.updateScrollProgress);
  const toggleCompleted = useAppStore((s) => s.toggleCompleted);
  const headingTreeCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleHeadingTree = useAppStore((s) => s.toggleSidebar);

  const doc = useLiveQuery(() => (docId ? db.documents.get(docId) : undefined), [docId]);
  const allDocs = useLiveQuery(() => db.documents.toArray(), []) ?? [];

  const [activeReference, setActiveReference] = useState<ReferenceTerm | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef<string | null>(null);

  const debouncedSave = useDebounced((id: string, pct: number) => {
    updateScrollProgress(id, pct);
  }, 300);

  useEffect(() => {
    setActiveReference(null);
  }, [docId]);

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

  const referenceTerms = useMemo(() => buildReferenceIndex(allDocs), [allDocs]);
  const annotatedContent = useMemo(
    () => (doc ? annotateMarkdownWithXrefs(doc.content, referenceTerms) : ""),
    [doc, referenceTerms],
  );

  const activeMatch = useMemo<CrossReferenceMatch | null>(() => {
    if (!activeReference) return null;
    const targetDoc = allDocs.find((d) => d.id === activeReference.targetDocId);
    if (!targetDoc) return null;
    return { ...activeReference, snippet: extractSnippet(targetDoc, activeReference.targetHeadingText) };
  }, [activeReference, allDocs]);

  const openReferencedDocument = (targetDocId: string) => {
    const term = activeReference;
    setActiveReference(null);
    if (targetDocId === docId) {
      if (term?.targetHeadingId) {
        document.getElementById(term.targetHeadingId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    navigate(`/doc/${targetDocId}`);
  };

  if (!docId) {
    return (
      <EmptyState
        title="Pick a document to start reading"
        description="Open ⌘K to search your docs, or add a new one to get started."
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
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" aria-label="Back to Home" style={{ color: "var(--color-text-muted)" }}>
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-heading">{doc.title}</h1>
            <p className="text-caption">
              {doc.domain} · {Math.round(doc.scrollProgress)}% read
            </p>
          </div>
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
        <HeadingTree outline={doc.outline} collapsed={headingTreeCollapsed} onToggleCollapsed={toggleHeadingTree} />

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
              urlTransform={customUrlTransform}
              components={{
                h1: ({ children }) => <h1 id={slugify(extractText(children))}>{children}</h1>,
                h2: ({ children }) => <h2 id={slugify(extractText(children))}>{children}</h2>,
                h3: ({ children }) => <h3 id={slugify(extractText(children))}>{children}</h3>,
                pre: ({ children }) => <>{children}</>,
                code: ({ className, children }) => <CodeBlock className={className}>{children}</CodeBlock>,
                a: ({ href, children }) => {
                  const term = href ? decodeXrefPayload(href) : null;
                  if (term) {
                    return (
                      <button
                        onClick={() => setActiveReference(term)}
                        className="underline decoration-dotted underline-offset-2"
                        style={{ color: "inherit" }}
                      >
                        {children}
                      </button>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  );
                },
              }}
            >
              {annotatedContent}
            </ReactMarkdown>
          </article>
        </div>

        <ReferencesPanel
          match={activeMatch}
          onClose={() => setActiveReference(null)}
          onOpenDocument={openReferencedDocument}
        />
      </div>

      <ShortcutHintBar />
    </div>
  );
}
