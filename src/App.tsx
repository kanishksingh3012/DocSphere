import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Workspace } from "@/screens/Workspace";
import { Library } from "@/screens/Library";
import { Settings } from "@/screens/Settings";
import { Auth } from "@/screens/Auth";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { pullDocuments, subscribeToRemoteChanges } from "@/lib/syncService";

export default function App() {
  const loadSettings = useAppStore((s) => s.loadSettings);
  const settings = useAppStore((s) => s.settings);
  const setActiveUserId = useAppStore((s) => s.setActiveUserId);

  const initAuth = useAuthStore((s) => s.init);
  const session = useAuthStore((s) => s.session);
  const authLoading = useAuthStore((s) => s.loading);
  const [skippedAuth, setSkippedAuth] = useState(false);

  useEffect(() => {
    loadSettings();
    initAuth();
  }, [loadSettings, initAuth]);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.setAttribute("data-theme", dark ? "dark" : "light");
    };
    applyTheme();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", applyTheme);
    return () => mql.removeEventListener("change", applyTheme);
  }, [settings.theme]);

  useEffect(() => {
    if (!session?.user) {
      setActiveUserId(null);
      return;
    }
    setActiveUserId(session.user.id);
    pullDocuments(session.user.id);
    const channel = subscribeToRemoteChanges(session.user.id, () => {});
    return () => {
      channel?.unsubscribe();
    };
  }, [session, setActiveUserId]);

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center text-body">Loading…</div>;
  }

  if (isSupabaseConfigured && !session && !skippedAuth) {
    return (
      <Auth
        onSkip={() => {
          setActiveUserId(null);
          setSkippedAuth(true);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Workspace />} />
          <Route path="/doc/:docId" element={<Workspace />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
