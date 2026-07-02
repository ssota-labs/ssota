import { describe, expect, it } from "vitest";

import { defineToolcraft } from "../schema/define-toolcraft";
import {
  collectToolcraftPerformanceSensitiveControls,
  collectToolcraftUnclassifiedPerformanceControls,
  defineToolcraftPerformance,
  defaultToolcraftBrowserCheckPolicy,
  type ToolcraftBrowserCheckPolicy,
  validateToolcraftPerformanceCoverage,
} from "./performance";

const testSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            density: {
              defaultValue: 4,
              label: "Density",
              max: 12,
              min: 1,
              performanceReason: "Density changes the amount of rendered output.",
              performanceRole: "workload",
              target: "render.density",
              type: "slider",
            },
            mode: {
              defaultValue: "soft",
              label: "Mode",
              options: [
                { label: "Soft", value: "soft" },
                { label: "Sharp", value: "sharp" },
              ],
              performanceReason: "Mode changes rendering branches but not workload size.",
              performanceRole: "responsiveness",
              target: "render.mode",
              type: "select",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

const ordinarySliderSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            opacity: {
              defaultValue: 50,
              label: "Opacity",
              max: 100,
              min: 0,
              performanceReason: "Opacity changes a lightweight uniform value.",
              performanceRole: "responsiveness",
              target: "render.opacity",
              type: "slider",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

const rangeSliderSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            band: {
              defaultValue: [20, 80],
              label: "Band",
              max: 100,
              min: 0,
              performanceReason: "Band changes a lightweight bounded interval.",
              performanceRole: "responsiveness",
              target: "render.band",
              type: "rangeSlider",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

const largeTextSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            content: {
              defaultValue: "",
              label: "Content",
              performanceReason: "Content length changes text layout and renderer workload.",
              performanceRole: "workload",
              target: "product.content",
              type: "code",
            },
          },
        },
      ],
      title: "Runtime Controls",
    },
  },
});

const mediaUploadSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "intrinsic-media" },
    upload: true,
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            source: {
              defaultValue: null,
              label: "Source image",
              performanceReason: "Uploaded media dimensions change renderer workload.",
              performanceRole: "responsiveness",
              target: "source.image",
              type: "fileDrop",
            },
          },
          title: "Source",
        },
      ],
      title: "Runtime Controls",
    },
  },
});

function createViewportZoomStressScenario() {
  return {
    automated: true,
    automatedTestName: "perf: detailed canvas zoom stays smooth",
    browser: true,
    browserTestName: "browser perf: detailed canvas zoom stays smooth",
    budget: { maxFrameGapMs: 80, maxInteractionMs: 500, maxLongTaskMs: 80 },
    expectedObservable:
      "Zooming detailed product output does not shake the canvas or block frames.",
    fixture: "detailed renderer zoom fixture",
    id: "viewport-zoom-stress",
    interaction: "viewport-zoom-stress" as const,
    stress: true,
    stressFixture: createCombinedRendererStressFixture(),
    target: "canvas.viewport",
    workload: false,
  };
}

function createMaxValueStressFixture(value: unknown, reason = "Maximum workload value.") {
  return {
    kind: "max-value" as const,
    loadProfile: {
      hardLimit: value,
      metric: "numeric-max" as const,
      smoothTarget: value,
      smoothTargetRatio: 1,
      target: "render.density",
      userFacingRange: "fully-guaranteed" as const,
    },
    reason,
    value,
  };
}

function createCustomStressFixture(
  value: unknown = { density: 12 },
  reason = "Combined renderer stress state.",
) {
  return {
    kind: "custom" as const,
    loadProfile: {
      hardLimit: value,
      metric: "custom" as const,
      smoothTarget: value,
      smoothTargetRatio: 1,
      target: "renderer.output",
      userFacingRange: "fully-guaranteed" as const,
    },
    reason,
    value,
  };
}

function createCombinedRendererStressFixture() {
  return createCustomStressFixture(
    { density: 12, zoom: "toolbar" },
    "Stress checks must run with the densest product output visible.",
  );
}

function createLargeTextStressValue(): string {
  return Array.from(
    { length: 1_000 },
    (_, index) =>
      `Line ${String(index + 1).padStart(4, "0")} performance stress text with enough glyphs to exercise layout.`,
  ).join("\n");
}

function createLargeTextStressFixture() {
  return {
    kind: "large-text" as const,
    minChars: 50_000,
    minLines: 1_000,
    reason: "Long multiline content is the heaviest realistic text workload.",
    value: createLargeTextStressValue(),
  };
}

function createMediaStressFixture(
  value: { height: number; width: number } = { height: 1080, width: 1920 },
  reason = "Large uploaded source media is the heaviest realistic import fixture.",
) {
  return {
    kind: "media" as const,
    loadProfile: {
      hardLimit: value,
      metric: "media-area" as const,
      smoothTarget: value,
      smoothTargetRatio: 1,
      target: "source.image",
      userFacingRange: "fully-guaranteed" as const,
    },
    reason,
    value,
  };
}

function createDegradedMaxValueStressFixture() {
  return {
    kind: "max-value" as const,
    loadProfile: {
      degradationStepPercent: 10 as const,
      evidence: [
        {
          attemptedTarget: 12,
          decision: "Keep 12 available as high density while guaranteeing smooth drag through 11.",
          measuredResult: "At density 12, maxFrameGapMs 148 exceeded the 80ms budget.",
          optimizationAttempted: "Cached glyph atlas and coalesced preview work to requestAnimationFrame.",
          result: "failed" as const,
          scenarioId: "density-drag",
        },
      ],
      hardLimit: 12,
      metric: "numeric-max" as const,
      smoothTarget: 11,
      smoothTargetRatio: 0.9,
      target: "render.density",
      userFacingRange: "experimental-above-smooth" as const,
    },
    reason: "Density 11 is the measured smooth target after hard-limit testing.",
    value: 11,
  };
}

function createMeasuredWebglEvidence(scenarioId = "text-preview-render") {
  return [
    {
      alternativeStrategy: "webgl" as const,
      decision:
        "Canvas 2D remains selected because cached CPU rendering stayed within budget for this product fixture while preserving export parity.",
      fixture: "large product stress fixture at render scale 2",
      measuredResult:
        "WebGL comparison: maxFrameGapMs 72, maxLongTaskMs 64; Canvas 2D comparison: maxFrameGapMs 68, maxLongTaskMs 58.",
      scenarioId,
    },
  ];
}

function createTextRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["text-layout"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["text-layout"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["text-layout"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["product.content", "render.density", "render.mode"],
        id: "text-layout",
        inputs: ["product.content", "render.density", "render.mode"],
        invalidatedBy: ["product.content", "render.density", "render.mode"],
        kind: "text-layout",
        output: "preview",
        quality: "full",
        runsOn: "main",
      },
    ],
  } as const;
}

function createAnimatedVectorRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["vector-build"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["vector-build"],
        targets: ["render.mode"],
      },
      {
        interaction: "animation-frame",
        invalidates: ["animation-composite"],
        mustNotInvalidate: ["vector-build"],
        targets: ["animation.time"],
      },
      {
        interaction: "timeline-playback",
        invalidates: ["animation-composite"],
        mustNotInvalidate: ["vector-build"],
        targets: ["timeline.currentTime"],
      },
      {
        interaction: "timeline-scrub",
        invalidates: ["animation-composite"],
        mustNotInvalidate: ["vector-build"],
        targets: ["timeline.currentTime"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: ["vector-build", "animation-composite"],
        targets: ["canvas.viewport"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["vector-build", "animation-composite"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        id: "vector-build",
        inputs: ["render.density", "render.mode"],
        invalidatedBy: ["render.density", "render.mode"],
        kind: "vector-build",
        output: "preview",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["vector-build", "animation.time", "timeline.currentTime"],
        id: "animation-composite",
        inputs: ["vector-build", "animation.time", "timeline.currentTime"],
        invalidatedBy: ["animation.time", "timeline.currentTime"],
        kind: "composite",
        output: "preview",
        quality: "preview",
        runsOn: "main",
      },
    ],
  } as const;
}

function createDenseCanvasPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["dense-background", "export-composite"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["export-composite"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["dense-background", "export-composite"],
        targets: ["canvas.viewport"],
      },
      {
        interaction: "export",
        invalidates: ["export-composite"],
        mustNotInvalidate: ["dense-background"],
        targets: ["export.image.resolution"],
      },
    ],
    passes: [
      {
        cacheKey: ["render.density", "canvas.size", "canvas.renderScale"],
        id: "dense-background",
        inputs: ["render.density", "canvas.size", "canvas.renderScale"],
        invalidatedBy: ["render.density", "canvas.size", "canvas.renderScale"],
        kind: "rasterize",
        output: "preview",
        quality: "retina",
        runsOn: "worker",
      },
      {
        id: "semantic-foreground",
        inputs: ["product.geometry"],
        invalidatedBy: ["product.geometry"],
        kind: "vector-build",
        output: "preview",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: ["dense-background", "semantic-foreground", "export.image.resolution"],
        id: "export-composite",
        inputs: ["dense-background", "semantic-foreground", "export.image.resolution"],
        invalidatedBy: ["dense-background", "semantic-foreground", "export.image.resolution"],
        kind: "composite",
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
  } as const;
}

function createMainThreadCanvasCompositePipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["text-texture", "warp-composite", "optical-composite"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["text-texture", "warp-composite", "optical-composite"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["text-texture", "warp-composite", "optical-composite"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["product.content", "render.density", "canvas.size", "canvas.renderScale"],
        id: "text-texture",
        inputs: ["product.content", "render.density", "canvas.size", "canvas.renderScale"],
        invalidatedBy: ["product.content", "render.density", "canvas.size", "canvas.renderScale"],
        kind: "rasterize",
        output: "intermediate",
        quality: "retina",
        runsOn: "main",
      },
      {
        cacheKey: ["text-texture", "render.density", "canvas.size"],
        id: "warp-composite",
        inputs: ["text-texture", "render.density", "canvas.size"],
        invalidatedBy: ["text-texture", "render.density", "canvas.size"],
        kind: "composite",
        output: "preview",
        quality: "retina",
        runsOn: "main",
      },
      {
        cacheKey: ["warp-composite", "render.mode", "canvas.renderScale"],
        id: "optical-composite",
        inputs: ["warp-composite", "render.mode", "canvas.renderScale"],
        invalidatedBy: ["warp-composite", "render.mode", "canvas.renderScale"],
        kind: "composite",
        output: "preview",
        quality: "retina",
        runsOn: "main",
      },
    ],
  } as const;
}

function createPixelRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["pixel-transform"],
        targets: ["render.density"],
      },
      {
        interaction: "control-change",
        invalidates: ["pixel-transform"],
        targets: ["render.mode"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["pixel-transform"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["render.density", "render.mode", "canvas.size", "canvas.renderScale"],
        id: "pixel-transform",
        inputs: ["render.density", "render.mode", "canvas.size", "canvas.renderScale"],
        invalidatedBy: ["render.density", "render.mode", "canvas.size", "canvas.renderScale"],
        kind: "pixel-transform",
        output: "preview",
        quality: "retina",
        runsOn: "worker",
      },
    ],
  } as const;
}

function createMediaRendererPipeline() {
  return {
    interactionInvalidation: [
      {
        interaction: "media-import",
        invalidates: ["source-decode", "media-preprocess"],
        targets: ["source.image"],
      },
      {
        interaction: "control-drag",
        invalidates: ["effect-composite"],
        mustNotInvalidate: ["source-decode", "media-preprocess"],
        targets: ["render.density"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["source-decode", "media-preprocess", "effect-composite"],
        targets: ["canvas.viewport"],
      },
    ],
    passes: [
      {
        cacheKey: ["source.image.id", "source.image.width", "source.image.height"],
        id: "source-decode",
        inputs: ["source.image"],
        invalidatedBy: ["source.image"],
        kind: "decode",
        output: "source",
        quality: "full",
        runsOn: "worker",
      },
      {
        cacheKey: ["source-decode", "source.image.id"],
        id: "media-preprocess",
        inputs: ["source-decode"],
        invalidatedBy: ["source-decode"],
        kind: "preprocess",
        output: "intermediate",
        quality: "full",
        runsOn: "worker-or-gpu",
      },
      {
        cacheKey: ["media-preprocess", "render.density"],
        id: "effect-composite",
        inputs: ["media-preprocess", "render.density"],
        invalidatedBy: ["media-preprocess", "render.density"],
        kind: "composite",
        output: "preview",
        quality: "retina",
        runsOn: "gpu",
      },
    ],
  } as const;
}

function createTextRendererScenarios(
  options: { includeStressPreview?: boolean; includeViewportZoomStress?: boolean } = {},
) {
  const includeStressPreview = options.includeStressPreview ?? true;
  const includeViewportZoomStress = options.includeViewportZoomStress ?? true;

  return [
    {
      automated: true,
      automatedTestName: "perf: text preview render stays under budget",
      browser: true,
      browserTestName: "browser perf: text preview render stays under budget",
      budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
      expectedObservable: "Text preview renders crisply without freezing.",
      fixture: "native-resolution glyph output fixture",
      id: "text-preview-render",
      interaction: "preview-render" as const,
      stress: includeStressPreview,
      ...(includeStressPreview
        ? { stressFixture: createCombinedRendererStressFixture() }
        : {}),
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: density drag stays responsive",
      browser: true,
      browserTestName: "browser perf: density drag stays responsive",
      budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
      controlLabel: "Density",
      expectedObservable: "Dragging Density updates text output without blocking the UI.",
      fixture: "runtime density fixture",
      id: "density-drag",
      interaction: "control-drag" as const,
      stressFixture: createMaxValueStressFixture(
        12,
        "Density max is the heaviest glyph output fixture.",
      ),
      target: "render.density",
      values: { default: 4, max: 12, min: 1 },
      workloadFixture: createLargeTextStressFixture(),
      workload: true,
    },
    {
      automated: true,
      automatedTestName: "perf: mode change stays responsive",
      browser: true,
      browserTestName: "browser perf: mode change stays responsive",
      budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
      controlLabel: "Mode",
      expectedObservable: "Changing Mode updates text output without blocking the UI.",
      fixture: "runtime mode fixture",
      id: "mode-change",
      interaction: "control-change" as const,
      target: "render.mode",
      values: { default: "soft", max: "sharp", min: "soft" },
      workload: false,
    },
    {
      automated: true,
      automatedTestName: "perf: viewport stays stable",
      browser: true,
      browserTestName: "browser perf: viewport stays stable",
      budget: { maxFrameGapMs: 80 },
      expectedObservable: "Viewport remains stable.",
      fixture: "native-resolution glyph output fixture",
      id: "viewport-stability",
      interaction: "viewport-stability" as const,
      workload: false,
    },
    ...(includeViewportZoomStress ? [createViewportZoomStressScenario()] : []),
  ];
}

function createAnimationFrameScenario() {
  return {
    automated: true,
    automatedTestName: "perf: animation frame loop stays smooth",
    browser: true,
    browserTestName: "browser perf: animation frame loop stays smooth",
    budget: { maxFrameGapMs: 80, maxLongTaskMs: 80 },
    expectedObservable: "Animated renderer advances without long frame gaps.",
    fixture: "animated renderer fixture",
    id: "animation-frame-loop",
    interaction: "animation-frame" as const,
    stress: true,
    stressFixture: createCustomStressFixture(
      { animation: "fastest", density: 12 },
      "Animation stress must sample the heaviest animated output.",
    ),
    workload: false,
  };
}

function createAnimationViewportDragScenario() {
  return {
    automated: true,
    automatedTestName: "perf: animated canvas drag stays smooth",
    browser: true,
    browserTestName: "browser perf: animated canvas drag stays smooth",
    budget: { maxFrameGapMs: 80, maxInteractionMs: 500, maxLongTaskMs: 80 },
    expectedObservable: "Animated renderer stays smooth while the canvas viewport is dragged.",
    fixture: "animated renderer canvas drag fixture",
    id: "animation-viewport-drag",
    interaction: "animation-viewport-drag" as const,
    stress: true,
    stressFixture: createCustomStressFixture(
      { animation: "fastest", density: 12 },
      "Animated viewport drag must run while the heaviest animated output is visible.",
    ),
    target: "canvas.viewport",
    workload: false,
  };
}

function createAnimatedVectorRendererConfig(options: { includeViewportDrag: boolean }) {
  return defineToolcraftPerformance({
    rendererStrategy: "svg",
    rendererTechnique: {
      exportRenderer: "svg",
      fidelityRisks: ["animated vector output must stay crisp while panning"],
      performanceRisks: ["dense vector animation can jank while the viewport moves"],
      previewRenderer: "svg",
      productRepresentation: "vector",
      rendererStrategy: "svg",
      rendererWorkload: "vector-output",
      sourceRepresentation: "procedural-data",
      whyNotAlternativeStrategies: ["svg preserves semantic vector output for this fixture"],
    },
    rendererWorkload: "vector-output",
    rendererPipeline: createAnimatedVectorRendererPipeline(),
    scenarios: [
      ...createTextRendererScenarios(),
      createAnimationFrameScenario(),
      ...(options.includeViewportDrag ? [createAnimationViewportDragScenario()] : []),
    ],
    usesCustomRenderer: true,
    workloadTargets: ["render.density"],
  });
}

describe("Toolcraft template performance contract", () => {
  it("defaults browser checks to agent browser with Playwright fallback", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: opacity drag stays responsive",
          browser: true,
          browserTestName: "browser perf: opacity drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Opacity",
          expectedObservable: "Dragging Opacity stays responsive.",
          fixture: "opacity responsiveness fixture",
          id: "opacity-drag",
          interaction: "control-drag",
          target: "render.opacity",
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(config.browserCheckPolicy).toEqual(defaultToolcraftBrowserCheckPolicy);
    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toEqual([]);
  });

  it("rejects explicit Playwright-first browser check policies", () => {
    const config = defineToolcraftPerformance({
      browserCheckPolicy: {
        fallbackRunner: "playwright",
        fallbackWhen: ["agent-browser-unavailable"],
        preferredRunner: "playwright",
      } as unknown as ToolcraftBrowserCheckPolicy,
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: opacity drag stays responsive",
          browser: true,
          browserTestName: "browser perf: opacity drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Opacity",
          expectedObservable: "Dragging Opacity stays responsive.",
          fixture: "opacity responsiveness fixture",
          id: "opacity-drag",
          interaction: "control-drag",
          target: "render.opacity",
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toEqual(
      expect.arrayContaining([
        'browserCheckPolicy.preferredRunner must be "agent-browser" so AI agents use their controlled browser before fallback automation.',
        'browserCheckPolicy.fallbackWhen must include "ci" so CI/non-agent automation has a portable performance runner.',
      ]),
    );
  });

  it("collects performance-sensitive controls from schema", () => {
    expect(collectToolcraftPerformanceSensitiveControls(testSchema)).toEqual([
      expect.objectContaining({
        controlId: "density",
        target: "render.density",
      }),
    ]);
  });

  it("does not classify every slider as workload-sensitive", () => {
    expect(collectToolcraftPerformanceSensitiveControls(ordinarySliderSchema)).toEqual([]);
  });

  it("collects explicit workload controls even when labels do not match fallback keywords", () => {
    const explicitWorkloadSchema = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "intrinsic-media" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                complexity: {
                  defaultValue: 4,
                  label: "Complexity",
                  max: 12,
                  min: 1,
                  performanceReason: "Complexity changes the number of render passes.",
                  performanceRole: "workload",
                  target: "render.complexity",
                  type: "slider",
                },
              },
            },
          ],
          title: "Runtime Controls",
        },
      },
    });

    expect(collectToolcraftPerformanceSensitiveControls(explicitWorkloadSchema)).toEqual([
      expect.objectContaining({
        controlId: "complexity",
        target: "render.complexity",
      }),
    ]);
  });

  it("collects visible controls without explicit performance classification", () => {
    const unclassifiedSchema = defineToolcraft({
      canvas: {
        enabled: true,
        renderScale: true,
        sizing: { mode: "intrinsic-media" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                mode: {
                  defaultValue: "soft",
                  label: "Mode",
                  options: [
                    { label: "Soft", value: "soft" },
                    { label: "Sharp", value: "sharp" },
                  ],
                  target: "render.mode",
                  type: "select",
                },
              },
            },
          ],
          title: "Runtime Controls",
        },
        timeline: { mode: "playback" },
      },
    });

    expect(collectToolcraftUnclassifiedPerformanceControls(unclassifiedSchema)).toEqual([
      expect.objectContaining({
        controlId: "mode",
        target: "render.mode",
      }),
    ]);
  });

  it("allows ordinary sliders to use lightweight responsiveness coverage", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: opacity drag stays responsive",
          browser: true,
          browserTestName: "browser perf: opacity drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Opacity",
          expectedObservable: "Dragging Opacity stays responsive.",
          fixture: "opacity responsiveness fixture",
          id: "opacity-drag",
          interaction: "control-drag",
          target: "render.opacity",
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toEqual([]);
  });

  it("rejects slider performance coverage that does not drag the real control", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: opacity change stays responsive",
          browser: true,
          browserTestName: "browser perf: opacity change stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Opacity",
          expectedObservable: "Changing Opacity stays responsive.",
          fixture: "opacity responsiveness fixture",
          id: "opacity-change",
          interaction: "control-change",
          target: "render.opacity",
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toContain(
      "render.opacity is a slider and must have a control-drag performance scenario proving live canvas/product feedback while dragging.",
    );
  });

  it("rejects range slider performance coverage that does not drag the real control", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: band change stays responsive",
          browser: true,
          browserTestName: "browser perf: band change stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Band",
          expectedObservable: "Changing Band stays responsive.",
          fixture: "band responsiveness fixture",
          id: "band-change",
          interaction: "control-change",
          target: "render.band",
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(rangeSliderSchema, config)).toContain(
      "render.band is a rangeSlider and must have a control-drag performance scenario proving live canvas/product feedback while dragging.",
    );
  });

  it("requires performance-sensitive controls to be listed in workloadTargets", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density stays responsive.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          target: "render.density",
          workload: false,
        },
        {
          automated: true,
          automatedTestName: "perf: mode change stays responsive",
          browser: true,
          browserTestName: "browser perf: mode change stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Mode",
          expectedObservable: "Changing Mode updates the product without blocking the UI.",
          fixture: "runtime mode fixture",
          id: "mode-change",
          interaction: "control-change",
          target: "render.mode",
          values: { default: "soft", max: "sharp", min: "soft" },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "render.density is performance-sensitive and must be listed in workloadTargets with min/default/max workload coverage.",
    );
  });

  it("requires workload slider coverage to use real control drag", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density change stays responsive",
          browser: true,
          browserTestName: "browser perf: density change stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Changing Density updates the product without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-change",
          interaction: "control-change",
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
        {
          automated: true,
          automatedTestName: "perf: mode change stays responsive",
          browser: true,
          browserTestName: "browser perf: mode change stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Mode",
          expectedObservable: "Changing Mode updates the product without blocking the UI.",
          fixture: "runtime mode fixture",
          id: "mode-change",
          interaction: "control-change",
          target: "render.mode",
          values: { default: "soft", max: "sharp", min: "soft" },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        "render.density must have min/default/max workload performance coverage through a real control-drag scenario.",
        "render.density is a slider and must have a control-drag performance scenario proving live canvas/product feedback while dragging.",
      ]),
    );
  });

  it("rejects responsiveness role on semantically workload controls", () => {
    const misclassifiedSchema = defineToolcraft({
      canvas: {
        enabled: true,
        sizing: { mode: "intrinsic-media" },
      },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                density: {
                  defaultValue: 4,
                  label: "Density",
                  max: 12,
                  min: 1,
                  performanceReason: "AI incorrectly treated density as lightweight.",
                  performanceRole: "responsiveness",
                  target: "render.density",
                  type: "slider",
                },
              },
            },
          ],
          title: "Runtime Controls",
        },
      },
    });
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates the product without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(misclassifiedSchema, config)).toEqual(
      expect.arrayContaining([
        'density (render.density) looks performance-sensitive but declares performanceRole "responsiveness". Use performanceRole "workload" with workloadTargets and min/default/max coverage, or rename/restructure the control if it is truly lightweight.',
        "render.density is performance-sensitive and must be listed in workloadTargets with min/default/max workload coverage.",
      ]),
    );
  });

  it("validates coverage without app-local helper defaults", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates the product without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: createMaxValueStressFixture(
            12,
            "Density max is the heaviest rendered output fixture.",
          ),
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
        {
          automated: true,
          automatedTestName: "perf: mode change stays responsive",
          browser: true,
          browserTestName: "browser perf: mode change stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Mode",
          expectedObservable: "Changing Mode updates the product without blocking the UI.",
          fixture: "runtime mode fixture",
          id: "mode-change",
          interaction: "control-change",
          target: "render.mode",
          values: { default: "soft", max: "sharp", min: "soft" },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("requires workload scenarios to declare a reusable stress fixture", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: content input stays responsive",
          browser: true,
          browserTestName: "browser perf: content input stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Content",
          expectedObservable: "Large text content updates without blocking the UI.",
          fixture: "large text content fixture",
          id: "content-change",
          interaction: "control-change",
          target: "product.content",
          values: { default: "", max: createLargeTextStressValue(), min: "" },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["product.content"],
    });

    expect(validateToolcraftPerformanceCoverage(largeTextSchema, config)).toContain(
      "content-change workload scenario must declare stressFixture with the real heaviest value used by browser performance tests.",
    );
  });

  it("requires stress scenarios to declare an exact stress fixture value", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: preview render stays under budget",
          browser: true,
          browserTestName: "browser perf: preview render stays under budget",
          budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
          expectedObservable: "Preview renders the heaviest output without freezing.",
          fixture: "combined heavy renderer fixture",
          id: "preview-render",
          interaction: "preview-render",
          stress: true,
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toContain(
      "preview-render stress scenario must declare stressFixture with the real heaviest state used by browser performance tests.",
    );
  });

  it("rejects stress fixtures without a browser-applicable value", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: preview render stays under budget",
          browser: true,
          browserTestName: "browser perf: preview render stays under budget",
          budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
          expectedObservable: "Preview renders the heaviest output without freezing.",
          fixture: "combined heavy renderer fixture",
          id: "preview-render",
          interaction: "preview-render",
          stress: true,
          stressFixture: {
            kind: "custom",
            reason: "Combined renderer stress state.",
          },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toContain(
      "preview-render stressFixture must include value so browser tests can apply the exact heavy state.",
    );
  });

  it("requires custom stress fixtures to be object-shaped heavy states", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: preview render stays under budget",
          browser: true,
          browserTestName: "browser perf: preview render stays under budget",
          budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
          expectedObservable: "Preview renders the heaviest output without freezing.",
          fixture: "combined heavy renderer fixture",
          id: "preview-render",
          interaction: "preview-render",
          stress: true,
          stressFixture: {
            kind: "custom",
            reason: "Combined renderer stress state.",
            value: 12,
          },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toContain(
      "preview-render custom stressFixture.value must be an object with one key per heavy state part so browser tests can apply every key.",
    );
  });

  it("rejects empty custom stress fixture objects", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: preview render stays under budget",
          browser: true,
          browserTestName: "browser perf: preview render stays under budget",
          budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
          expectedObservable: "Preview renders the heaviest output without freezing.",
          fixture: "combined heavy renderer fixture",
          id: "preview-render",
          interaction: "preview-render",
          stress: true,
          stressFixture: {
            kind: "custom",
            reason: "Combined renderer stress state.",
            value: {},
          },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toContain(
      "preview-render custom stressFixture.value must include at least one heavy state key.",
    );
  });

  it("rejects short stress fixtures for large text workload scenarios", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: content input stays responsive",
          browser: true,
          browserTestName: "browser perf: content input stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Content",
          expectedObservable: "Large text content updates without blocking the UI.",
          fixture: "large text content fixture",
          id: "content-change",
          interaction: "control-change",
          stressFixture: {
            kind: "large-text",
            minChars: 50_000,
            minLines: 1_000,
            reason: "Long multiline content is the heaviest realistic text workload.",
            value: "short text",
          },
          target: "product.content",
          values: { default: "", max: "short text", min: "" },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["product.content"],
    });

    expect(validateToolcraftPerformanceCoverage(largeTextSchema, config)).toEqual(
      expect.arrayContaining([
        "content-change large-text stressFixture.value must contain at least 50000 characters.",
        "content-change large-text stressFixture.value must contain at least 1000 lines.",
      ]),
    );
  });

  it("rejects short large-text values hidden inside custom fixtures", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: preview render stays under budget",
          browser: true,
          browserTestName: "browser perf: preview render stays under budget",
          budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
          expectedObservable: "Preview renders the heaviest output without freezing.",
          fixture: "combined large text fixture",
          id: "preview-render",
          interaction: "preview-render",
          stress: true,
          stressFixture: {
            kind: "custom",
            reason: "Combined renderer stress includes pasted product content.",
            value: {
              content: "short text",
              renderScale: 2,
            },
          },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(largeTextSchema, config)).toEqual(
      expect.arrayContaining([
        "preview-render custom stressFixture.content must contain at least 50000 characters.",
        "preview-render custom stressFixture.content must contain at least 1000 lines.",
      ]),
    );
  });

  it("rejects custom render scale fixtures that are not concrete high-resolution values", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: preview render stays under budget",
          browser: true,
          browserTestName: "browser perf: preview render stays under budget",
          budget: { maxLongTaskMs: 80, maxPreviewMs: 1000 },
          expectedObservable: "Preview renders the heaviest output without freezing.",
          fixture: "combined render scale fixture",
          id: "preview-render",
          interaction: "preview-render",
          stress: true,
          stressFixture: {
            kind: "custom",
            reason: "Combined renderer stress includes selected resolution scale.",
            value: {
              density: 12,
              renderScale: "2",
            },
          },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(ordinarySliderSchema, config)).toContain(
      "preview-render custom stressFixture.renderScale must be a numeric Resolution scale greater than 1 so browser tests prove high-resolution backing pixels.",
    );
  });

  it("accepts large text workload scenarios with machine-checkable stress fixtures", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: content input stays responsive",
          browser: true,
          browserTestName: "browser perf: content input stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Content",
          expectedObservable: "Large text content updates without blocking the UI.",
          fixture: "large text content fixture",
          id: "content-change",
          interaction: "control-change",
          stressFixture: createLargeTextStressFixture(),
          target: "product.content",
          values: { default: "", max: createLargeTextStressValue(), min: "" },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["product.content"],
    });

    expect(validateToolcraftPerformanceCoverage(largeTextSchema, config)).toEqual([]);
  });

  it("requires max-value fixtures to declare a measured load profile", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates text output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: {
            kind: "max-value",
            reason: "Density 11 is claimed as the smooth target without hard-limit evidence.",
            value: 11,
          },
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "density-drag stressFixture.loadProfile must declare hardLimit, smoothTarget, and smoothTargetRatio so performance workload is a measured smooth target rather than a hidden toy fixture.",
    );
  });

  it("rejects load profiles whose smooth target does not match the applied fixture", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates text output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: {
            kind: "max-value",
            loadProfile: {
              hardLimit: 12,
              metric: "numeric-max",
              smoothTarget: 11,
              smoothTargetRatio: 0.9,
              target: "render.density",
              userFacingRange: "experimental-above-smooth",
            },
            reason: "Density 10 does not match the documented smooth target.",
            value: 10,
          },
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        "density-drag stressFixture.loadProfile.smoothTarget must match stressFixture.value so browser tests apply the documented smooth workload target.",
        "density-drag stressFixture.loadProfile.degradationStepPercent must be 10 when smoothTargetRatio is below 1.",
        "density-drag stressFixture.loadProfile.evidence must include failed measurements for each 10 percent step above smoothTargetRatio 0.9.",
      ]),
    );
  });

  it("rejects load profiles whose ratio does not describe the measured smooth target", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates text output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: {
            kind: "max-value",
            loadProfile: {
              degradationStepPercent: 10,
              evidence: [
                {
                  attemptedTarget: 12,
                  decision:
                    "Density 12 remains experimental because it misses frame budget after optimization.",
                  measuredResult: "At density 12, maxFrameGapMs 148 exceeded the 80ms budget.",
                  optimizationAttempted:
                    "Cached glyph atlas and coalesced preview work to requestAnimationFrame.",
                  result: "failed",
                  scenarioId: "density-drag",
                },
              ],
              hardLimit: 12,
              metric: "numeric-max",
              smoothTarget: 2,
              smoothTargetRatio: 0.9,
              target: "render.density",
              userFacingRange: "experimental-above-smooth",
            },
            reason: "Density 2 is far below the claimed 90 percent smooth target.",
            value: 2,
          },
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "density-drag stressFixture.loadProfile.smoothTargetRatio 0.9 must describe the actual smooth target ratio 0.1667.",
    );
  });

  it("rejects fully guaranteed custom load profiles whose smooth target is not the hard limit", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererWorkload: "pixel-output",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: combined preview stays responsive",
          browser: true,
          browserTestName: "browser perf: combined preview stays responsive",
          budget: { maxPreviewMs: 200, maxRenderMs: 200 },
          expectedObservable: "Preview renders the combined source and effect workload.",
          fixture: "combined custom fixture",
          id: "combined-preview",
          interaction: "preview-render",
          stress: true,
          stressFixture: {
            kind: "custom",
            loadProfile: {
              hardLimit: { density: 12, sourceMedia: { height: 2160, width: 3840 } },
              metric: "custom",
              smoothTarget: { density: 4, sourceMedia: { height: 1080, width: 1920 } },
              smoothTargetRatio: 1,
              target: "renderer.output",
              userFacingRange: "fully-guaranteed",
            },
            reason: "This claims full coverage while applying a smaller custom state.",
            value: { density: 4, sourceMedia: { height: 1080, width: 1920 } },
          },
          target: "renderer.output",
          workload: false,
        },
      ],
      usesCustomRenderer: true,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "combined-preview stressFixture.loadProfile.smoothTargetRatio 1 requires smoothTarget to equal hardLimit.",
    );
  });

  it("accepts a 10 percent degraded smooth target with hard-limit failure evidence", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates text output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: createDegradedMaxValueStressFixture(),
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
        {
          automated: true,
          automatedTestName: "perf: mode change stays responsive",
          browser: true,
          browserTestName: "browser perf: mode change stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Mode",
          expectedObservable: "Changing Mode updates text output without blocking the UI.",
          fixture: "runtime mode fixture",
          id: "mode-change",
          interaction: "control-change",
          target: "render.mode",
          values: { default: "soft", max: "sharp", min: "soft" },
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("requires evidence for every skipped 10 percent degradation step", () => {
    const degradedFixture = createDegradedMaxValueStressFixture();
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates text output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: {
            ...degradedFixture,
            loadProfile: {
              ...degradedFixture.loadProfile,
              smoothTarget: 10,
              smoothTargetRatio: 0.8,
            },
            value: 10,
          },
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "density-drag stressFixture.loadProfile.evidence must include failed measurements for each 10 percent step above smoothTargetRatio 0.8.",
    );
  });

  it("rejects numeric hard limits that do not match schema max", () => {
    const fixture = createDegradedMaxValueStressFixture();
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates text output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: {
            ...fixture,
            loadProfile: {
              ...fixture.loadProfile,
              hardLimit: 10,
            },
          },
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "density-drag stressFixture.loadProfile.hardLimit must match schema max 12.",
    );
  });

  it("rejects toy many-items fixtures below their declared useful count", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: items drag stays responsive",
          browser: true,
          browserTestName: "browser perf: items drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates many items without blocking the UI.",
          fixture: "many item fixture",
          id: "items-density-drag",
          interaction: "control-drag",
          stressFixture: {
            kind: "many-items",
            loadProfile: {
              hardLimit: 100,
              metric: "count",
              smoothTarget: 2,
              smoothTargetRatio: 1,
              target: "items.count",
              userFacingRange: "fully-guaranteed",
            },
            minCount: 10,
            reason: "Two items is too small to prove collection performance.",
            value: 2,
          },
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "items-density-drag stressFixture.value must include at least 10 items for many-items fixtures.",
    );
  });

  it("requires workload controls in custom renderers to declare an independent workload fixture", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererWorkload: "text-output",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates text output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: createMaxValueStressFixture(
            12,
            "Density max is the heaviest control value.",
          ),
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "density-drag workload control scenario must declare workloadFixture for the app's heavy baseline state; stressFixture covers the control value only.",
    );
  });

  it("rejects toy media workload fixtures for control-drag baselines", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "webgl",
      rendererWorkload: "pixel-output",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates source media output without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          stressFixture: createMaxValueStressFixture(
            12,
            "Density max is the heaviest control value.",
          ),
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workloadFixture: createMediaStressFixture(
            { height: 480, width: 640 },
            "This small source should be rejected as too light.",
          ),
          workload: true,
        },
      ],
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "density-drag media workloadFixture.value must be at least 1920x1080-equivalent; received 640x480.",
    );
  });

  it("accepts workload controls with separate control stress and app baseline fixtures", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["text output must stay crisp"],
        performanceRisks: ["density changes can relayout text"],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: ["dom output cannot preserve export composition"],
      },
      rendererWorkload: "text-output",
      rendererPipeline: createTextRendererPipeline(),
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("rejects workload fixtures that are not paired with scenario stress fixtures", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: preview baseline stays responsive",
          browser: true,
          browserTestName: "browser perf: preview baseline stays responsive",
          budget: { maxPreviewMs: 1000 },
          expectedObservable: "Preview renders inside a heavy baseline.",
          fixture: "baseline fixture",
          id: "preview-heavy-baseline",
          interaction: "preview-render",
          workload: false,
          workloadFixture: createLargeTextStressFixture(),
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "preview-heavy-baseline workloadFixture must be paired with stressFixture so tests apply a heavy baseline and then the measured scenario value.",
    );
  });

  it("rejects media-import scenarios that use toy source dimensions", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: source image import stays responsive",
          browser: true,
          browserTestName: "browser perf: source image import stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          expectedObservable: "Importing source media does not block the app.",
          fixture: "large source image fixture",
          id: "source-media-import",
          interaction: "media-import",
          stressFixture: createMediaStressFixture(
            { height: 480, width: 640 },
            "This small fixture should be rejected as too light.",
          ),
          target: "source.image",
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(mediaUploadSchema, config)).toContain(
      "source-media-import media stressFixture.value must be at least 1920x1080-equivalent; received 640x480.",
    );
  });

  it("requires media-import scenarios to be workload media fixtures", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: source image import stays responsive",
          browser: true,
          browserTestName: "browser perf: source image import stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          expectedObservable: "Importing source media does not block the app.",
          fixture: "large source image fixture",
          id: "source-media-import",
          interaction: "media-import",
          stressFixture: createCustomStressFixture(
            { height: 1080, width: 1920 },
            "Wrong fixture kind for media import.",
          ),
          target: "source.image",
          workload: false,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: [],
    });

    expect(validateToolcraftPerformanceCoverage(mediaUploadSchema, config)).toEqual(
      expect.arrayContaining([
        "source-media-import media-import scenario must set workload true because decoded source size changes renderer workload.",
        'source-media-import media-import scenario must use stressFixture.kind "media" with a realistic uploaded source size.',
      ]),
    );
  });

  it("rejects visible controls without performance scenarios", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "none",
      rendererWorkload: "none",
      scenarios: [
        {
          automated: true,
          automatedTestName: "perf: density drag stays responsive",
          browser: true,
          browserTestName: "browser perf: density drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500 },
          controlLabel: "Density",
          expectedObservable: "Dragging Density updates the product without blocking the UI.",
          fixture: "runtime density fixture",
          id: "density-drag",
          interaction: "control-drag",
          target: "render.density",
          values: { default: 4, max: 12, min: 1 },
          workload: true,
        },
      ],
      usesCustomRenderer: false,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "render.mode must have a performance scenario because every visible control can affect app responsiveness.",
    );
  });

  it("allows text-output renderers without forcing a GPU strategy", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["glyph metrics must stay crisp at product output size"],
        performanceRisks: ["large glyph grids can be expensive during drag"],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: ["webgl texture output would rasterize text too early"],
      },
      rendererWorkload: "text-output",
      rendererPipeline: createTextRendererPipeline(),
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("rejects main-thread Canvas 2D raster/composite pipelines misclassified as text output", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["rasterized text must preserve the shader-style composite"],
        layers: [
          {
            content: ["text", "noise"],
            exportMode: "composited",
            id: "product-text-composite",
            intentionalRasterizationReason:
              "The product text is warped, tinted, and exported as final pixels.",
            kind: "product-foreground",
            primitiveCount: "medium",
            renderer: "canvas-2d",
            uiSelector: '[data-toolcraft-renderer-layer="product-text-composite"]',
          },
        ],
        performanceRisks: [
          "WebGL measured stress evidence was reviewed before keeping the text composite on Canvas 2D.",
        ],
        previewRenderer: "canvas-2d",
        productRepresentation: "mixed",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: [
          "WebGL measured stress evidence showed text atlas uploads dominated this fixture.",
        ],
      },
      rendererWorkload: "text-output",
      rendererPipeline: createMainThreadCanvasCompositePipeline(),
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      'Canvas 2D pipelines with main-thread rasterize/composite preview pressure must use rendererWorkload "pixel-output" or move expensive passes off the main thread; received "text-output".',
    );
  });

  it("requires animated custom renderers to test viewport dragging during animation", () => {
    const config = createAnimatedVectorRendererConfig({ includeViewportDrag: false });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "Animated custom renderers must include an animation-viewport-drag performance scenario that samples frames while physically moving the canvas viewport.",
    );
  });

  it("requires detail-heavy custom renderers to test real viewport zoom stress", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["glyph metrics must stay crisp at product output size"],
        performanceRisks: ["large glyph grids can shake or jank during canvas zoom"],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: ["webgl texture output would rasterize text too early"],
      },
      rendererWorkload: "text-output",
      scenarios: createTextRendererScenarios({ includeViewportZoomStress: false }),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "Detail-heavy or animated custom renderers must include a viewport-zoom-stress performance scenario that uses real zoom controls while sampling frame gaps and long tasks.",
    );
  });

  it("requires detail-heavy custom renderers to prove worst-case preview or animation stress", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["dense texture output must stay visually stable"],
        layers: [
          {
            content: ["dense-pattern"],
            exportMode: "included",
            id: "dense-pattern",
            kind: "product-foreground",
            primitiveCount: "high",
            renderer: "canvas-2d",
            uiSelector: '[data-toolcraft-renderer-layer="dense-pattern"]',
          },
          {
            content: ["geometry"],
            exportMode: "included",
            id: "foreground-geometry",
            kind: "product-foreground",
            primitiveCount: "low",
            renderer: "svg",
            uiSelector: '[data-toolcraft-renderer-layer="foreground-geometry"]',
          },
        ],
        performanceRisks: ["maximum density may overload the renderer"],
        previewRenderer: "canvas-2d",
        productRepresentation: "mixed",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["canvas is simple"],
      },
      rendererWorkload: "simple-composition",
      scenarios: createTextRendererScenarios({ includeStressPreview: false }),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        "Detail-heavy custom renderers must include a stress preview-render or animation-frame scenario for the largest product canvas and heaviest workload values.",
      ]),
    );
  });

  it("requires high-count Canvas 2D semantic or dense layers to carry measurable stress evidence", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["glyphs must stay legible"],
        layers: [
          {
            content: ["text", "dense-pattern"],
            exportMode: "included",
            id: "dense-text-field",
            intentionalRasterizationReason:
              "The product exports raster video and PNG, so text is drawn into one canvas frame.",
            kind: "product-foreground",
            primitiveCount: "high",
            renderer: "canvas-2d",
            uiSelector: '[data-toolcraft-renderer-layer="dense-text-field"]',
          },
        ],
        performanceRisks: ["maximum density may redraw many text runs per frame"],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: ["webgl texture output would rasterize text too early"],
      },
      rendererWorkload: "text-output",
      scenarios: createTextRendererScenarios({ includeStressPreview: false }),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        "High-count Canvas 2D renderer layers must include stress preview-render or animation-frame evidence before delivery. If that stress evidence fails, revise renderer strategy instead of only lowering product workload.",
      ]),
    );
  });

  it("requires detail-heavy Canvas 2D renderers to document measured WebGL/WebGPU evaluation", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["dense texture output must match source media colors"],
        layers: [
          {
            content: ["bitmap-media", "noise"],
            exportMode: "included",
            id: "media-effect",
            kind: "product-foreground",
            primitiveCount: "high",
            renderer: "canvas-2d",
            uiSelector: '[data-toolcraft-renderer-layer="media-effect"]',
          },
        ],
        performanceRisks: ["large uploaded media can require millions of pixel operations"],
        previewRenderer: "canvas-2d",
        productRepresentation: "pixel",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "pixel-output",
        sourceRepresentation: "image-media",
        whyNotAlternativeStrategies: ["canvas is convenient"],
      },
      rendererWorkload: "pixel-output",
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "Detail-heavy Canvas 2D renderers must include rendererTechnique.measuredAlternativeEvidence for WebGL/WebGPU stress comparison before keeping the pixel work on CPU.",
    );
    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      'rendererWorkload "pixel-output" should use rendererStrategy "webgl" or "webgpu", received "canvas-2d". Keeping a CPU renderer requires rendererTechnique.measuredAlternativeEvidence for WebGL/WebGPU stress comparison.',
    );
  });

  it("allows pixel-output Canvas 2D only with measured WebGL/WebGPU evidence", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["pixel output must preserve exact color stops"],
        performanceRisks: [
          "Measured WebGL stress evidence showed setup overhead exceeded cached Canvas 2D worker output for this static fixture.",
        ],
        measuredAlternativeEvidence: createMeasuredWebglEvidence(),
        previewRenderer: "canvas-2d",
        productRepresentation: "pixel",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "pixel-output",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: [
          "WebGL measured stress evidence stayed within budget but did not improve interaction latency for this renderer.",
        ],
      },
      rendererWorkload: "pixel-output",
      rendererPipeline: createPixelRendererPipeline(),
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("accepts animated custom renderers with stress coverage while dragging the viewport", () => {
    const config = createAnimatedVectorRendererConfig({ includeViewportDrag: true });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("requires custom renderers to declare typed renderer technique metadata", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererWorkload: "text-output",
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        "Custom renderers must declare rendererTechnique so renderer choice is machine-checkable.",
      ]),
    );
  });

  it("requires custom renderers to declare a render pipeline inventory", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["canvas output can soften edges"],
        performanceRisks: ["dense output can jank during drag"],
        previewRenderer: "canvas-2d",
        productRepresentation: "mixed",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: [
          "svg cannot preserve dense procedural background output",
        ],
      },
      rendererWorkload: "simple-composition",
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "Custom renderers must declare rendererPipeline so render passes, cache keys, and invalidation are machine-checkable.",
    );
  });

  it("rejects vague renderer pipeline pass dependencies", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["dense text output can soften at small sizes"],
        performanceRisks: ["text layout can be expensive"],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: ["dom output cannot preserve export composition"],
      },
      rendererWorkload: "text-output",
      rendererPipeline: {
        interactionInvalidation: [
          {
            interaction: "control-drag",
            invalidates: ["text-layout"],
            targets: ["render.density"],
          },
        ],
        passes: [
          {
            cacheKey: ["state"],
            id: "text-layout",
            inputs: ["state"],
            invalidatedBy: ["all values"],
            kind: "text-layout",
            output: "preview",
            quality: "full",
            runsOn: "main",
          },
        ],
      },
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        'rendererPipeline pass "text-layout" inputs entry "state" is too vague. Name the concrete runtime target, source key, resource key, or cache key part.',
        'rendererPipeline pass "text-layout" invalidatedBy entry "all values" is too vague. Name the concrete runtime target, source key, resource key, or cache key part.',
        'rendererPipeline pass "text-layout" cacheKey entry "state" is too vague. Name the concrete runtime target, source key, resource key, or cache key part.',
      ]),
    );
  });

  it("requires cache-sensitive renderer pipeline passes to declare cache keys", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["source pixels must stay crisp"],
        performanceRisks: ["pixel transforms can block the main thread"],
        previewRenderer: "canvas-2d",
        productRepresentation: "pixel",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "pixel-output",
        sourceRepresentation: "image-media",
        whyNotAlternativeStrategies: [
          "WebGL/WebGPU measured performance evidence showed no improvement for this fixture",
        ],
      },
      rendererWorkload: "pixel-output",
      rendererPipeline: {
        interactionInvalidation: [
          {
            interaction: "control-drag",
            invalidates: ["pixel-pass"],
            targets: ["render.density"],
          },
        ],
        passes: [
          {
            id: "pixel-pass",
            inputs: ["source.image", "render.density"],
            invalidatedBy: ["source.image", "render.density"],
            kind: "pixel-transform",
            output: "preview",
            quality: "retina",
            runsOn: "worker",
          },
        ],
      },
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      'rendererPipeline pass "pixel-pass" is a cache-sensitive pixel-transform pass and must declare cacheKey so tests can reject full recomputation on every control change.',
    );
  });

  it("requires composite renderer pipeline passes to declare cache keys", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "svg",
      rendererTechnique: {
        exportRenderer: "svg",
        fidelityRisks: ["animated composite must preserve vector output"],
        performanceRisks: ["compositing can be rebuilt too often"],
        previewRenderer: "svg",
        productRepresentation: "vector",
        rendererStrategy: "svg",
        rendererWorkload: "vector-output",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["svg preserves semantic vector output"],
      },
      rendererWorkload: "vector-output",
      rendererPipeline: {
        ...createAnimatedVectorRendererPipeline(),
        passes: createAnimatedVectorRendererPipeline().passes.map((pass) =>
          pass.id === "animation-composite"
            ? {
                id: pass.id,
                inputs: pass.inputs,
                invalidatedBy: pass.invalidatedBy,
                kind: pass.kind,
                output: pass.output,
                quality: pass.quality,
                runsOn: pass.runsOn,
              }
            : pass,
        ),
      },
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      'rendererPipeline pass "animation-composite" is a cache-sensitive composite pass and must declare cacheKey so tests can reject full recomputation on every control change.',
    );
  });

  it("rejects high-frequency viewport interactions that invalidate expensive passes", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["dense background must stay stable while zooming"],
        layers: [
          {
            content: ["dense-pattern"],
            exportMode: "included",
            id: "dense-pattern",
            kind: "background",
            primitiveCount: "high",
            renderer: "canvas-2d",
          },
        ],
        performanceRisks: [
          "WebGL measured stress evidence was reviewed before keeping dense background on Canvas 2D",
        ],
        previewRenderer: "canvas-2d",
        productRepresentation: "pixel",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "pixel-output",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: [
          "WebGL stress evidence showed shader setup overhead exceeded static cache reuse",
        ],
      },
      rendererWorkload: "pixel-output",
      rendererPipeline: {
        interactionInvalidation: [
          {
            interaction: "viewport-zoom",
            invalidates: ["dense-background"],
            mustNotInvalidate: ["dense-background"],
            targets: ["canvas.viewport"],
          },
          {
            interaction: "control-drag",
            invalidates: ["dense-background"],
            targets: ["render.density"],
          },
        ],
        passes: [
          {
            cacheKey: ["render.density", "canvas.size", "canvas.renderScale"],
            id: "dense-background",
            inputs: ["render.density", "canvas.size", "canvas.renderScale"],
            invalidatedBy: ["render.density", "canvas.size", "canvas.renderScale"],
            kind: "rasterize",
            output: "preview",
            quality: "retina",
            runsOn: "worker",
          },
        ],
      },
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        'rendererPipeline viewport-zoom cannot both invalidate and mustNotInvalidate pass "dense-background".',
        'rendererPipeline viewport-zoom must not invalidate expensive pass "dense-background" (rasterize). Move viewport work to transforms/uniforms or explain it through a cheaper pass.',
      ]),
    );
  });

  it("requires media decoding pipelines to include media-import coverage", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "webgl",
      rendererTechnique: {
        exportRenderer: "webgl",
        fidelityRisks: ["large source media must preserve color"],
        performanceRisks: ["source decode can be expensive"],
        previewRenderer: "webgl",
        productRepresentation: "pixel",
        rendererStrategy: "webgl",
        rendererWorkload: "pixel-output",
        sourceRepresentation: "image-media",
        whyNotAlternativeStrategies: ["canvas-2d would run per-pixel work on the main thread"],
      },
      rendererWorkload: "pixel-output",
      rendererPipeline: createMediaRendererPipeline(),
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      'rendererPipeline pass "source-decode" decodes media, so performance scenarios must include media-import coverage.',
    );
  });

  it("requires workload targets to appear in renderer pipeline invalidation targets", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["text output must stay crisp"],
        performanceRisks: ["density changes can relayout text"],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: ["dom output cannot preserve export composition"],
      },
      rendererWorkload: "text-output",
      rendererPipeline: {
        ...createTextRendererPipeline(),
        interactionInvalidation: [
          {
            interaction: "control-change",
            invalidates: ["text-layout"],
            targets: ["render.mode"],
          },
        ],
      },
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "Performance workload target render.density must appear in rendererPipeline interactionInvalidation targets.",
    );
  });

  it("requires performance scenario interactions to appear in renderer pipeline invalidation", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["text output must stay crisp"],
        performanceRisks: ["density changes can relayout text"],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "text-output",
        sourceRepresentation: "dom-text",
        whyNotAlternativeStrategies: ["dom output cannot preserve export composition"],
      },
      rendererWorkload: "text-output",
      rendererPipeline: {
        ...createTextRendererPipeline(),
        interactionInvalidation: [
          {
            interaction: "control-drag",
            invalidates: ["text-layout"],
            targets: ["render.density"],
          },
          {
            interaction: "control-change",
            invalidates: ["text-layout"],
            targets: ["render.mode"],
          },
        ],
      },
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "Performance scenario viewport-zoom-stress exercises viewport-zoom, so rendererPipeline.interactionInvalidation must declare that interaction.",
    );
  });

  it("requires timeline playback scenarios to appear in renderer pipeline invalidation", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "svg",
      rendererTechnique: {
        exportRenderer: "svg",
        fidelityRisks: ["timeline playback must preserve vector motion"],
        performanceRisks: ["timeline playback can jank at high density"],
        previewRenderer: "svg",
        productRepresentation: "vector",
        rendererStrategy: "svg",
        rendererWorkload: "vector-output",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["svg preserves semantic vector output"],
      },
      rendererWorkload: "vector-output",
      rendererPipeline: {
        ...createAnimatedVectorRendererPipeline(),
        interactionInvalidation: createAnimatedVectorRendererPipeline().interactionInvalidation.filter(
          (entry) => entry.interaction !== "timeline-playback",
        ),
      },
      scenarios: [
        ...createTextRendererScenarios(),
        {
          automated: true,
          automatedTestName: "perf: timeline playback stays smooth",
          browser: true,
          browserTestName: "browser perf: timeline playback stays smooth",
          budget: { maxFrameGapMs: 80, maxLongTaskMs: 80 },
          expectedObservable: "Timeline playback advances without blocking frames.",
          fixture: "timeline playback fixture",
          id: "timeline-playback",
          interaction: "timeline-playback",
          stress: true,
          stressFixture: createCombinedRendererStressFixture(),
          target: "timeline.currentTime",
          uiSelector: '[data-slot="timeline-playback-handle"]',
          workload: false,
        },
      ],
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "Performance scenario timeline-playback exercises timeline-playback, so rendererPipeline.interactionInvalidation must declare that interaction.",
    );
  });

  it("validates timeline scrub scenarios through renderer pipeline invalidation", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "svg",
      rendererTechnique: {
        exportRenderer: "svg",
        fidelityRisks: ["timeline scrub must preserve vector motion"],
        performanceRisks: ["timeline scrub can jank at high density"],
        previewRenderer: "svg",
        productRepresentation: "vector",
        rendererStrategy: "svg",
        rendererWorkload: "vector-output",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["svg preserves semantic vector output"],
      },
      rendererWorkload: "vector-output",
      rendererPipeline: createAnimatedVectorRendererPipeline(),
      scenarios: [
        ...createTextRendererScenarios(),
        {
          automated: true,
          automatedTestName: "perf: timeline scrub stays responsive",
          browser: true,
          browserTestName: "browser perf: timeline scrub stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500, maxLongTaskMs: 80 },
          expectedObservable: "Timeline scrub updates output without blocking frames.",
          fixture: "timeline scrub fixture",
          id: "timeline-scrub",
          interaction: "timeline-scrub",
          stress: true,
          stressFixture: createCombinedRendererStressFixture(),
          target: "timeline.currentTime",
          uiSelector: '[data-slot="timeline-playback-handle"]',
          workload: false,
        },
      ],
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("requires timeline performance scenarios to name the real timeline UI", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "svg",
      rendererTechnique: {
        exportRenderer: "svg",
        fidelityRisks: ["timeline scrub must preserve vector motion"],
        performanceRisks: ["timeline scrub can jank at high density"],
        previewRenderer: "svg",
        productRepresentation: "vector",
        rendererStrategy: "svg",
        rendererWorkload: "vector-output",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["svg preserves semantic vector output"],
      },
      rendererWorkload: "vector-output",
      rendererPipeline: createAnimatedVectorRendererPipeline(),
      scenarios: [
        ...createTextRendererScenarios(),
        {
          automated: true,
          automatedTestName: "perf: timeline scrub stays responsive",
          browser: true,
          browserTestName: "browser perf: timeline scrub stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500, maxLongTaskMs: 80 },
          expectedObservable: "Timeline scrub updates output without blocking frames.",
          fixture: "timeline scrub fixture",
          id: "timeline-scrub",
          interaction: "timeline-scrub",
          stress: true,
          stressFixture: createCombinedRendererStressFixture(),
          target: "timeline.currentTime",
          workload: false,
        },
      ],
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toContain(
      "timeline-scrub timeline-scrub scenario must declare controlLabel or uiSelector for its real browser interaction.",
    );
  });

  it("validates mask drag scenarios through renderer pipeline invalidation", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "svg",
      rendererTechnique: {
        exportRenderer: "svg",
        fidelityRisks: ["mask handles must stay aligned with vector output"],
        performanceRisks: ["dragging a mask handle can rebuild output too often"],
        previewRenderer: "svg",
        productRepresentation: "vector",
        rendererStrategy: "svg",
        rendererWorkload: "vector-output",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["svg preserves semantic handle geometry"],
      },
      rendererWorkload: "vector-output",
      rendererPipeline: {
        ...createAnimatedVectorRendererPipeline(),
        interactionInvalidation: [
          ...createAnimatedVectorRendererPipeline().interactionInvalidation,
          {
            interaction: "mask-drag",
            invalidates: ["animation-composite"],
            mustNotInvalidate: ["vector-build"],
            targets: ["mask.anchor"],
          },
        ],
      },
      scenarios: [
        ...createTextRendererScenarios(),
        {
          automated: true,
          automatedTestName: "perf: mask drag stays responsive",
          browser: true,
          browserTestName: "browser perf: mask drag stays responsive",
          budget: { maxFrameGapMs: 80, maxInteractionMs: 500, maxLongTaskMs: 80 },
          expectedObservable: "Dragging the mask handle updates output without blocking frames.",
          fixture: "mask drag fixture",
          id: "mask-drag",
          interaction: "mask-drag",
          stress: true,
          stressFixture: createCombinedRendererStressFixture(),
          target: "mask.anchor",
          uiSelector: '[data-toolcraft-canvas-handle][data-testid="mask-anchor"]',
          workload: false,
        },
      ],
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("rejects renderer technique mismatches and missing explanations", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "webgl",
        fidelityRisks: [],
        performanceRisks: [],
        previewRenderer: "canvas-2d",
        productRepresentation: "text",
        rendererStrategy: "webgl",
        rendererWorkload: "pixel-output",
        sourceRepresentation: "reference-runtime",
        whyNotAlternativeStrategies: [],
      },
      rendererWorkload: "text-output",
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        'rendererTechnique.rendererWorkload "pixel-output" must match rendererWorkload "text-output".',
        'rendererTechnique.rendererStrategy "webgl" must match rendererStrategy "canvas-2d".',
        "Custom renderer technique must explain why alternative renderer strategies were rejected.",
        "Custom renderer technique must list fidelity risks.",
        "Custom renderer technique must list performance risks.",
        'productRepresentation "text" requires rendererWorkload "text-output" unless intentionalRasterizationReason is provided.',
        "Different preview/export renderers require previewExportDifferenceReason.",
        "Reference runtime renderer changes require referenceRendererChangeReason.",
      ]),
    );
  });

  it("allows dense raster backgrounds with semantic svg foreground layers", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["export composite must preserve foreground line and text edges"],
        layers: [
          {
            content: ["dense-pattern"],
            exportMode: "included",
            id: "dot-grid-background",
            kind: "background",
            primitiveCount: "high",
            renderer: "canvas-2d",
          },
          {
            content: ["geometry", "text"],
            exportMode: "included",
            id: "semantic-foreground",
            kind: "product-foreground",
            primitiveCount: "low",
            renderer: "svg",
            uiSelector: '[data-toolcraft-renderer-layer="semantic-foreground"]',
          },
          {
            content: ["composite"],
            exportMode: "composited",
            id: "png-export",
            kind: "export-composite",
            primitiveCount: "low",
            renderer: "canvas-2d",
          },
        ],
        measuredAlternativeEvidence: createMeasuredWebglEvidence(),
        performanceRisks: ["dense background redraw can be expensive at large output size"],
        previewRenderer: "canvas-2d",
        productRepresentation: "mixed",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: [
          "rendering thousands of background dots as DOM nodes would be expensive",
          "WebGL/WebGPU stress evidence is not needed yet because measured canvas-2d preview budgets pass for this dense static background.",
        ],
      },
      rendererWorkload: "simple-composition",
      rendererPipeline: createDenseCanvasPipeline(),
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual([]);
  });

  it("rejects canvas rasterization of low-count semantic foreground without a reason", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["foreground line edges can become soft"],
        layers: [
          {
            content: ["dense-pattern"],
            exportMode: "included",
            id: "dot-grid-background",
            kind: "background",
            primitiveCount: "high",
            renderer: "canvas-2d",
          },
          {
            content: ["geometry", "text"],
            exportMode: "included",
            id: "semantic-foreground",
            kind: "product-foreground",
            primitiveCount: "low",
            renderer: "canvas-2d",
          },
        ],
        performanceRisks: ["background redraw can be expensive"],
        previewRenderer: "canvas-2d",
        productRepresentation: "mixed",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["canvas is convenient"],
      },
      rendererWorkload: "simple-composition",
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        'rendererTechnique layer "semantic-foreground" uses canvas-2d for low-count semantic geometry/text. Use dom/svg for semantic foreground or provide intentionalRasterizationReason.',
      ]),
    );
  });

  it("requires visible foreground and handle layers to declare browser selectors", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["foreground and handles must be verified in browser tests"],
        layers: [
          {
            content: ["dense-pattern"],
            exportMode: "included",
            id: "dot-grid-background",
            kind: "background",
            primitiveCount: "high",
            renderer: "canvas-2d",
          },
          {
            content: ["geometry", "text"],
            exportMode: "included",
            id: "semantic-foreground",
            kind: "product-foreground",
            primitiveCount: "low",
            renderer: "svg",
          },
          {
            content: ["handles"],
            exportMode: "excluded",
            id: "focus-handles",
            kind: "editing-handles",
            primitiveCount: "low",
            renderer: "svg",
          },
        ],
        performanceRisks: ["background redraw can be expensive"],
        previewRenderer: "canvas-2d",
        productRepresentation: "mixed",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["background dots are too dense for DOM"],
      },
      rendererWorkload: "simple-composition",
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        'rendererTechnique layer "semantic-foreground" is product-foreground and must declare uiSelector so browser tests can verify the visible renderer layer.',
        'rendererTechnique layer "focus-handles" is editing-handles and must declare uiSelector so browser tests can verify the visible renderer layer.',
      ]),
    );
  });

  it("rejects mixed product representation without a real layer inventory", () => {
    const config = defineToolcraftPerformance({
      rendererStrategy: "canvas-2d",
      rendererTechnique: {
        exportRenderer: "canvas-2d",
        fidelityRisks: ["mixed representation must be proven by layers"],
        layers: [
          {
            content: ["dense-pattern"],
            exportMode: "included",
            id: "background",
            kind: "background",
            primitiveCount: "high",
            renderer: "canvas-2d",
          },
        ],
        performanceRisks: ["dense redraw can be expensive"],
        previewRenderer: "canvas-2d",
        productRepresentation: "mixed",
        rendererStrategy: "canvas-2d",
        rendererWorkload: "simple-composition",
        sourceRepresentation: "procedural-data",
        whyNotAlternativeStrategies: ["canvas is faster than DOM for many dots"],
      },
      rendererWorkload: "simple-composition",
      scenarios: createTextRendererScenarios(),
      usesCustomRenderer: true,
      workloadTargets: ["render.density"],
    });

    expect(validateToolcraftPerformanceCoverage(testSchema, config)).toEqual(
      expect.arrayContaining([
        'productRepresentation "mixed" requires rendererTechnique.layers with at least two different content families.',
      ]),
    );
  });
});
