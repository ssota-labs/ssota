import { useEffect, useRef, type ReactNode } from "react";

import { useDesignLab } from "../context/design-lab-context";
import { resolveSelection } from "../lib/token-resolver";

type PreviewCanvasProps = {
  children: ReactNode;
};

const HIGHLIGHT_CLASS = "design-lab-selected";

export function PreviewCanvas({ children }: PreviewCanvasProps) {
  const { isDark, selection, setSelection } = useDesignLab();
  const canvasRef = useRef<HTMLDivElement>(null);
  const prevHighlighted = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (prevHighlighted.current) {
      prevHighlighted.current.classList.remove(HIGHLIGHT_CLASS);
      prevHighlighted.current = null;
    }
    if (selection?.element) {
      selection.element.classList.add(HIGHLIGHT_CLASS);
      prevHighlighted.current = selection.element;
    }
  }, [selection]);

  function handleClick(event: React.MouseEvent) {
    const resolved = resolveSelection(event.target);
    setSelection(resolved);
  }

  return (
    <div className="flex h-full flex-col">
      <style>{`
        .design-lab-selected {
          outline: 2px solid oklch(0.52 0.105 223.128 / 0.6) !important;
          outline-offset: 2px;
        }
      `}</style>
      <div
        ref={canvasRef}
        className={isDark ? "dark flex-1 overflow-auto" : "flex-1 overflow-auto"}
        onClick={handleClick}
      >
        <div className="style-ssota design-lab-preview min-h-full bg-background p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
