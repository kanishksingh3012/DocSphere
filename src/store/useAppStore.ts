import { create } from "zustand";
import { db, DEFAULT_SETTINGS } from "@/lib/db";
import { pushDocument, deleteRemoteDocument } from "@/lib/syncService";
import { ingestDocument } from "@/lib/docFetcher";
import type { DocumentRecord, WorkspaceSettings } from "@/types";

interface AppState {
  settings: WorkspaceSettings;
  /** Collapse state of the reading-mode heading tree (HeadingTree.tsx) — not a global sidebar. */
  sidebarCollapsed: boolean;
  addModalOpen: boolean;
  commandPaletteOpen: boolean;
  activeUserId: string | null;

  setActiveUserId: (userId: string | null) => void;
  toggleSidebar: () => void;
  setAddModalOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<WorkspaceSettings>) => Promise<void>;

  addDocument: (doc: DocumentRecord) => Promise<void>;
  updateScrollProgress: (id: string, scrollProgress: number) => Promise<void>;
  toggleCompleted: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  refreshDocument: (id: string) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
}

async function syncAfterWrite(doc: DocumentRecord, userId: string | null) {
  if (userId) await pushDocument(doc, userId);
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  sidebarCollapsed: false,
  addModalOpen: false,
  commandPaletteOpen: false,
  activeUserId: null,

  setActiveUserId: (userId) => set({ activeUserId: userId }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setAddModalOpen: (open) => set({ addModalOpen: open }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  loadSettings: async () => {
    const existing = await db.settings.get("settings");
    const settings = existing ?? DEFAULT_SETTINGS;
    if (!existing) await db.settings.put(DEFAULT_SETTINGS);
    set({ settings, sidebarCollapsed: settings.sidebarCollapsedByDefault });
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    await db.settings.put(next);
    set({ settings: next });
  },

  addDocument: async (doc) => {
    const userId = get().activeUserId;
    const record = { ...doc, userId };
    await db.documents.put(record);
    await syncAfterWrite(record, userId);
  },

  updateScrollProgress: async (id, scrollProgress) => {
    const doc = await db.documents.get(id);
    if (!doc) return;
    const updated: DocumentRecord = {
      ...doc,
      scrollProgress,
      lastReadAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.documents.put(updated);
    await syncAfterWrite(updated, get().activeUserId);
  },

  toggleCompleted: async (id) => {
    const doc = await db.documents.get(id);
    if (!doc) return;
    const updated: DocumentRecord = {
      ...doc,
      isCompleted: !doc.isCompleted,
      scrollProgress: !doc.isCompleted ? 100 : doc.scrollProgress,
      updatedAt: Date.now(),
    };
    await db.documents.put(updated);
    await syncAfterWrite(updated, get().activeUserId);
  },

  // Re-ingests a doc from its source URL into the same record — the way to
  // fix docs saved before extraction improvements — keeping reading state.
  refreshDocument: async (id) => {
    const doc = await db.documents.get(id);
    if (!doc) return;
    const fresh = await ingestDocument({ sourceUrl: doc.sourceUrl, category: doc.category, tags: doc.tags });
    const updated: DocumentRecord = {
      ...fresh,
      id: doc.id,
      userId: doc.userId,
      scrollProgress: doc.scrollProgress,
      isCompleted: doc.isCompleted,
      addedAt: doc.addedAt,
      lastReadAt: doc.lastReadAt,
      updatedAt: Date.now(),
    };
    await db.documents.put(updated);
    await syncAfterWrite(updated, get().activeUserId);
  },

  deleteDocument: async (id) => {
    await db.documents.delete(id);
    await deleteRemoteDocument(id);
  },

  clearAllDocuments: async () => {
    const ids = await db.documents.toCollection().primaryKeys();
    await db.documents.clear();
    await Promise.all(ids.map((id) => deleteRemoteDocument(String(id))));
  },
}));
