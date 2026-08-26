import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getContinueReadingDoc, getRecentDocs } from "@/lib/continueReading";
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";
import { useAppStore } from "@/store/useAppStore";

export function Home() {
  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? [];
  const [activeCategory, setActiveCategory] = useState("All");
  const setAddModalOpen = useAppStore((s) => s.setAddModalOpen);

  const continueDoc = useMemo(() => getContinueReadingDoc(documents), [documents]);
  const recentDocs = useMemo(
    () => getRecentDocs(documents, continueDoc?.id ?? null, 4),
    [documents, continueDoc],
  );

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(documents.map((d) => d.category)))],
    [documents],
  );

  const filtered =
    activeCategory === "All" ? documents : documents.filter((d) => d.category === activeCategory);

  return (
    <div className="flex h-full flex-col">
      <header
        className="flex shrink-0 items-center justify-between border-b px-6 py-3"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <span className="text-heading">DocSphere</span>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
        >
          <Plus size={14} /> Add doc
        </button>
      </header>

      {documents.length === 0 ? (
        <div className="flex-1">
          <EmptyState
            title="Your library is empty"
            description="Docs you add will show up here with progress, tags, and category."
            ctaLabel="Add your first doc"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {continueDoc && (
            <section className="mb-6">
              <p className="mb-2 text-label">Continue reading</p>
              <Link
                to={`/doc/${continueDoc.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold">{continueDoc.title}</p>
                  <p className="mb-2 text-caption">{continueDoc.domain}</p>
                  <div
                    className="h-1.5 w-full max-w-xs overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${continueDoc.scrollProgress}%`, backgroundColor: "var(--color-primary)" }}
                    />
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-md px-3 py-2 text-label"
                  style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
                >
                  Resume →
                </span>
              </Link>
            </section>
          )}

          {recentDocs.length > 0 && (
            <section className="mb-8">
              <p className="mb-2 text-label">Recent</p>
              <div className="flex flex-wrap gap-3">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/doc/${doc.id}`}
                    className="min-w-[180px] flex-1 rounded-md border px-3 py-2"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
                  >
                    <p className="truncate text-body">{doc.title}</p>
                    <p className="text-caption">{Math.round(doc.scrollProgress)}% read</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <h1 className="text-display mb-1">Library</h1>
          <p className="mb-6 text-body" style={{ color: "var(--color-text-muted)" }}>
            {documents.length} document{documents.length === 1 ? "" : "s"} tracked
          </p>

          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="rounded-full border px-3 py-1 text-label"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: activeCategory === cat ? "var(--color-primary)" : "transparent",
                  color: activeCategory === cat ? "var(--color-bg)" : "var(--color-text)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-muted)" }}>
              No documents in "{activeCategory}" yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
