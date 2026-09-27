import { X } from "lucide-react";
import type { CrossReferenceMatch } from "@/types";

interface ReferencesPanelProps {
  match: CrossReferenceMatch | null;
  onClose: () => void;
  onOpenDocument: (docId: string) => void;
}

/**
 * Right-side panel for Tier 0 cross-references: shows where a term the
 * reader clicked also appears elsewhere in the library, without navigating
 * away from the doc they're currently reading.
 */
export function ReferencesPanel({ match, onClose, onOpenDocument }: ReferencesPanelProps) {
  if (!match) return null;

  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-l"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="text-label">Referenced here</span>
        <button onClick={onClose} aria-label="Close references panel" style={{ color: "var(--color-text-muted)" }}>
          <X size={14} />
        </button>
      </div>

      <div className="px-4 py-3">
        <p className="mb-1 text-caption">"{match.term}" also appears in</p>
        <p className="text-body font-semibold">{match.targetTitle}</p>
        {match.targetHeadingText && (
          <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            {match.targetHeadingText}
          </p>
        )}

        <p className="mt-3 text-body" style={{ color: "var(--color-text-muted)" }}>
          {match.snippet}
        </p>

        <button
          onClick={() => onOpenDocument(match.targetDocId)}
          className="mt-4 w-full rounded-md px-3 py-2 text-label"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--accent-foreground)" }}
        >
          Open document
        </button>
      </div>
    </aside>
  );
}
