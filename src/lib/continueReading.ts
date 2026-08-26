import type { DocumentRecord } from "@/types";

/** The doc to resume: most recently read, genuinely in progress (not 0%, not done). */
export function getContinueReadingDoc(docs: DocumentRecord[]): DocumentRecord | null {
  const inProgress = docs.filter((d) => !d.isCompleted && d.scrollProgress > 0 && d.scrollProgress < 100);
  if (inProgress.length === 0) return null;
  return inProgress.reduce((a, b) => (b.lastReadAt > a.lastReadAt ? b : a));
}

/** Next most-recently-opened docs, excluding whichever one is already shown as "continue reading". */
export function getRecentDocs(docs: DocumentRecord[], excludeId: string | null, limit = 4): DocumentRecord[] {
  return docs
    .filter((d) => d.id !== excludeId)
    .sort((a, b) => b.lastReadAt - a.lastReadAt)
    .slice(0, limit);
}
