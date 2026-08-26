import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ToCItem } from "@/types";

interface OutlineProps {
  outline: ToCItem[];
}

interface TreeNode {
  item: ToCItem;
  children: TreeNode[];
}

function buildTree(items: ToCItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const stack: TreeNode[] = [];

  for (const item of items) {
    const node: TreeNode = { item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].item.level >= item.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return root;
}

function OutlineNode({
  node,
  depth,
  activeId,
  collapsed,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.item.id);
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
            <OutlineNode
              key={child.item.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Outline({ outline }: OutlineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(outline), [outline]);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
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

  if (outline.length === 0) {
    return <p className="text-caption px-3 py-4">No headings found in this doc.</p>;
  }

  return (
    <nav aria-label="Table of contents" className="flex flex-col gap-0.5 px-2 py-3">
      {tree.map((node) => (
        <OutlineNode
          key={node.item.id}
          node={node}
          depth={0}
          activeId={activeId}
          collapsed={collapsed}
          onToggle={toggle}
        />
      ))}
    </nav>
  );
}
