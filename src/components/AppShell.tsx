import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AddDocModal } from "./AddDocModal";
import { CommandPalette } from "./CommandPalette";
import { useAppStore } from "@/store/useAppStore";

export function AppShell() {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Toggles the reading-mode heading tree (a no-op outside Workspace, since
      // nothing reads sidebarCollapsed elsewhere).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar, setCommandPaletteOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
      <AddDocModal />
      <CommandPalette />
    </div>
  );
}
