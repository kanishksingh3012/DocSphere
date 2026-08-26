const HINTS: [string, string][] = [
  ["Cmd/Ctrl+B", "Toggle sidebar"],
  ["j / k", "Scroll down / up"],
  ["Cmd/Ctrl+Enter", "Mark section complete"],
  ["Cmd/Ctrl+D", "Toggle doc complete"],
];

export function ShortcutHintBar() {
  return (
    <div
      className="flex shrink-0 items-center gap-4 overflow-x-auto border-t px-4 py-1.5"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
    >
      {HINTS.map(([key, label]) => (
        <span key={key} className="flex shrink-0 items-center gap-1.5 text-caption">
          <kbd
            className="rounded border px-1.5 py-0.5"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-accent)" }}
          >
            {key}
          </kbd>
          {label}
        </span>
      ))}
    </div>
  );
}
