import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, estimateStorageUsage } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function Settings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const clearAllDocuments = useAppStore((s) => s.clearAllDocuments);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? [];
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    estimateStorageUsage().then(setUsage);
  }, [documents.length]);

  const usagePct = usage && usage.quota > 0 ? (usage.usage / usage.quota) * 100 : 0;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ documents, settings }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `docsphere-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-label" style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft size={14} /> Home
      </Link>
      <h1 className="text-display mb-6">Settings</h1>

      <section className="mb-8 max-w-lg">
        <h2 className="mb-3 text-heading">Reading</h2>

        <label className="mb-4 block text-label">
          Theme
          <select
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-body"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <label className="mb-4 block text-label">
          Font size ({settings.fontSize}px)
          <input
            type="range"
            min={14}
            max={22}
            value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
            className="mt-1 block w-full"
          />
          <p className="mt-1 rounded-md border p-3" style={{ fontSize: settings.fontSize, borderColor: "var(--color-border)" }}>
            The quick brown fox jumps over the lazy dog.
          </p>
        </label>

        <label className="mb-3 flex items-center justify-between text-label">
          Resume at last scroll position
          <input
            type="checkbox"
            checked={settings.autoScrollToLastPosition}
            onChange={(e) => updateSettings({ autoScrollToLastPosition: e.target.checked })}
          />
        </label>

        <label className="flex items-center justify-between text-label">
          Outline collapsed by default
          <input
            type="checkbox"
            checked={settings.sidebarCollapsedByDefault}
            onChange={(e) => updateSettings({ sidebarCollapsedByDefault: e.target.checked })}
          />
        </label>
      </section>

      <section className="mb-8 max-w-lg">
        <h2 className="mb-3 text-heading">Account & sync</h2>
        {session ? (
          <div className="flex items-center justify-between rounded-md border p-3" style={{ borderColor: "var(--color-border)" }}>
            <div>
              <p className="text-body">{session.user.email}</p>
              <p className="text-caption">Synced across your signed-in devices</p>
            </div>
            <button onClick={signOut} className="rounded-md border px-3 py-1.5 text-label" style={{ borderColor: "var(--color-border)" }}>
              Sign out
            </button>
          </div>
        ) : (
          <p className="text-caption">Not signed in — reading local-only on this device.</p>
        )}
      </section>

      <section className="max-w-lg">
        <h2 className="mb-3 text-heading">Data</h2>

        {usage && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-caption">
              <span>Local storage used</span>
              <span>
                {formatBytes(usage.usage)} / {formatBytes(usage.quota)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-accent)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(usagePct, 100)}%`,
                  backgroundColor: usagePct > 80 ? "var(--color-danger)" : "var(--color-primary)",
                }}
              />
            </div>
            {usagePct > 80 && (
              <p className="mt-1 text-caption" style={{ color: "var(--color-danger)" }}>
                Storage is nearly full — export or clear old docs to free up space.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={exportJson} className="rounded-md border px-3 py-2 text-label" style={{ borderColor: "var(--color-border)" }}>
            Export all docs (JSON)
          </button>

          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-label">Delete all {documents.length} docs?</span>
              <button
                onClick={() => {
                  clearAllDocuments();
                  setConfirmClear(false);
                }}
                className="rounded-md px-3 py-2 text-label"
                style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}
              >
                Confirm delete
              </button>
              <button onClick={() => setConfirmClear(false)} className="rounded-md border px-3 py-2 text-label" style={{ borderColor: "var(--color-border)" }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={documents.length === 0}
              className="rounded-md border px-3 py-2 text-label disabled:opacity-40"
              style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
            >
              Clear all docs
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
