import { BookOpen } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
}

export function EmptyState({ title, description, ctaLabel }: EmptyStateProps) {
  const setAddModalOpen = useAppStore((s) => s.setAddModalOpen);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        <BookOpen size={20} color="var(--color-text-muted)" />
      </div>
      <h2 className="text-heading">{title}</h2>
      <p className="max-w-sm text-body" style={{ color: "var(--color-text-muted)" }}>
        {description}
      </p>
      {ctaLabel && (
        <button
          onClick={() => setAddModalOpen(true)}
          className="mt-2 rounded-md px-4 py-2 text-label"
          style={{ backgroundColor: "var(--color-primary)", color: "var(--accent-foreground)" }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
