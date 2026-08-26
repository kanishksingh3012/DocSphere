import { db } from "./db";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { DocumentRecord } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

function toRow(doc: DocumentRecord, userId: string) {
  return {
    id: doc.id,
    user_id: userId,
    source_url: doc.sourceUrl,
    domain: doc.domain,
    title: doc.title,
    category: doc.category,
    tags: doc.tags,
    content: doc.content,
    outline: doc.outline,
    scroll_progress: doc.scrollProgress,
    is_completed: doc.isCompleted,
    added_at: doc.addedAt,
    last_read_at: doc.lastReadAt,
    updated_at: doc.updatedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): DocumentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    sourceUrl: row.source_url,
    domain: row.domain,
    title: row.title,
    category: row.category,
    tags: row.tags ?? [],
    content: row.content,
    outline: row.outline ?? [],
    scrollProgress: row.scroll_progress,
    isCompleted: row.is_completed,
    addedAt: row.added_at,
    lastReadAt: row.last_read_at,
    updatedAt: row.updated_at,
  };
}

/** Upserts a local doc to Supabase. Local write always happens first and wins offline. */
export async function pushDocument(doc: DocumentRecord, userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("documents").upsert(toRow(doc, userId));
  if (error) console.error("Sync push failed:", error.message);
}

export async function deleteRemoteDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) console.error("Sync delete failed:", error.message);
}

/** Pulls all remote docs and merges into IndexedDB, last-write-wins on updatedAt. */
export async function pullDocuments(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data, error } = await supabase.from("documents").select("*").eq("user_id", userId);
  if (error) {
    console.error("Sync pull failed:", error.message);
    return;
  }

  for (const row of data ?? []) {
    const remote = fromRow(row);
    const local = await db.documents.get(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      await db.documents.put(remote);
    }
  }
}

/** Subscribes to live changes on this user's documents so a second device stays in sync. */
export function subscribeToRemoteChanges(
  userId: string,
  onChange: (doc: DocumentRecord) => void,
): RealtimeChannel | null {
  if (!isSupabaseConfigured) return null;

  return supabase
    .channel(`documents-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "documents", filter: `user_id=eq.${userId}` },
      async (payload) => {
        if (payload.eventType === "DELETE") return;
        const remote = fromRow(payload.new);
        const local = await db.documents.get(remote.id);
        if (!local || remote.updatedAt > local.updatedAt) {
          await db.documents.put(remote);
          onChange(remote);
        }
      },
    )
    .subscribe();
}
