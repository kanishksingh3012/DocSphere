import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export function Auth({ onSkip }: { onSkip: () => void }) {
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signInWithEmail(email);
    if (error) setError(error);
    else setSent(true);
  };

  return (
    <div className="flex h-full items-center justify-center px-4" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="w-full max-w-sm rounded-lg border p-6" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
        <h1 className="mb-1 text-heading">Sign in to DocSphere</h1>
        <p className="mb-5 text-caption">Sync your reading progress across devices. Optional — you can also read fully offline on this device only.</p>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-md border p-3 text-caption" style={{ borderColor: "var(--color-border)" }}>
            Sync isn't configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.
          </p>
        )}

        {sent ? (
          <p className="text-body">Check {email} for a magic sign-in link.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={!isSupabaseConfigured}
              className="rounded-md border px-3 py-2 text-body"
              style={{ borderColor: "var(--color-border)" }}
            />
            {error && (
              <p className="text-caption" style={{ color: "var(--color-danger)" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!isSupabaseConfigured}
              className="rounded-md px-3 py-2 text-label disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
            >
              Send magic link
            </button>
          </form>
        )}

        <button onClick={onSkip} className="mt-4 w-full text-center text-caption underline">
          Continue without an account
        </button>
      </div>
    </div>
  );
}
