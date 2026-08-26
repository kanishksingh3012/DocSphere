export interface ToCItem {
  id: string;
  text: string;
  level: number;
}

export interface DocumentRecord {
  id: string;
  userId: string | null;
  sourceUrl: string;
  domain: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
  outline: ToCItem[];
  scrollProgress: number;
  isCompleted: boolean;
  addedAt: number;
  lastReadAt: number;
  updatedAt: number;
}

export interface WorkspaceSettings {
  id: "settings";
  theme: "dark" | "light" | "system";
  fontSize: number;
  autoScrollToLastPosition: boolean;
  sidebarCollapsedByDefault: boolean;
  storageWarningDismissed: boolean;
}

export type IngestionStepId = "fetch" | "convert" | "outline" | "cache";

export interface IngestionStep {
  id: IngestionStepId;
  label: string;
  status: "pending" | "active" | "done" | "failed";
  error?: string;
}
