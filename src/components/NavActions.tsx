import { Link } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

/**
 * The command palette (Cmd/Ctrl+K) has no other visible affordance anywhere
 * in the app, and Settings was only reachable by searching for it inside
 * that palette — both real discoverability gaps. This gives every header a
 * visible, clickable hint for the shortcut plus a direct Settings link.
 */
export function NavActions() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setCommandPaletteOpen(true)}
        title="Search docs (Cmd/Ctrl+K)"
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-caption"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <kbd className="font-mono">⌘K</kbd> Search
      </button>
      <Link
        to="/settings"
        aria-label="Settings"
        title="Settings"
        className="flex items-center justify-center rounded-md border p-2"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <SettingsIcon size={14} />
      </Link>
    </div>
  );
}
