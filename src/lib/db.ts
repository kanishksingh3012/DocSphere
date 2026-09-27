import Dexie, { type Table } from "dexie";
import type { DocumentRecord, WorkspaceSettings } from "@/types";

class DocSphereDB extends Dexie {
  documents!: Table<DocumentRecord, string>;
  settings!: Table<WorkspaceSettings, string>;

  constructor() {
    super("docsphere");
    this.version(1).stores({
      documents: "id, category, domain, addedAt, lastReadAt, updatedAt",
      settings: "id",
    });
  }
}

export const db = new DocSphereDB();

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  id: "settings",
  theme: "system",
  colorTheme: "default",
  fontSize: 16,
  autoScrollToLastPosition: true,
  sidebarCollapsedByDefault: false,
  storageWarningDismissed: false,
};

export async function getSettings(): Promise<WorkspaceSettings> {
  const existing = await db.settings.get("settings");
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function estimateStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
