import type { DocumentRecord } from "@/types";

/** Case-insensitive title search. Its own module so the palette UI never has to know how matching works. */
export function searchDocuments(docs: DocumentRecord[], query: string): DocumentRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return docs;
  return docs.filter((d) => d.title.toLowerCase().includes(q));
}
