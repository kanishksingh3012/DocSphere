import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const raw = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-md border px-2 py-1 text-caption opacity-0 transition-opacity group-hover:opacity-100"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
        aria-label="Copy code"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
