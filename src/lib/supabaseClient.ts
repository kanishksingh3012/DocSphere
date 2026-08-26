import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Falls back to a harmless dummy client when env vars aren't set yet, so the
// app still runs fully local-only (no sync, no auth) until Supabase is wired up.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-anon-key");
