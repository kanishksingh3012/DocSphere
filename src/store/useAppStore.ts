import { create } from "zustand";
import { db, DEFAULT_SETTINGS } from "@/lib/db";
import { pushDocument, deleteRemoteDocument } from "@/lib/syncService";
import type { DocumentRecord, WorkspaceSettings } from "@/types";

interface AppState {
  settings: WorkspaceSettings;
  sidebarCollapsed: boolean;
  addModalOpen: boolean;
  activeUserId: string | null;

  setActiveUserId: (userId: string | null) => void;
  toggleSidebar: () => void;
  setAddModalOpen: (open: boolean) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<WorkspaceSettings>) => Promise<void>;

  addDocument: (doc: DocumentRecord) => Promise<void>;
  updateScrollProgress: (id: string, scrollProgress: number) => Promise<void>;
  toggleCompleted: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
}

async function syncAfterWrite(doc: DocumentRecord, userId: string | null) {
  if (userId) await pushDocument(doc, userId);
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  sidebarCollapsed: false,
  addModalOpen: false,
  activeUserId: null,

  setActiveUserId: (userId) => set({ activeUserId: userId }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setAddModalOpen: (open) => set({ addModalOpen: open }),

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
