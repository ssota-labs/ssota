import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import type { FileDropPreview } from "@repo/ui";
import { ControlsPanel } from "./controls-panel";
import { ToolcraftRoot } from "./toolcraft-root";
import { useToolcraft } from "./use-toolcraft";

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/ui")>();

  return {
    ...actual,
    FileDrop: ({
      assetKind = "image",
      onPreviewReorder,
      previews = [],
    }: {
      assetKind?: "file" | "image";
      onPreviewReorder?: (previews: FileDropPreview[]) => void;
      previews?: readonly FileDropPreview[];
    }) => (
      <button
        onClick={() => {
          onPreviewReorder?.([...previews].reverse());
        }}
        type="button"
      >
        Reorder {assetKind}
      </button>
    ),
  };
});

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
    writable: true,
  });
});

afterEach(() => {
  cleanup();
});

function StateProbe() {
  const { state } = useToolcraft();

  return (
    <span data-testid="media-ids">
      {state.mediaAssets.map((asset) => asset.id).join(",")}
    </span>
  );
}

describe("ControlsPanel fileDrop reorder integration", () => {
  it("commits image and file preview sorting back to runtime media order separately", async () => {
    const schema = defineToolcraft({
      canvas: { enabled: true, upload: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                images: {
                  label: "Images",
                  multiple: true,
                  target: "input.images",
                  type: "fileDrop",
                },
                files: {
                  assetKind: "file",
                  label: "Files",
                  multiple: true,
                  target: "input.files",
                  type: "fileDrop",
                },
              },
              title: "Sources",
            },
          ],
          title: "Controls",
        },
      },
    });

    render(
      <ToolcraftRoot
        initialState={{
          layers: [
            { id: "layer-img-1", kind: "layer", name: "Image 1", visible: true },
            { id: "layer-file-1", kind: "layer", name: "File 1", visible: true },
            { id: "layer-img-2", kind: "layer", name: "Image 2", visible: true },
            { id: "layer-file-2", kind: "layer", name: "File 2", visible: true },
          ],
          mediaAssets: [
            {
              assetKind: "image",
              dataUrl: "data:image/png;base64,aW1nMQ==",
              fileName: "one.png",
              id: "img-1",
              layerId: "layer-img-1",
              mimeType: "image/png",
              position: { x: 0, y: 0 },
              size: { height: 64, unit: "px", width: 64 },
              sourceTarget: "input.images",
            },
            {
              assetKind: "file",
              dataUrl: "data:text/plain;base64,ZmlsZTE=",
              fileName: "one.txt",
              id: "file-1",
              layerId: "layer-file-1",
              mimeType: "text/plain",
              position: { x: 0, y: 0 },
              sourceTarget: "input.files",
            },
            {
              assetKind: "image",
              dataUrl: "data:image/png;base64,aW1nMg==",
              fileName: "two.png",
              id: "img-2",
              layerId: "layer-img-2",
              mimeType: "image/png",
              position: { x: 0, y: 0 },
              size: { height: 64, unit: "px", width: 64 },
              sourceTarget: "input.images",
            },
            {
              assetKind: "file",
              dataUrl: "data:application/json;base64,e30=",
              fileName: "two.json",
              id: "file-2",
              layerId: "layer-file-2",
              mimeType: "application/json",
              position: { x: 0, y: 0 },
              sourceTarget: "input.files",
            },
          ],
          selectedLayerId: "layer-file-2",
        }}
        schema={schema}
      >
        <ControlsPanel framed={false} />
        <StateProbe />
      </ToolcraftRoot>,
    );

    expect(screen.getByTestId("media-ids").textContent).toBe(
      "img-1,file-1,img-2,file-2",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reorder image" }));

    expect(screen.getByTestId("media-ids").textContent).toBe(
      "img-2,file-1,img-1,file-2",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reorder file" }));

    expect(screen.getByTestId("media-ids").textContent).toBe(
      "img-2,file-2,img-1,file-1",
    );
  });
});
