import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Trash2, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { DocumentRecord } from "@/types";

export function DocumentCard({ doc }: { doc: DocumentRecord }) {
  const deleteDocument = useAppStore((s) => s.deleteDocument);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group relative">
      <Link
        to={`/doc/${doc.id}`}
        className="flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-[color:var(--color-primary)]"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-start justify-between gap-2 pr-6">
          <h3 className="text-body font-semibold">{doc.title}</h3>
          {doc.isCompleted && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-caption"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              Read
            </span>
          )}
        </div>
        <p className="text-caption">{doc.domain}</p>

        <div className="flex flex-wrap gap-1">
          <span className="rounded-full px-2 py-0.5 text-caption" style={{ backgroundColor: "var(--color-secondary)" }}>
            {doc.category}
          </span>
          {doc.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full px-2 py-0.5 text-caption" style={{ backgroundColor: "var(--color-accent)" }}>
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-accent)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${doc.scrollProgress}%`, backgroundColor: "var(--color-primary)" }}
          />
        </div>
        <div className="flex items-center justify-between text-caption">
          <span>{Math.round(doc.scrollProgress)}% read</span>
          <span>{new Date(doc.lastReadAt).toLocaleDateString()}</span>
        </div>
      </Link>

      {confirming ? (
        <div
          className="absolute right-3 top-3 flex items-center gap-1 rounded-md border px-1 py-0.5"
          style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
        >
          <button
            onClick={() => deleteDocument(doc.id)}
            aria-label={`Confirm delete ${doc.title}`}
            title="Confirm delete"
            className="rounded p-0.5"
            style={{ color: "var(--color-danger)" }}
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => setConfirming(false)}
            aria-label="Cancel delete"
            title="Cancel"
            className="rounded p-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${doc.title}`}
          title="Delete document"
          className="absolute right-3 top-3 hidden rounded p-0.5 group-hover:block"
          style={{ color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
