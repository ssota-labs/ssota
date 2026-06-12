"use client";

export function SchemaCanvasStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .schema-canvas .react-flow__edge { z-index: 1 !important; }
          .schema-canvas .react-flow__edge-labels { z-index: 2 !important; }
          .schema-canvas .react-flow__node { z-index: 3 !important; }
          .schema-canvas .react-flow__node.selected { z-index: 4 !important; }
          .schema-canvas .react-flow__handle { opacity: 0; transition: opacity 0.15s ease; }
          .schema-canvas .react-flow__node:hover .react-flow__handle,
          .schema-canvas .react-flow__node.selected .react-flow__handle { opacity: 1; }
        `,
      }}
    />
  );
}
