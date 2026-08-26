import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { buildTree, type TreeNode } from "@/lib/markdown";
import type { ToCItem } from "@/types";

interface HeadingTreeProps {
  outline: ToCItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function HeadingNode({
  node,
  depth,
  activeId,
  collapsedIds,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.item.id);
  const isActive = activeId === node.item.id;

  return (
    <div>
      <div
        className="flex items-center gap-1 rounded-md pr-2 transition-colors"
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          backgroundColor: isActive ? "var(--color-accent)" : "transparent",
        }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.item.id)}
            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
            className="flex h-4 w-4 shrink-0 items-center justify-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <a
          href={`#${node.item.id}`}
          className="min-w-0 flex-1 truncate py-1 text-label"
          style={{
            color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
            fontWeight: isActive ? 600 : 500,
          }}
        >
          {node.item.text}
        </a>
      </div>

      {hasChildren && !isCollapsed && (
        <div>
          {node.children.map((child) => (
            <HeadingNode
              key={child.item.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Left-panel nested outline of the CURRENTLY OPEN document only — its own
 * headings, nested to whatever depth they actually have. This is not a list
 * of other documents; switching documents happens through the command
 * palette instead.
 */
export function HeadingTree({ outline, collapsed, onToggleCollapsed }: HeadingTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(outline), [outline]);

  const toggleNode = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const headingEls = outline
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -70% 0px" },
    );

    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [outline]);

  if (collapsed) {
    return (
      <div
        className="flex h-full w-9 shrink-0 flex-col items-center border-r pt-3"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <button
          onClick={onToggleCollapsed}
          aria-label="Show outline"
          title="Show outline (Cmd/Ctrl+B)"
          className="rounded-md p-1.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <aside
      className="flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-label">Outline</span>
        <button
          onClick={onToggleCollapsed}
          aria-label="Hide outline"
          title="Hide outline (Cmd/Ctrl+B)"
          className="rounded-md p-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {outline.length === 0 ? (
        <p className="px-4 py-4 text-caption">No headings found in this doc.</p>
      ) : (
        <nav aria-label="Document outline" className="flex flex-col gap-0.5 px-2 py-3">
          {tree.map((node) => (
            <HeadingNode
              key={node.item.id}
              node={node}
              depth={0}
              activeId={activeId}
              collapsedIds={collapsedIds}
              onToggle={toggleNode}
            />
          ))}
        </nav>
      )}
    </aside>
  );
}
