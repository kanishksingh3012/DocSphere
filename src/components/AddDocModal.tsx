import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Loader2, X } from "lucide-react";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";
import { ingestDocument, INITIAL_STEPS, IngestionError } from "@/lib/docFetcher";
import { normalizeUrl } from "@/lib/markdown";
import type { DocumentRecord, IngestionStep } from "@/types";

export function AddDocModal() {
  const open = useAppStore((s) => s.addModalOpen);
  const setOpen = useAppStore((s) => s.setAddModalOpen);
  const addDocument = useAppStore((s) => s.addDocument);
  const navigate = useNavigate();

  const existingCategories = useLiveQuery(
    async () => Array.from(new Set((await db.documents.toArray()).map((d) => d.category))),
    [],
  ) ?? [];

  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [steps, setSteps] = useState<IngestionStep[]>(INITIAL_STEPS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DocumentRecord | null>(null);
  const refreshDocument = useAppStore((s) => s.refreshDocument);

  if (!open) return null;

  const reset = () => {
    setDuplicate(null);
    setUrl("");
    setCategory("");
    setTags("");
    setSteps(INITIAL_STEPS);
    setBusy(false);
    setError(null);
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const target = normalizeUrl(url);
    const existing = (await db.documents.toArray()).find((d) => normalizeUrl(d.sourceUrl) === target);
    if (existing) {
      setDuplicate(existing);
      return;
    }

    setBusy(true);
    setSteps(INITIAL_STEPS);

    try {
      const doc = await ingestDocument({
        sourceUrl: url.trim(),
        category: category.trim() || "Uncategorized",
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        onStep: (step) => setSteps((prev) => prev.map((s) => (s.id === step.id ? step : s))),
      });
      await addDocument(doc);
      close();
      navigate(`/doc/${doc.id}`);
    } catch (err) {
      setError(err instanceof IngestionError ? err.message : "Something went wrong ingesting that URL.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-lg border p-5 shadow-xl"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading">Add a document</h2>
          <button onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-label">
            Source URL
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://react.dev/learn"
              disabled={busy}
              className="mt-1 w-full rounded-md border px-3 py-2 text-body outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>

          <label className="text-label">
            Category
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Frontend"
              list="existing-categories"
              disabled={busy}
              className="mt-1 w-full rounded-md border px-3 py-2 text-body outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
            <datalist id="existing-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="text-label">
            Tags (comma separated)
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hooks, routing"
              disabled={busy}
              className="mt-1 w-full rounded-md border px-3 py-2 text-body outline-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </label>

          {busy && (
            <ul className="flex flex-col gap-1.5 rounded-md border p-3" style={{ borderColor: "var(--color-border)" }}>
              {steps.map((step) => (
                <li key={step.id} className="flex items-center gap-2 text-label">
                  {step.status === "done" && <Check size={14} color="var(--color-success)" />}
                  {step.status === "active" && <Loader2 size={14} className="animate-spin" />}
                  {step.status === "pending" && <span className="h-3.5 w-3.5 rounded-full border" style={{ borderColor: "var(--color-border)" }} />}
                  {step.status === "failed" && <X size={14} color="var(--color-danger)" />}
                  <span style={{ color: step.status === "pending" ? "var(--color-text-faint)" : "var(--color-text)" }}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {duplicate && (
            <div className="flex flex-col gap-2 rounded-md border p-3 text-label" style={{ borderColor: "var(--color-border)" }}>
              <span>"{duplicate.title}" is already in your library.</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = duplicate.id;
                    close();
                    navigate(`/doc/${id}`);
                  }}
                  className="rounded-md border px-3 py-1.5"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Open it
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = duplicate.id;
                    setDuplicate(null);
                    setBusy(true);
                    try {
                      await refreshDocument(id);
                      close();
                      navigate(`/doc/${id}`);
                    } catch (err) {
                      setError(err instanceof IngestionError ? err.message : "Couldn't refresh that doc.");
                      setBusy(false);
                    }
                  }}
                  className="rounded-md px-3 py-1.5"
                  style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
                >
                  Refresh from source
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-label" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-md border px-3 py-2 text-label"
              style={{ borderColor: "var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md px-3 py-2 text-label"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
            >
              {busy ? "Ingesting..." : error ? "Retry" : "Add doc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
