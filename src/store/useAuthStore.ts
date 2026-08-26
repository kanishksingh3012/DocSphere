import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface AuthState {
  session: Session | null;
  loading: boolean;
  init: () => void;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: isSupabaseConfigured,

  init: () => {
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, loading: false });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },

  signInWithEmail: async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Supabase isn't configured yet — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." };
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
