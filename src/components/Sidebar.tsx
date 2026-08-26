import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Library, Plus, Search, Settings as SettingsIcon, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";

export function Sidebar() {
  const { pathname } = useLocation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setAddModalOpen = useAppStore((s) => s.setAddModalOpen);
  const [query, setQuery] = useState("");

  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? [];

  const filtered = documents.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));
  const byCategory = filtered.reduce<Record<string, typeof documents>>((acc, doc) => {
    (acc[doc.category] ??= []).push(doc);
    return acc;
  }, {});

  if (collapsed) {
    return (
      <div
        className="flex h-full w-11 shrink-0 flex-col items-center border-r pt-4"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <button
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          title="Expand sidebar (Cmd/Ctrl+B)"
          className="rounded-md p-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-r"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
    >
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-heading">DocSphere</span>
        <button
          onClick={toggleSidebar}
          aria-label="Collapse sidebar"
          title="Collapse sidebar (Cmd/Ctrl+B)"
          className="rounded-md p-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-label"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
        >
          <Plus size={14} /> Add doc
        </button>
      </div>

      <div className="px-3 pb-3">
        <div
          className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Search size={14} color="var(--color-text-muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs..."
            className="w-full bg-transparent text-body outline-none placeholder:text-[color:var(--color-text-faint)]"
          />
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 pb-3">
        <Link
          to="/library"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-label"
          style={{
            backgroundColor: pathname === "/library" ? "var(--color-accent)" : "transparent",
            color: "var(--color-text)",
          }}
        >
          <Library size={14} /> Library
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-label"
          style={{
            backgroundColor: pathname === "/settings" ? "var(--color-accent)" : "transparent",
            color: "var(--color-text)",
          }}
        >
          <SettingsIcon size={14} /> Settings
        </Link>
      </nav>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {Object.entries(byCategory).length === 0 && (
          <p className="px-2 py-2 text-caption">No documents yet.</p>
        )}
        {Object.entries(byCategory).map(([category, docs]) => (
          <div key={category} className="mb-4">
            <p className="px-2 pb-1 text-caption uppercase tracking-wide">{category}</p>
            {docs.map((doc) => (
              <Link
                key={doc.id}
                to={`/doc/${doc.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-label"
                style={{
                  backgroundColor: pathname === `/doc/${doc.id}` ? "var(--color-accent)" : "transparent",
                  color: "var(--color-text)",
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </span>
                <span className="shrink-0 text-caption">{Math.round(doc.scrollProgress)}%</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
