import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Settings as SettingsIcon } from "lucide-react";
import { db } from "@/lib/db";
import { searchDocuments } from "@/lib/search";
import { useAppStore } from "@/store/useAppStore";

type PaletteEntry =
  | { kind: "doc"; id: string; title: string; category: string; scrollProgress: number }
  | { kind: "settings" };

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? [];

  const results = useMemo<PaletteEntry[]>(() => {
    const matches = searchDocuments(documents, query).map(
      (d): PaletteEntry => ({
        kind: "doc",
        id: d.id,
        title: d.title,
        category: d.category,
        scrollProgress: d.scrollProgress,
      }),
    );
    const q = query.trim().toLowerCase();
    const includeSettings = !q || "settings".includes(q);
    return includeSettings ? [...matches, { kind: "settings" }] : matches;
  }, [documents, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = (entry: PaletteEntry) => {
    setOpen(false);
    if (entry.kind === "doc") navigate(`/doc/${entry.id}`);
    else navigate("/settings");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = results[activeIndex];
      if (entry) select(entry);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-md overflow-hidden rounded-lg border shadow-xl"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs, or go to Settings…"
          className="w-full border-b px-4 py-3 text-body outline-none"
          style={{ borderColor: "var(--color-border)", backgroundColor: "transparent" }}
        />

        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && <p className="px-4 py-3 text-caption">No matches.</p>}

          {results.map((entry, index) => {
            const isActive = index === activeIndex;
            const key = entry.kind === "doc" ? entry.id : "settings";
            return (
              <button
                key={key}
                onClick={() => select(entry)}
                onMouseEnter={() => setActiveIndex(index)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-body"
                style={{ backgroundColor: isActive ? "var(--color-accent)" : "transparent" }}
              >
                {entry.kind === "doc" ? (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText size={14} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      <span className="truncate">{entry.title}</span>
                    </span>
                    <span className="shrink-0 text-caption">
                      {entry.category} · {Math.round(entry.scrollProgress)}%
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <SettingsIcon size={14} style={{ color: "var(--color-text-muted)" }} />
                    Settings
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
