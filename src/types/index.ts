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

/** A candidate term (a doc title or heading) that other docs can be cross-referenced against. */
export interface ReferenceTerm {
  term: string;
  targetDocId: string;
  targetTitle: string;
  targetHeadingId?: string;
  targetHeadingText?: string;
}

/** A cross-reference match the reader has selected, shown in the References panel. */
export interface CrossReferenceMatch extends ReferenceTerm {
  snippet: string;
}
