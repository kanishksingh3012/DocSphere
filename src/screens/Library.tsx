import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";

export function Library() {
  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? [];
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(documents.map((d) => d.category)))],
    [documents],
  );

  const filtered =
    activeCategory === "All" ? documents : documents.filter((d) => d.category === activeCategory);

  if (documents.length === 0) {
    return (
      <EmptyState
        title="Your library is empty"
        description="Docs you add will show up here with progress, tags, and category."
        ctaLabel="Add your first doc"
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-8">
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
  );
}
