import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { ColorTheme } from "@/types";

export const COLOR_THEMES: { id: ColorTheme; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "oklch(0.6204 0.195 253.83)" },
  { id: "violet", label: "Violet", swatch: "oklch(0.56 0.21 293)" },
  { id: "emerald", label: "Emerald", swatch: "oklch(0.56 0.14 162)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.58 0.2 12)" },
];

/** Quick light/dark toggle + color theme swatches for the top bar. */
export function ThemeControls() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  // Derived from settings, not the <html> class: App.tsx applies the class in
  // an effect after render, so reading it here would lag one toggle behind.
  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="flex items-center gap-1">
      <div role="radiogroup" aria-label="Color theme" className="flex items-center gap-1 px-1">
        {COLOR_THEMES.map((t) => {
          const active = settings.colorTheme === t.id;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={active}
              aria-label={`${t.label} theme`}
              title={t.label}
              onClick={() => updateSettings({ colorTheme: t.id })}
              className="h-4 w-4 rounded-full outline-offset-2 transition-transform focus-visible:outline-2"
              style={{
                backgroundColor: t.swatch,
                outline: active ? "2px solid var(--foreground)" : undefined,
                outlineOffset: 2,
                transform: active ? "scale(1.1)" : undefined,
              }}
            />
          );
        })}
      </div>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onPress={() => updateSettings({ theme: isDark ? "light" : "dark" })}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </Button>
    </div>
  );
}
