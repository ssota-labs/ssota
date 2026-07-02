import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { describe, expect, expectTypeOf, it } from "vitest";

import {
  TOOLCRAFT_COMPONENT_CONTRACTS,
  getToolcraftComponentContract,
} from "./component-contracts";

describe("Toolcraft template component contracts", () => {
  it("exposes decision catalog metadata for controls that agents choose between", () => {
    for (const id of [
      "slider",
      "rangeSlider",
      "select",
      "segmented",
      "switch",
      "checkbox",
      "text",
      "code",
      "color",
      "colorOpacity",
      "gradient",
      "fontPicker",
      "curves",
      "vector",
      "fileDrop",
      "imagePicker",
      "palette",
      "actions",
      "collectionActions",
      "panelActions",
      "customControl",
    ] as const) {
      const catalog = getToolcraftComponentContract(id).decisionCatalog;

      expect(catalog?.strictness).toMatch(
        /^(exact-owner|best-fit|custom-escape-hatch)$/,
      );
      expect(catalog?.ownsValueModel.length).toBeGreaterThan(0);
      expect(catalog?.useWhen.length).toBeGreaterThan(0);
      expect(catalog?.requiredAcceptance.length).toBeGreaterThan(0);
    }
  });

  it("documents high-confidence owner controls and their bad substitutes", () => {
    const gradient = getToolcraftComponentContract("gradient").decisionCatalog;
    const fontPicker = getToolcraftComponentContract("fontPicker").decisionCatalog;
    const colorOpacity =
      getToolcraftComponentContract("colorOpacity").decisionCatalog;
    const customControl =
      getToolcraftComponentContract("customControl").decisionCatalog;

    expect(gradient?.strictness).toBe("exact-owner");
    expect(gradient?.useWhen.join(" ")).toMatch(
      /adjustable gradient|gradient stops/i,
    );
    expect(gradient?.doNotReplaceWith?.join(" ")).toMatch(
      /two Color controls/i,
    );
    expect(gradient?.requiredAcceptance.join(" ")).toMatch(
      /gradientType.*angle.*stop position.*stop color.*stop opacity/i,
    );

    expect(fontPicker?.doNotReplaceWith?.join(" ")).toMatch(
      /plain Select.*separate typography controls/i,
    );
    expect(colorOpacity?.doNotReplaceWith?.join(" ")).toMatch(
      /separate Color.*opacity/i,
    );
    expect(customControl?.strictness).toBe("custom-escape-hatch");
    expect(customControl?.requiredAcceptance.join(" ")).toMatch(
      /rejected built-ins/i,
    );
  });

  it("documents select as the fallback for segmented controls that exceed compact limits", () => {
    const segmented = getToolcraftComponentContract("segmented").decisionCatalog;
    const select = getToolcraftComponentContract("select").decisionCatalog;

    expect(segmented?.strictness).toBe("best-fit");
    expect(segmented?.acceptableAlternatives?.join(" ")).toMatch(/Select/i);
    expect(segmented?.layoutConstraints).toContain(
      "Segmented controls are full-width controls and must not be placed in two-column inline or half-width layout groups.",
    );
    expect(getToolcraftComponentContract("segmented").aiUsageRules).toContain(
      "Do not place Segmented beside Switch, Color, Select, or another control in an inline row; use Select when a finite choice must occupy a half-width column.",
    );
    expect(select?.useWhen.join(" ")).toMatch(/long labels|many options/i);
    expect(select?.useWhen).toContain(
      "Use Select when a dropdown choice is more readable than a row of segmented cells.",
    );
    expect(select?.layoutConstraints).toContain(
      "Standalone Select controls render stacked full-width with the label above the dropdown; do not use the compact side-label row with label left and dropdown right.",
    );
    expect(select?.layoutConstraints).toContain(
      "Prefer compact two-column inline layout only for related short Select pairs that tune one workflow or entity.",
    );
    expect(select?.layoutConstraints).toContain(
      "Use vertical one-select-per-row layout for single Select controls and as the fallback when a Select pair label, selected value, or option text would clip, truncate, or lose internal padding in the compact row.",
    );
    expect(select?.layoutConstraints).toContain(
      "If a compact Select pair falls back to vertical layout, record the fit reason in the spec or worklog.",
    );
  });

  it("keeps UI data variants in the exported stylesheet for standalone apps", () => {
    const uiStyles = readFileSync(
      resolve(cwd(), "../ui/src/styles.css"),
      "utf8",
    );

    for (const [variant, selector] of [
      ["data-horizontal", "[data-orientation='horizontal']"],
      ["data-vertical", "[data-orientation='vertical']"],
      ["data-active", "[data-state='active']"],
      ["data-checked", "[data-state='checked']"],
    ] as const) {
      expect(uiStyles).toContain(`@custom-variant ${variant}`);
      expect(uiStyles).toContain(selector);
    }
  });

  it("marks standalone controls as component-labeled standalone controls", () => {
    for (const id of [
      "palette",
      "vector",
      "color",
      "colorOpacity",
      "gradient",
      "fontPicker",
      "curves",
      "anchorGrid",
      "channelMixer",
      "imagePicker",
    ] as const) {
      const contract = getToolcraftComponentContract(id);

      expect(contract.kind).toBe("control");
      expect(contract.defaultSectionLayout).toBe("standalone");
      expect(contract.labelPolicy).toBe("component-owned");
    }
  });

  it("documents vector density and section grouping rules", () => {
    const contract = getToolcraftComponentContract("vector");

    expect(contract.aiUsageRules).toContain(
      "If the controls panel contains exactly one vector control, the runtime renders the vector pad as a square.",
    );
    expect(contract.aiUsageRules).toContain(
      "Multiple vector controls should live in separate semantic sections unless they intentionally belong to the same entity with other related controls.",
    );
    expect(contract.decisionCatalog?.ownsValueModel).toEqual(
      expect.arrayContaining([
        "user-authored stable position",
        "user-authored stable offset",
        "user-authored stable direction",
      ]),
    );
    expect(contract.decisionCatalog?.useWhen).toContain(
      "Use Vector for paired X/Y values only when the user is meant to manually author a stable two-axis product parameter such as position, offset, direction, focus, anchor, light direction, or color-balance movement.",
    );
    expect(contract.decisionCatalog?.doNotReplaceWith).toContain(
      "Do not replace animation, keyboard input, pointer input, physics, timeline phase, velocity, or simulated pose state with Vector just because the internal value has x/y coordinates.",
    );
    expect(contract.decisionCatalog?.acceptableAlternatives).toContain(
      "Use timeline, keyboard/pointer handlers, motion sliders, path/step controls, or renderer simulation state when movement is generated by animation or user input rather than authored as a stable panel value.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use Vector only for user-authored stable two-axis product parameters. Do not expose Vector for current animation state, keyboard movement, pointer movement, physics state, timeline phase, velocity, target pose, current pose, or simulated position/direction.",
    );
    expect(contract.aiUsageRules).toContain(
      "Before adding a Vector control to an animated or interactive product, classify movement ownership as direct-authored, timeline-driven, keyboard/pointer-driven, or simulation-owned. Only direct-authored movement may become a visible Vector control; the other ownership modes stay in renderer/runtime interaction state and use controls such as Speed, Step, Spread, Path, Duration, or Timeline when the user needs tuning.",
    );
    expect(contract.aiUsageRules).toContain(
      'Use variant: "whiteBalance" for temperature/tint pads: X maps cool blue to warm amber, Y maps green to magenta.',
    );
    expect(contract.aiUsageRules).toContain(
      'Use variant: "colorBalance" for paired color-balance axes such as cyan/red and blue/yellow correction.',
    );
    expect(contract.aiUsageRules).toContain(
      'Use the default vector variant for spatial values such as position, offset, direction, focus, anchor, and light direction.',
    );
    expect(contract.aiUsageRules).toContain(
      'Default spatial vector pads use coordinateMode: "screen": dragging left/up makes vector.x and vector.y smaller so canvas objects move left/up without renderer-side Y inversion.',
    );
    expect(contract.aiUsageRules).toContain(
      "Vector pad value labels render compact rounded coordinates. Do not expose raw floating-point strings such as -0.07070312499999998 in the controls panel.",
    );
    expect(contract.aiUsageRules).toContain(
      "Double-clicking a vector pad resets both axes to the control default through the normal runtime value update, matching section header reset semantics; if no default is defined, the fallback is 0,0. Do not add a separate custom reset UI for this basic pad reset behavior.",
    );
    expect(contract.aiUsageRules).toContain(
      "Holding Shift while dragging a vector pad locks movement to the dominant axis and must not select text or page content; do not build a custom pad just to support axis-constrained movement.",
    );
    expect(contract.aiUsageRules).toContain(
      'Use coordinateMode: "cartesian" only when the product intentionally exposes mathematical Y-up coordinates instead of canvas/screen movement.',
    );
    expect(contract.aiUsageRules).toContain(
      "Vector is a compound control; acceptance must prove vector.x and vector.y both affect the product output and that the vector represents a user-authored stable two-axis parameter rather than current animation, input, or simulation state.",
    );
  });

  it("marks grouped controls as label-required grouped controls", () => {
    for (const id of [
      "slider",
      "rangeSlider",
      "select",
      "segmented",
      "switch",
      "checkbox",
      "text",
      "rangeInput",
      "actions",
    ] as const) {
      const contract = getToolcraftComponentContract(id);

      expect(contract.kind).toBe("control");
      expect(contract.defaultSectionLayout).toBe("grouped");
      expect(contract.labelPolicy).toBe("required");
    }
  });

  it("documents context-only labels for binary controls", () => {
    const switchContract = getToolcraftComponentContract("switch");
    const checkboxContract = getToolcraftComponentContract("checkbox");

    expect(switchContract.aiUsageRules).toContain(
      'Switch labels name the setting context only; do not prefix labels with "Enable" or "Disable" because the switch already communicates on/off behavior.',
    );
    expect(switchContract.aiUsageRules).toContain(
      'Use labels such as "CRT", "Background", "Glow", or "Loop" instead of "Enable CRT" or "Disable background".',
    );
    expect(switchContract.aiUsageRules).toContain(
      "Two adjacent Switch controls for the same product entity must share one inline row when every visible label fits without truncation. Keep paired labels to short one- or two-word names; the runtime auto-pairs safe adjacent switches by target entity, and generated schemas should stack switches only when any label would truncate.",
    );
    expect(switchContract.aiUsageRules).toContain(
      "When the nearest section title already names the switch context, do not duplicate that title as the visible switch label. Use label false for a visual-only toggle and keep the meaning in target/description.",
    );
    expect(switchContract.aiUsageRules).toContain(
      'A Switch may share an inline row with one related parameter control when the visible switch label is short enough to fit. That row uses equal-width columns and the same horizontal column gap as paired Select controls; never shrink the switch column to intrinsic width. The non-switch parameter uses label false in that row; if its label is needed, stack the controls instead. In section-owned rows, use a short visible switch label such as "Include" instead of repeating the section title, such as "Include background" inside Background.',
    );
    expect(checkboxContract.aiUsageRules).toContain(
      'Checkbox labels name the setting context only; do not prefix labels with "Enable" or "Disable" because the checkbox already communicates enabled/selected state.',
    );
    expect(checkboxContract.aiUsageRules).toContain(
      'Use labels such as "Transparent background", "Guides", or "Loop" instead of "Enable transparent background".',
    );
    expect(checkboxContract.aiUsageRules).toContain(
      "When the nearest section title already names the checkbox context, do not duplicate that title as the visible checkbox label. Use label false for a visual-only checkbox and keep the meaning in target/description.",
    );
    expect(checkboxContract.aiUsageRules).toContain(
      "Two adjacent Checkbox controls for the same product entity must share one inline row when every visible label fits without truncation. Keep paired labels to short one- or two-word names; the runtime auto-pairs safe adjacent checkboxes by target entity, and generated schemas should stack checkboxes only when any label would truncate.",
    );
    expect(checkboxContract.aiUsageRules).toContain(
      "A Checkbox may share an inline row with one related parameter control when the visible checkbox label is short enough to fit. That row uses equal-width columns and the same horizontal column gap as paired Select controls; never shrink the checkbox column to intrinsic width. The non-checkbox parameter uses label false in that row; if its label is needed, stack the controls instead. Hide the checkbox label when the section title provides the visible context.",
    );
  });

  it("documents minimal UI rules for custom controls", () => {
    const contract = getToolcraftComponentContract("customControl");

    expect(contract.visualComponent).toBe("CustomControlRenderer");
    expect(contract.aiUsageRules).toContain(
      "Custom controls must render the minimum UI needed to understand the value, context, and available actions; avoid decorative metadata and text that repeats what the section, label, or visible item already explains.",
    );
    expect(contract.aiUsageRules).toContain(
      "Every visible custom-control element must justify its space by enabling selection, ordering, preview, removal, upload, editing, or status that affects the product.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use a custom control to recreate a built-in Slider, RangeSlider, Select, Segmented, Switch, Checkbox, Color, ColorOpacity, Gradient, FontPicker, ImagePicker, FileDrop, TextInput, CodeTextarea, RangeInput, Palette, Actions, CollectionActions, Curves, AnchorGrid, ChannelMixer, Vector, or PanelActions control.",
    );
    expect(contract.aiUsageRules).toContain(
      "When a custom control owns a growable, removable, selectable, or reorderable runtime item set, its builtInFitCheck must explicitly check collectionActions and actions before choosing custom; this is based on the value model and user workflow, not on entity names such as masks or glyphs.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not justify custom controls with icons, layout, styling, compactness, or custom buttons alone. The fit check must name the product interaction or value model that built-ins cannot express.",
    );
    expect(contract.aiUsageRules).toContain(
      "Custom controls may use Toolcraft primitives for small app-specific chrome, but must not import or render low-level runtime surfaces or duplicate toolbar, timeline, layers, canvas, panel, or built-in control mechanics.",
    );
    expect(contract.aiUsageRules).toContain(
      "Custom-control action buttons must be sized for the interaction. Do not shrink destructive, reorder, upload, or primary actions below comfortable kit button/icon-button sizes just to fit more text.",
    );
  });

  it("documents Actions as local section command groups", () => {
    const contract = getToolcraftComponentContract("actions");

    expect(contract.stateMode).toBe("command-only");
    expect(contract.decisionCatalog?.ownsValueModel).toContain(
      "entity-scoped command group",
    );
    expect(contract.decisionCatalog?.useWhen).toContain(
      "Use Actions for section-scoped commands such as Randomize palette, Normalize weights, Sort glyphs, Clear selection, Duplicate item, or Reset current entity.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use Actions for local commands inside the current section when the command affects only the nearby entity or workflow step.",
    );
    expect(contract.aiUsageRules).toContain(
      "Good Actions examples: Randomize palette, Normalize weights, Sort glyphs, Clear selection, Duplicate item, Reset current layer, Reset current stop, or Shuffle shades.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use Actions for final product delivery actions; use sticky panelActions for Export, Copy, Download, Generate, or Apply.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use Actions for animation transport; Play, Pause, Resume, Restart, and Scrub belong to the top timeline when timeline behavior exists.",
    );
    expect(contract.decisionCatalog?.layoutConstraints).toContain(
      "Do not set an Actions control label to the exact same visible text as its only button; use a short one- or two-word context label such as Ink wash, Palette action, or Current layer while the button keeps the command verb.",
    );
    expect(contract.decisionCatalog?.layoutConstraints).toContain(
      "Actions never use a side-label layout. If a visible label exists, it sits above the buttons.",
    );
    expect(contract.decisionCatalog?.layoutConstraints).toContain(
      "Actions buttons render as a two-column grid. One visible button occupies the left half of the section; two buttons occupy one half each; more than two buttons wrap into additional 50% cells.",
    );
    expect(contract.decisionCatalog?.layoutConstraints).toContain(
      "Do not center or right-align a partial final Actions row; an odd trailing button stays in the left 50% cell.",
    );
    expect(contract.aiUsageRules).toContain(
      "For a single visible Actions button, the control label and button label must not be identical; make the control label a concise context and the button label the command.",
    );
    expect(contract.aiUsageRules).toContain(
      "Render the Actions label above the buttons; do not put the label on the left with buttons on the right.",
    );
    expect(contract.aiUsageRules).toContain(
      "Render Actions buttons in 50% cells: one button uses the left half, two buttons fill one row, and larger groups continue in two columns.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not stretch an odd trailing Actions button full-width.",
    );
    expect(contract.aiUsageRules).toContain(
      'For local reset-like actions, use product-specific values such as "reset-current-layer" or "reset-palette" and handle them through ToolcraftApp onPanelAction; do not use a bare "reset" value unless the action intentionally runs controls.reset.',
    );
  });

  it("documents CollectionActions as canvas-backed add/remove controls", () => {
    const contract = getToolcraftComponentContract("collectionActions");

    expect(contract.stateMode).toBe("controlled");
    expect(contract.decisionCatalog?.strictness).toBe("exact-owner");
    expect(contract.decisionCatalog?.ownsValueModel).toContain(
      "repeatable product entity collection",
    );
    expect(contract.decisionCatalog?.useWhen).toContain(
      "Use CollectionActions instead of a count Slider when the user edits the actual set of items rather than only a numeric amount.",
    );
    expect(contract.decisionCatalog?.doNotReplaceWith).toContain(
      "Do not use Slider to add or remove real collection items.",
    );
    expect(contract.decisionCatalog?.layoutConstraints).toContain(
      "recommendedMaxItems is an agent/layout/performance hint, not a hard add limit; hardMaxItems is allowed only for real algorithm, format, API, export, or proven performance limits.",
    );
    expect(contract.decisionCatalog?.requiredAcceptance.join(" ")).toMatch(
      /canvas preview and export/i,
    );
    expect(contract.aiUsageRules).toContain(
      "Adding or removing collection items must update the runtime target array consumed by the renderer and export; do not add panel-only items.",
    );
    expect(contract.aiUsageRules).toContain(
      "recommendedMaxItems is advisory only and must not disable the plus button. Use hardMaxItems only when a real product, algorithm, API, export, or measured performance limit requires it.",
    );
    expect(contract.aiUsageRules.join(" ")).toMatch(/TextInput/);
    expect(contract.aiUsageRules.join(" ")).toMatch(/FontPicker/);
    expect(contract.aiUsageRules).toContain(
      "Use FontPicker as the collection item control when each repeated item is a typography/text-style entity; do not split its font, color, opacity, size, case, letter-spacing, or line-height into sibling collection fields.",
    );
  });

  it("documents Palette as a constrained design-token color control", () => {
    const contract = getToolcraftComponentContract("palette");

    expect(contract.decisionCatalog?.ownsValueModel).toContain(
      "style-guide color token",
    );
    expect(contract.decisionCatalog?.useWhen).toContain(
      "Use Palette for token-based color choices such as brand palettes, Tailwind-like shade scales, semantic palette families, or style-guide colors.",
    );
    expect(contract.decisionCatalog?.doNotReplaceWith).toContain(
      "Do not use Palette for gradients, free hex colors, text color inside FontPicker, or a color value that owns opacity.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use Palette only when the product value is a constrained design-token palette choice with both family and shade.",
    );
    expect(contract.aiUsageRules).toContain(
      "Good Palette examples: brand palette family and shade, Tailwind-like token color, style-guide color scale, semantic palette family, or theme accent token.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use Palette for arbitrary free color picking; use Color instead.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use Palette when opacity belongs to the same color entity; use ColorOpacity instead.",
    );
    expect(contract.decisionCatalog?.requiredAcceptance).toContain(
      "Prove Palette family and shade selections update runtime state immediately, before delayed persistence/commit settles.",
    );
    expect(contract.aiUsageRules).toContain(
      "Palette is a live control like Color and Slider: family and shade changes must update runtime state immediately so the next canvas interaction uses the selected token without waiting for delayed commit or persistence timers.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use Palette for gradients or color transitions; use Gradient instead.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not split typography color out to Palette when the text styling belongs to FontPicker.",
    );
  });

  it("keeps toolbar and controls panels behind PanelHost with their snap defaults", () => {
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.toolbar.requiredWrapper).toBe("PanelHost");
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.toolbar.defaultPlacement).toBe("bottom");
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.toolbar.snapEdges).toEqual(["top", "bottom"]);
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.toolbar.capabilities).toContain(
      "keyboardShortcuts",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.toolbar.aiUsageRules).toContain(
      "Toolbar history owns Undo and Redo buttons plus runtime keyboard shortcuts.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.toolbar.aiUsageRules).toContain(
      "Do not add app-level Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, or Ctrl+Y listeners; use toolbar history and runtime commands.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.toolbar.aiUsageRules).toContain(
      "Undo/redo keyboard shortcuts must not fire while the user is typing into inputs, textareas, selects, or contentEditable value labels.",
    );

    expect(TOOLCRAFT_COMPONENT_CONTRACTS.controlsPanel.requiredWrapper).toBe("PanelHost");
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.controlsPanel.defaultPlacement).toBe("right");
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.controlsPanel.snapEdges).toEqual(["left", "right"]);
  });

  it("preserves canvas runtime commands and patch history", () => {
    const contract = getToolcraftComponentContract("canvas");

    expect(contract.kind).toBe("canvas");
    expect(contract.stateMode).toBe("runtime-owned");
    expect(contract.historyPolicy).toBe("patch");
    expect(contract.visualComponent).toBe("CanvasShell");
    expect(contract.commands).toContain("canvas.setSize");
    expect(contract.commands).toContain("canvas.panBy");
    expect(contract.commands).toContain("canvas.setOffset");
    expect(contract.commands).toContain("media.import");
    expect(contract.commands).toContain("media.transform");
    expect(contract.capabilities).toContain("editable-size");
    expect(contract.aiUsageRules).toContain(
      "Do not let canvas.upload choose intrinsic-media by default. Upload without explicit sizing resolves to editable-output so source/background images do not own product output size.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use intrinsic-media only for true media-viewer or source-native apps where the natural uploaded/generated media size is the product output; record the reason and prove it with intrinsic-media-size acceptance.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use editable-output for generated, exportable, shader, poster, badge, wall, banner, thumbnail, procedural, reference-clone, and product-output apps so users always see Aspect ratio, Canvas width, and Canvas height.",
    );
    expect(contract.aiUsageRules).toContain(
      "When an uploaded image is a background/source inside the product canvas, keep the current canvas.size, keep Setup/canvas controls visible, and render the image as cover/crop inside the current canvas bounds without letterbox or aspect distortion.",
    );
    expect(contract.aiUsageRules).toContain(
      "A user-provided, reference, fixed-format, or base/default size is not a reason to remove size controls; model it as canvas.size plus editable-output so the size is an initial value, not a hidden lock.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use fixed-output for generated product/output apps with export actions. Reserve fixed-output for non-product internal fixtures where width and height truly must never be user-editable, and prove that lock with canvasSizingCoverage fixed-output-size acceptance.",
    );
    expect(contract.aiUsageRules).toContain(
      "A reference or previous app lacking a size editor, or defining a fixed-size baseline, is not a fixed-output reason for a generated product app; product-output clones still use editable-output.",
    );
    expect(contract.aiUsageRules).toContain(
      "Resolved canvas.size exists for every canvas app, but visible Canvas width and Canvas height controls are mandatory only for editable-output sizing and live in the mandatory runtime Setup section.",
    );
    expect(contract.aiUsageRules).toContain(
      "If canvas.size is provided without an explicit sizing mode, defineToolcraft treats it as editable-output and adds Canvas width and Canvas height controls.",
    );
    expect(contract.aiUsageRules).toContain(
      "The runtime Canvas width and Canvas height block uses the mandatory headerless Setup controls block; do not add a separate Canvas section label above these fields.",
    );
    expect(contract.aiUsageRules).toContain(
      "When the user manually edits Canvas width or Canvas height, the runtime keeps the typed dimension, keeps the other dimension unchanged, switches Aspect ratio to Custom, and shows the reduced current ratio in the custom ratio inputs.",
    );
    expect(contract.aiUsageRules).toContain(
      "Aspect ratio presets are the only interaction that may resize both canvas dimensions from a preset; manual size inputs are exact output dimensions.",
    );
    expect(contract.aiUsageRules).toContain(
      "For non-vector raster, Canvas 2D, WebGL, and WebGPU previews, set canvas.renderScale: true so the runtime adds Resolution scale after canvas sizing. The scale changes backing pixels from 1 to 2 without changing visible canvas size, and adding/enabling it requires targeted browser evidence that the canvas stays responsive at the selected scale.",
    );
    expect(contract.aiUsageRules).toContain(
      "After enabling canvas.renderScale, verify that canvas preview stays responsive while dragging sliders and other high-frequency controls at the selected scale.",
    );
    expect(contract.aiUsageRules).toContain(
      "Performance fixes for canvas.renderScale must preserve the selected visual quality; do not silently downsample, stretch a lower-resolution backing canvas, blur output, or clamp canvas.renderScale below the user's chosen value to pass budgets.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not enable canvas.renderScale for DOM/SVG/vector-native previews; preserve vector fidelity through native vector rendering instead of raster supersampling.",
    );
  });

  it("documents persistence as a runtime-owned policy instead of ad hoc localStorage", () => {
    const contract = getToolcraftComponentContract("persistence");

    expect(contract.kind).toBe("persistence");
    expect(contract.stateMode).toBe("runtime-owned");
    expect(contract.historyPolicy).toBe("never");
    expect(contract.aiUsageRules).toContain("Do not write app state to localStorage directly.");
    expect(contract.aiUsageRules).toContain(
      "Use schema persistence policy for app state that should survive reload.",
    );
    expect(contract.aiUsageRules).toContain(
      "Persistence may include values, canvas, panels, timeline, layers, and media; history is not persisted.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use persistence include: [\"media\"] only when runtime media state must survive reload, such as predefined attached files that users can delete, reorder, or transform. Do not use ad hoc storage for media state.",
    );
    expect(contract.aiUsageRules).toContain(
      'Apps with visible runtime panels and localStorage persistence must include "panels" so dragged panel positions survive reload.',
    );
    expect(contract.aiUsageRules).toContain(
      'Apps with localStorage persistence must include acceptance coverage for changing a user setting, reloading the browser page, and seeing the restored value or product output.',
    );
    expect(contract.aiUsageRules).toContain(
      "Settings import/export is a mandatory runtime preset transfer feature; it must not be used to hide or replace broken persistence reload behavior.",
    );
  });

  it("documents settings transfer as a mandatory runtime-owned feature", () => {
    const contract = getToolcraftComponentContract("settingsTransfer");

    expect(contract.kind).toBe("settings");
    expect(contract.stateMode).toBe("runtime-owned");
    expect(contract.aiUsageRules).toContain(
      "Generated apps keep a controls panel so runtime Setup is visible from the first run; product controls are added after that mandatory runtime section.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not gate Export Settings / Import Settings behind complexity thresholds, app size, or prompt wording.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not hand-roll settings import/export through app routes, hidden file inputs, or panelActions.",
    );
    expect(contract.aiUsageRules).toContain(
      "Settings transfer appears in the first visible headerless Setup controls-panel block; it imports and exports control values, canvas size, and timeline state.",
    );
    expect(contract.aiUsageRules).toContain(
      "App-authored sections must not declare runtime Setup targets such as runtime.settingsTransfer, canvas.aspectRatio, canvas.size.width, canvas.size.height, canvas.renderScale, or panels.timeline.extended; those controls never suppress the mandatory runtime Setup controls.",
    );
    expect(contract.aiUsageRules).toContain(
      "When editable-output canvas sizing is enabled, the first visible Setup runtime section contains Export Settings, Import Settings, Aspect ratio, Canvas width, Canvas height, and optional Resolution scale in that order.",
    );
    expect(contract.aiUsageRules).toContain(
      "When panels.timeline is enabled, Setup appends the Timeline switch as the last control; when panels.timeline is omitted, the Timeline switch must not appear.",
    );
  });

  it("documents slider visual variants as explicit schema choices", () => {
    const slider = getToolcraftComponentContract("slider");
    const rangeSlider = getToolcraftComponentContract("rangeSlider");

    expect(slider.decisionCatalog.requiredAcceptance).toContain(
      "Prove dragging the slider changes product output or the intended runtime side effect while the drag is in progress, not only after pointer release, blur, Apply, or a final commit.",
    );
    expect(slider.aiUsageRules).toContain(
      "Sliders are live canvas controls: dragging must update runtime state and product output in real time by default.",
    );
    expect(slider.aiUsageRules).toContain(
      "Do not implement slider values as deferred local drafts, Apply-only updates, pointer-up-only commits, or renderer changes that appear only after the user asks again.",
    );
    expect(slider.aiUsageRules).toContain(
      "Slider performance coverage must use a real control-drag scenario; control-change coverage is not enough to prove live canvas feedback or drag smoothness.",
    );
    expect(slider.aiUsageRules).toContain(
      "If a live slider causes jank, optimize the renderer path first: update uniforms or stable buffers, cache expensive inputs, coalesce preview work to requestAnimationFrame, cancel stale async renders, move heavy work off React, or switch renderer strategy.",
    );
    expect(slider.aiUsageRules).toContain(
      "Only in an extreme documented performance ceiling may a slider use a degraded live preview or delayed heavy refinement; the user must still see immediate canvas feedback while dragging and the worklog must record the measured reason.",
    );
    expect(slider.aiUsageRules).toContain(
      "Slider step means numeric snapping only; it does not make the slider visually discrete by itself.",
    );
    expect(slider.aiUsageRules).toContain(
      "Classify every stepped slider as stepped continuous or visual discrete before writing the schema.",
    );
    expect(slider.aiUsageRules).toContain(
      'Small semantic integer domains such as rows, cols, gaps, jitter, counts, levels, bands, passes, points, tiles, and segments must use variant: "discrete".',
    );
    expect(slider.aiUsageRules).toContain(
      'Finite animation step domains such as flip depth, character count, glyph steps, and frame steps must use variant: "discrete" when the marker count stays within the Toolcraft visual budget.',
    );
    expect(slider.aiUsageRules).toContain(
      "Large or precision stepped ranges such as speed, FPS, rate, duration, density, size, and intensity stay visually continuous even when they declare step.",
    );
    expect(slider.aiUsageRules).toContain(
      "Use slider unit only for real measurement suffixes such as %, px, °, s, ms, fps, rows/cols, or similar domain units.",
    );
    expect(slider.aiUsageRules).toContain(
      "Do not use unit for repeated entity nouns already named by the section or label, such as Letters + letters, Shape Density / Count + shapes, Words + words, Symbols + symbols, Items + items, Particles + particles, or Layers + layers.",
    );
    expect(slider.aiUsageRules).toContain(
      'Do not use unit: "x"; scale, multiplier, intensity, opacity, strength, depth, and shader amount sliders display plain numbers unless a real measurement unit applies.',
    );
    expect(slider.aiUsageRules).toContain(
      "When the value needs an entity noun to make sense, improve the label or section title instead of appending that noun as the value unit.",
    );
    expect(slider.aiUsageRules).toContain(
      "Compact symbol/CSS units render tight, such as 70%, 24px, and 8s; word units render with a space, such as 5 cols, when they are truly needed.",
    );
    expect(slider.aiUsageRules).toContain(
      "Slider valueLabel is editable only when it contains a numeric value; textual state labels such as Normal are display-only and must not expose hover or click editing affordances.",
    );
    expect(slider.aiUsageRules).toContain(
      "Schema sliders render stacked at full width; do not put sliders in two-column inline layout groups.",
    );
    expect(slider.aiUsageRules).toContain(
      "The fontPicker component is the only built-in exception with two internal footer sliders for letter spacing and line height.",
    );
    expect(slider.aiUsageRules).toContain(
      'Browser verification can inspect [data-slot="slider"][data-variant="discrete"] plus slider markers to prove the Toolcraft component variant rendered.',
    );
    expect(slider.aiUsageRules).toContain(
      "Visual discrete sliders must still drag smoothly; browser performance tests should use expectToolcraftDiscreteSliderDragSmoothness for real pointer drag.",
    );
    expect(slider.aiUsageRules).toContain(
      "Use visibleWhen for sliders that are meaningful only in some mode/type/source/include/count states; inactive branches should disappear so the panel shows only controls usable in the current state.",
    );
    expect(slider.aiUsageRules).toContain(
      "Do not use schema disabled: true or disabledWhen for product sliders; product panels should show only controls usable in the current state. Use visibleWhen for unavailable product states instead of rendering disabled controls.",
    );
    expect(slider.aiUsageRules).toContain(
      "Do not leave an inactive conditional slider visible while making the renderer ignore it; hide it with visibleWhen.",
    );
    expect(rangeSlider.decisionCatalog.requiredAcceptance).toContain(
      "Prove dragging rangeSlider.lower and rangeSlider.upper both affect product output while the drag is in progress, not only after pointer release, blur, Apply, or a final commit.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Range sliders are live canvas controls: dragging either thumb must update runtime state and product output in real time by default.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Do not implement range slider values as deferred local drafts, Apply-only updates, pointer-up-only commits, or renderer changes that appear only after the user asks again.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Range slider performance coverage must use a real control-drag scenario; control-change coverage is not enough to prove live canvas feedback or drag smoothness.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "If a live range slider causes jank, optimize the renderer path first: update uniforms or stable buffers, cache expensive inputs, coalesce preview work to requestAnimationFrame, cancel stale async renders, move heavy work off React, or switch renderer strategy.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Only in an extreme documented performance ceiling may a range slider use a degraded live preview or delayed heavy refinement; the user must still see immediate canvas feedback while dragging and the worklog must record the measured reason.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Range slider step means numeric snapping only; it does not make the range slider visually discrete by itself.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Classify every stepped range slider as stepped continuous or visual discrete before writing the schema.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      'Small semantic integer domains such as rows, cols, gaps, jitter, counts, levels, bands, passes, points, tiles, and segments must use variant: "discrete".',
    );
    expect(rangeSlider.aiUsageRules).toContain(
      'Finite animation step domains such as flip depth, character count, glyph steps, and frame steps must use variant: "discrete" when the marker count stays within the Toolcraft visual budget.',
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Large or precision stepped ranges such as speed, FPS, rate, duration, density, size, and intensity stay visually continuous even when they declare step.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Use rangeSlider unit only for real measurement suffixes; do not use it for repeated entity nouns already named by the section or label, and do not use x as a unit.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "When a range label needs an entity noun to make sense, improve the label or section title instead of appending that noun as the value unit.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Compact symbol/CSS units render tight, such as 20% – 80% or 12px – 48px; word units render with a space when truly needed.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "RangeSlider is always a full-width two-thumb control; never place it in an inline two-column layout group with another slider or range slider.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "RangeSlider defaultValue must start with different lower and upper values so the two-thumb control does not collapse into a single-value slider.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Manual range value editing accepts common separators such as slash, hyphen, spaces, and dashes, including when values include unit suffixes such as 30%-150% or 30% - 90%; do not create custom parsers for RangeSlider labels.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Visual discrete sliders must still drag smoothly; browser performance tests should use expectToolcraftDiscreteSliderDragSmoothness for real pointer drag.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Use visibleWhen for range sliders that are meaningful only in some mode/type/source/include/count states; inactive branches should disappear so the panel shows only controls usable in the current state.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Do not use schema disabled: true or disabledWhen for product range sliders; product panels should show only controls usable in the current state. Use visibleWhen for unavailable product states instead of rendering disabled controls.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Do not leave an inactive conditional range slider visible while making the renderer ignore it; hide it with visibleWhen.",
    );
    expect(rangeSlider.aiUsageRules).toContain(
      "Acceptance must prove both rangeSlider.lower and rangeSlider.upper change the product output; testing one handle is not enough.",
    );
  });

  it("documents compound control part coverage requirements", () => {
    const color = getToolcraftComponentContract("color");
    const colorOpacity = getToolcraftComponentContract("colorOpacity");
    const gradient = getToolcraftComponentContract("gradient");
    const fontPicker = getToolcraftComponentContract("fontPicker");
    const rangeInput = getToolcraftComponentContract("rangeInput");
    const palette = getToolcraftComponentContract("palette");
    const curves = getToolcraftComponentContract("curves");
    const anchorGrid = getToolcraftComponentContract("anchorGrid");
    const channelMixer = getToolcraftComponentContract("channelMixer");
    const appEntityAcceptance = getToolcraftComponentContract("appEntityAcceptance");

    expect(color.aiUsageRules).toContain(
      "Product-output apps always expose renderer-owned output background color as a schema color target such as appearance.background or scene.background.",
    );
    expect(color.aiUsageRules).toContain(
      'Pair renderer-owned output background color with export.includeBackground in one Background section directly before export settings. Use an equal-width inline row with the export.includeBackground Switch labeled "Include" on the left and the background Color parameter with label false on the right; each control occupies one half of the row.',
    );
    expect(color.aiUsageRules).toContain(
      "Preview, PNG export, and video export must read the runtime background color value instead of hardcoding that background in CSS, Canvas fillStyle, or WebGL clearColor. export.includeBackground controls live preview product background and PNG alpha; it must not make the Toolcraft canvas shell/backing or video output transparent.",
    );
    expect(color.aiUsageRules).toContain(
      "When one short numeric/text field and one Color field configure the same entity, keep them in one two-column inline layout group.",
    );
    expect(color.aiUsageRules).toContain(
      'Mixed inline rows usually require visible labels on both controls. Toggle-plus-parameter rows are the section-owned exception: keep the Switch/Checkbox label visible and set the non-toggle parameter label to false; if the parameter label is needed, stack the controls instead. All 50/50 inline rows use the same horizontal column gap as paired Select controls. The required Background row uses the Switch label "Include" and sets the background Color control label to false. Palette variation color banks are the other exception when the group/section label already names the color bank.',
    );
    expect(color.aiUsageRules).toContain(
      "Plain Color popovers must not show opacity controls. If opacity is editable, use ColorOpacity instead.",
    );
    expect(color.aiUsageRules).toContain(
      "Decide color label visibility from the user's point of view. Omit labels for color banks that only add palette variety, such as Accent Shades, Bead Colors, or palette.accent1..5.",
    );
    expect(color.aiUsageRules).toContain(
      "Make color label visibility a group-level decision: do not mix labeled and unlabeled items inside one semantic color bank.",
    );
    expect(color.aiUsageRules).toContain(
      "Keep visible labels when colors edit distinct user-facing entities or roles, such as Fill, Stroke, Background, Connector, Object, or Highlight.",
    );
    expect(color.aiUsageRules).toContain(
      "A color bank can share a section with distribution controls such as Spread, Mix, or Randomness and still keep each color item unlabeled when the section title names the palette context.",
    );
    expect(color.aiUsageRules).toContain(
      "If a multi-color bank has an odd trailing plain Color, keep that last Color at half width; only ColorOpacity or intentionally full-width compound controls occupy a full row.",
    );
    expect(gradient.aiUsageRules).toContain(
      "Gradient is a compound control; acceptance must prove gradient.gradientType, gradient.angle, gradient.stops.position, gradient.stops.color, and gradient.stops.opacity all affect the product output when visible.",
    );
    expect(gradient.aiUsageRules).toContain(
      "Keep Gradient type/angle, draggable stop track, and Stops list inside the built-in Gradient control. The full Gradient control is visually separated with content-width dividers only when it shares a section with sibling controls; do not put dividers only around the Stops list and do not rebuild it as separate schema controls.",
    );
    expect(gradient.aiUsageRules).toContain(
      "If the renderer intentionally supports only a subset of gradient behavior, do not use the full Gradient control; use simpler controls that match the renderer behavior.",
    );
    expect(fontPicker.aiUsageRules).toContain(
      "FontPicker owns the font preview select, virtualized font popup, category filters, search, preview loading, font-weight select, font-size input, text-case select, text color/opacity control, letter-spacing slider, and line-height slider.",
    );
    expect(fontPicker.aiUsageRules).toContain(
      'Do not recreate FontPicker with a plain Select plus separate sliders; use type: "fontPicker" so the popup mechanics and footer controls stay intact.',
    );
    expect(fontPicker.aiUsageRules).toContain(
      "FontPicker standard/default text color is #FFFFFF with opacity 100; omit color/opacity or use those values unless the prompt or reference explicitly requires a different initial text color.",
    );
    expect(fontPicker.aiUsageRules).toContain(
      "Any product text controlled by FontPicker must render fontId, fontWeight, fontSize, letterSpacing, lineHeight, textCase, color, and opacity in preview and export; do not leave typography values as panel-only runtime state.",
    );
    expect(fontPicker.aiUsageRules).toContain(
      "FontPicker is an atomic compound typography control. Do not split any owned typography part into a neighboring schema control for the same product text entity.",
    );
    expect(fontPicker.aiUsageRules).toContain(
      "FontPicker is a compound control; acceptance must prove fontPicker.fontId, fontPicker.fontWeight, fontPicker.fontSize, fontPicker.letterSpacing, fontPicker.lineHeight, fontPicker.textCase, fontPicker.color, and fontPicker.opacity all affect the product output.",
    );
    expect(fontPicker.aiUsageRules).toContain(
      "FontPicker acceptance must inspect the actual product text output after changing font, weight, size, letter spacing, line height, text case, color, and opacity; runtime state, select labels, or popup preview text alone are not enough.",
    );
    expect(colorOpacity.aiUsageRules).toContain(
      'Do not split ColorOpacity into a separate Color plus Slider/Input for opacity; use type: "colorOpacity" so the color popover and percent input stay visually connected.',
    );
    expect(colorOpacity.aiUsageRules).toContain(
      "ColorOpacity is the only color control variant that may expose opacity in the color picker popover; plain Color popovers hide opacity controls.",
    );
    expect(colorOpacity.aiUsageRules).toContain(
      "Do not place ColorOpacity in inline two-column layout groups. If either color control has opacity, keep the controls stacked.",
    );
    expect(colorOpacity.aiUsageRules).toContain(
      "Only plain Color controls without opacity may render in two-column color rows.",
    );
    expect(colorOpacity.aiUsageRules).toContain(
      "Acceptance must prove colorOpacity.hex and colorOpacity.opacity both affect the product output; testing only the swatch or only runtime state is not enough.",
    );
    expect(rangeInput.aiUsageRules).toContain(
      "RangeInput is a compound control; acceptance must prove rangeInput.start and rangeInput.end both affect the product output.",
    );
    expect(palette.aiUsageRules).toContain(
      "Palette is a compound control; acceptance must prove palette.family and palette.shade both affect the product output.",
    );
    expect(curves.aiUsageRules).toContain(
      'Use Curves for editable remapping curves. RGB/R/G/B tabs are only for color-correction or channel-specific curves; use variant: "single" for one standalone curve without channel tabs.',
    );
    expect(curves.aiUsageRules).toContain(
      'Use variant: "single" for a single acceleration, bend, easing, opacity, response, depth, mask, threshold, tone-response, or mapping curve. Do not create a custom curve UI just to remove RGB tabs.',
    );
    expect(curves.aiUsageRules).toContain(
      "RGB Curves is a color-correction-specific case; do not force RGB/R/G/B tabs onto products that need only one response, bend, depth, or easing curve.",
    );
    expect(curves.aiUsageRules).toContain(
      'Use interpolation: "smooth" for photo/editor-like visual tone, color, and RGB curves where the curve should feel like a creative editor spline.',
    );
    expect(curves.aiUsageRules).toContain(
      'Use interpolation: "monotone" for depth, response, mask, opacity, threshold, and data-mapping curves where order must be preserved and overshoot is unsafe. Single curves default to monotone unless smooth is explicitly requested.',
    );
    expect(curves.aiUsageRules).toContain(
      "Single Curves is one labeled control without internal dividers; RGB Curves is the compound variant with channel tabs and section dividers when mixed with sibling controls.",
    );
    expect(curves.aiUsageRules).toContain(
      "RGB curves acceptance must prove curves.activeChannel and curves.points both affect the product output. Single curves acceptance proves curves.points.",
    );
    expect(curves.aiUsageRules).toContain(
      "Curves acceptance should include an off-center control point near an edge so smooth-vs-monotone interpolation mistakes are visible in product output.",
    );
    expect(anchorGrid.aiUsageRules).toContain(
      "AnchorGrid is a position selector; acceptance must prove anchorGrid.position changes product placement, not only selected button state.",
    );
    expect(anchorGrid.decisionCatalog?.acceptableAlternatives).toContain(
      "Use Vector only for stable direct-authored continuous position or direction parameters.",
    );
    expect(channelMixer.aiUsageRules).toContain(
      "ChannelMixer is RGB-specific: it renders R/G/B tabs and Red, Green, Blue sliders for an RGB channel matrix.",
    );
    expect(channelMixer.aiUsageRules).toContain(
      "Use ChannelMixer only for RGB channel mixing, channel swapping, or color-correction matrix behavior; do not use it for arbitrary channel lists.",
    );
    expect(channelMixer.decisionCatalog?.useWhen.join(" ")).toMatch(
      /RGB channel mixing/i,
    );
    expect(channelMixer.decisionCatalog?.doNotReplaceWith?.join(" ")).toMatch(
      /arbitrary non-RGB channels/i,
    );
    expect(channelMixer.aiUsageRules).toContain(
      "ChannelMixer is a compound control; acceptance must prove channelMixer.activeChannel and channelMixer.values both affect the product output.",
    );
    expect(appEntityAcceptance.aiUsageRules).toContain(
      "Compound controls must declare controlPartCoverage for every semantic value part required by their control type.",
    );
  });

  it("documents segmented controls as compact selector-only choices", () => {
    const segmented = getToolcraftComponentContract("segmented");

    expect(segmented.aiUsageRules).toContain(
      "Use Segmented only for compact mode choices where every cell keeps its internal padding.",
    );
    expect(segmented.aiUsageRules).toContain(
      "If a segmented control is too wide, first shorten option labels; if the compact labels still exceed the width budget, use Select because it has the same selection mechanics without broken cells.",
    );
  });

  it("documents app entity acceptance as product-output verification", () => {
    const contract = getToolcraftComponentContract("appEntityAcceptance");

    expect(contract.kind).toBe("composition");
    expect(contract.stateMode).toBe("runtime-owned");
    expect(contract.capabilities).toContain("product-output-verification");
    expect(contract.aiUsageRules).toContain(
      "Every app entity introduced by the AI must have an acceptance test that proves its product responsibility.",
    );
    expect(contract.aiUsageRules).toContain(
      "Any supplied video, GIF, screen-recording, contact-sheet, or extracted-frame reference requires a Video Reference Study before implementation: storyboard frames, frame-to-frame transition analysis, behavior decomposition, and acceptance mapping. Do not implement video references from a single screenshot or high-level summary.",
    );
    expect(contract.aiUsageRules).toContain(
      "Compound control browser tests must explicitly exercise each required value part, not only one visible sub-control.",
    );
    expect(contract.aiUsageRules).toContain(
      "Acceptance tests must fail when an entity is disconnected from runtime state, renderer output, export output, or command side effects.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not accept typecheck, component existence, registered commands, runtime state mutation, renderer input objects, shader uniform presence, or signature strings as final proof.",
    );
    expect(contract.aiUsageRules).toContain(
      "A generic canvas hash difference is not enough for workload or semantic controls; assert the intended direction of the effect.",
    );
    expect(contract.aiUsageRules).toContain(
      "Component variants are accepted entities too; tests should fail if a non-default Toolcraft control variant falls back to the default variant or custom markup.",
    );
    expect(contract.aiUsageRules).toContain(
      "Conditional entities require fixtures that make the condition observable.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use visibleWhen for mode-, type-, source-, include-, variant-, or count-exclusive sections or controls that do not belong to the current selected state.",
    );
    expect(contract.aiUsageRules).toContain(
      "When a count/quantity control determines how many sibling controls are available, hide unavailable siblings with visibleWhen; do not render all possible controls while the renderer reads only the first N.",
    );
    expect(contract.aiUsageRules).toContain(
      "If a switch/select/segmented/imagePicker/checkbox chooses a branch for the same product entity, controls outside the current branch use visibleWhen, not disabledWhen.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use schema disabled: true or disabledWhen for generated product controls; the panel should show only controls usable in the current state. Runtime primitives may still have disabled styling internally, but app schemas should model product availability with visibleWhen.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not leave inactive conditional controls visible while making the renderer ignore them.",
    );
  });

  it("documents performance acceptance for custom renderer workload controls", () => {
    const contract = getToolcraftComponentContract("performanceAcceptance");

    expect(contract.kind).toBe("composition");
    expect(contract.stateMode).toBe("runtime-owned");
    expect(contract.capabilities).toContain("performance-budgets");
    expect(contract.capabilities).toContain("workload-control-tests");
    expect(contract.aiUsageRules).toContain(
      "Custom renderers must define performance budgets for media import, preview updates, control drags, and export/copy before implementation.",
    );
    expect(contract.aiUsageRules).toContain(
      "Controls that change renderer workload by changing output dimensions, element count, density, sample count, iteration count, blur/filter radius, shader branch cost, media processing, text layout, or export quality must be tested at min, default, and max values.",
    );
    expect(contract.aiUsageRules).toContain(
      "For workload control scenarios, stressFixture is the tested control value. If the app has an independent heavy baseline such as large media, long text, many items, high render scale, or dense source state, declare workloadFixture and apply it before the measured control interaction.",
    );
    expect(contract.aiUsageRules).toContain(
      "Hash differs is not enough for workload controls; tests must assert semantic direction, such as density increasing item count or size changes reducing/increasing rendered cells.",
    );
    expect(contract.aiUsageRules).toContain(
      "Performance tests must use representative fixtures and the same renderer/export path as the running app, not only tiny 32px fixtures or isolated helper state.",
    );
    expect(contract.aiUsageRules).toContain(
      'Media-import workload fixtures and media workload baselines must use fixture kind "media" with numeric width and height at least 1920x1080-equivalent; 640x480 preview fixtures cannot satisfy upload, effect-control, or image-processing performance coverage.',
    );
    expect(contract.aiUsageRules).toContain(
      "Slider drags and high-frequency controls must debounce or coalesce preview work, cancel stale async renders, and avoid re-decoding media on every control change.",
    );
    expect(contract.aiUsageRules).toContain(
      "Performance matrices must declare rendererWorkload as none, simple-composition, text-output, vector-output, or pixel-output.",
    );
    expect(contract.aiUsageRules).toContain(
      "A full performance checkpoint must run only when the first working app version exists or the user requests performance, lag, jank, animation speed, drag/zoom stabilization work, or otherwise complains about performance; use the agent-controlled browser first and pnpm verify:perf only as the Playwright fallback.",
    );
    expect(contract.aiUsageRules).toContain(
      "Renderer, canvas, animation, export, timeline, layers, canvas.renderScale, bug fixes, and performance-sensitive control changes use targeted functional/browser checks first and targeted performance scenarios only for touched workload, viewport, or export paths.",
    );
    expect(contract.aiUsageRules).toContain(
      "Performance fixes must preserve selected output and preview quality; do not reduce image quality, selected renderScale, export resolution, source media fidelity, or canvas backing pixels as the hidden way to pass budgets.",
    );
    expect(contract.aiUsageRules).toContain(
      "When canvas or slider interactions lag, diagnose where the slowdown comes from before changing output quality: renderer technique, React update frequency, decoded media, shader/program setup, buffer uploads, layout work, async render cancellation, or animation scheduling.",
    );
    expect(contract.aiUsageRules).toContain(
      "Renderer specs must include a Renderer Technique Decision Matrix with sourceRepresentation, productRepresentation, previewRenderer, exportRenderer, rendererWorkload, rendererStrategy, whyNotAlternativeStrategies, fidelityRisks, and performanceRisks.",
    );
    expect(contract.aiUsageRules).toContain(
      "Custom renderer apps must mirror the Renderer Technique Decision Matrix in typed rendererTechnique config so validation can reject contradictory renderer choices.",
    );
    expect(contract.aiUsageRules).toContain(
      "Custom renderer specs must include a Renderer Layer Inventory and mirror it in typed rendererTechnique.layers so dense raster backgrounds cannot silently rasterize semantic foreground output.",
    );
    expect(contract.aiUsageRules).toContain(
      "Semantic foreground output such as product lines, shapes, icons, text, object bounds, and meaningful markers should use DOM or SVG by default; dense raster backgrounds do not justify rasterizing low-count foreground geometry or text.",
    );
    expect(contract.aiUsageRules).toContain(
      "Editing handles must be DOM/SVG overlays, excluded from export, and written through runtime state instead of being drawn into the product raster layer.",
    );
    expect(contract.aiUsageRules).toContain(
      "Product foreground and editing handle renderer layers must declare uiSelector so browser tests can verify the visible layer exists.",
    );
    expect(contract.aiUsageRules).toContain(
      'productRepresentation "mixed" is valid only when rendererTechnique.layers proves at least two different content families.',
    );
    expect(contract.aiUsageRules).toContain(
      "Custom renderer apps must declare rendererPipeline with render passes, cache keys, execution location, preview/export quality, and interaction invalidation before implementation.",
    );
    expect(contract.aiUsageRules).toContain(
      "Render Pipeline Inventory must explain which runtime targets invalidate each expensive pass; high-frequency interactions such as animation frames, drag, zoom, pan, timeline playback, and mask movement must not invalidate upstream decode/preprocess/pixel-transform work unless that target truly changes the upstream result.",
    );
    expect(contract.aiUsageRules).toContain(
      "Cache-sensitive render passes such as decode, preprocess, pixel-transform, text-layout, rasterize, and composite must declare cache keys so tests can reject full recomputation on every control change.",
    );
    expect(contract.aiUsageRules.join("\n")).toMatch(/rendererTechnique/);
    expect(contract.aiUsageRules.join("\n")).toMatch(/rendererTechnique\.layers/);
    expect(contract.aiUsageRules.join("\n")).toMatch(/rendererPipeline/);
    expect(contract.aiUsageRules.join("\n")).toMatch(/Render Pipeline Inventory/);
    expect(contract.aiUsageRules.join("\n")).toMatch(/sourceRepresentation/);
    expect(contract.aiUsageRules.join("\n")).toMatch(/productRepresentation/);
    expect(contract.aiUsageRules.join("\n")).toMatch(/previewRenderer/);
    expect(contract.aiUsageRules.join("\n")).toMatch(/exportRenderer/);
    expect(contract.aiUsageRules).toContain(
      "Choose renderer technique from product context, not convenience or novelty. Preserve reference renderer technology in reference-runtime-clone mode unless a concrete blocker and replacement acceptance tests are named.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not switch renderer technology just because it seems more modern or faster. Preview and export may use different renderers only when the decision matrix explains why and export/copy remains product-quality.",
    );
    expect(contract.aiUsageRules).toContain(
      "Choose renderer workload by product fidelity before choosing rendering technology: ASCII, glyph grids, code art, subtitles, typography, or monospace text products are text-output unless the product intentionally rasterizes them into per-pixel effects.",
    );
    expect(contract.aiUsageRules).toContain(
      "Text-output and vector-output visible previews must preserve native output fidelity. Do not render a low-resolution offscreen canvas or texture and upscale it to the product size.",
    );
    expect(contract.aiUsageRules).toContain(
      "Pixel-output renderers must treat WebGL/WebGPU as the default candidate even when the scene is static; Canvas 2D is allowed only when measured worst-case evidence shows the CPU path preserves quality and remains responsive.",
    );
    expect(contract.aiUsageRules).toContain(
      "Procedural pixel renderers, shader-like effects, animated mesh gradients, and large exportable previews should use WebGL or WebGPU for pixel work instead of main-thread ImageData loops.",
    );
    expect(contract.aiUsageRules).toContain(
      "Detail-heavy Canvas 2D pixel/media renderers may stay on CPU only when rendererTechnique records measured stress evidence for rejecting WebGL/WebGPU; if the heavy media stress fails, move pixel work to GPU instead of lowering quality.",
    );
    expect(contract.aiUsageRules).toContain(
      "WebGL and WebGPU renderers must initialize contexts, programs, shaders, pipelines, textures, and large buffers once, then update uniforms or stable buffers when controls change.",
    );
    expect(contract.aiUsageRules).toContain(
      "For keyframe or playback renderers, texture upload and media decode must be keyed to source media/resource changes, not to timeline time or evaluated settings. Timeline-only updates must reuse decoded media and existing GPU resources.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not create WebGL/WebGPU contexts, shader programs, textures, or requestAnimationFrame loops directly in the React render path.",
    );
    expect(contract.aiUsageRules).toContain(
      "Animation loops must cancel scheduled frames during cleanup.",
    );
    expect(contract.aiUsageRules).toContain(
      "Animated preview renderers must suspend or coalesce non-essential animation work while the user drags, pans, pinches, zooms, or centers the canvas viewport, then resume from the correct timeline or autonomous time without changing the user's play/pause state.",
    );
    expect(contract.aiUsageRules).toContain(
      "If a generated app uses ImageData, getImageData, or putImageData for procedural output, performance validation must fail unless rendererTechnique records measured WebGL/WebGPU comparison evidence that the CPU path preserves quality and responsiveness, or the renderer is moved to GPU.",
    );
    expect(contract.aiUsageRules).toContain(
      "Performance matrices must declare rendererStrategy so tests can distinguish none, dom, svg, canvas-2d, webgl, and webgpu renderer paths.",
    );
    expect(contract.aiUsageRules).toContain(
      "If a renderer cannot meet the budget, first optimize renderer technique, caching, invalidation, scheduling, and critical-path work. Only change exposed product ranges, work units, or controls after recording measured evidence that the requested quality ceiling is impossible; do not silently reduce product quality to pass budgets.",
    );
  });

  it("documents reference runtime clone mode as a tested composition contract", () => {
    const contract = getToolcraftComponentContract("referenceRuntimeClone");

    expect(contract.kind).toBe("composition");
    expect(contract.schemaType).toBe("transferMode");
    expect(contract.visualComponent).toBe("canvasContent");
    expect(contract.capabilities).toContain("reference-runtime-clone");
    expect(contract.capabilities).toContain("reference-timeline-inventory");
    expect(contract.aiUsageRules).toContain(
      'Use transferMode: "reference-runtime-clone" when the user asks to port, clone, copy, or reproduce an existing app exactly.',
    );
    expect(contract.aiUsageRules).toContain(
      "Preserve the reference runtime as the source of truth instead of replacing it with a new renderer or timeline model.",
    );
    expect(contract.aiUsageRules).toContain(
      "Port requestAnimationFrame loops, refs, mutable particle/object state, connection state, spawn/update cadence, lifetime rules, pause/resume, export/copy, canvas sizing, and media lifecycle when the reference depends on them.",
    );
    expect(contract.aiUsageRules).toContain(
      "Reference clone timeline choice is based on timeline behavior, not only on whether the reference draws a timeline-shaped UI.",
    );
    expect(contract.aiUsageRules).toContain(
      "If the reference has Play/Pause, Restart from beginning, current time/progress, duration, loop, scrub, selected range, trim handles, or video export timing, write a Reference Timeline Inventory before choosing a timeline mode.",
    );
    expect(contract.aiUsageRules).toContain(
      'Use referenceTimeline.mode "toolcraft-playback" for plain transport behavior such as play/pause, restart, duration/progress, loop, scrub, or export at time.',
    );
    expect(contract.aiUsageRules).toContain(
      "Reference clone specs must list every detected transport behavior explicitly, including pause-resume, restart, time-progress, export-at-time, playback, scrub, duration, loop, and keyframes when present.",
    );
    expect(contract.aiUsageRules).toContain(
      'Toolcraft reference timelines must declare referenceTimeline.loopDuration with source "reference", "user-request", or "product-derived", plus seconds and evidence; runtime/template fallback 8s is not a valid source.',
    );
    expect(contract.aiUsageRules).toContain(
      "panels.timeline.defaultDurationSeconds must match referenceTimeline.loopDuration.seconds for referenceTimeline.mode toolcraft-playback/toolcraft-keyframes.",
    );
    expect(contract.aiUsageRules).toContain(
      'Do not downgrade custom reference timelines to panels.timeline mode "playback". State buttons, trim handles, selected-range playback, or range export require referenceTimeline.mode "custom-reference-timeline" and dedicated acceptance.',
    );
    expect(contract.aiUsageRules).toContain(
      "Reference clone acceptance must include referenceCoverage rows for canvas sizing, control mapping, renderer state, and any renderer loop, spawn/update cadence, pause/resume, export/copy, or media lifecycle behavior in the reference.",
    );
    expect(contract.aiUsageRules).toContain(
      "Video reference assets used in a reference clone also require starterTransferMode.videoReferenceStudy with storyboard frames, frame-to-frame transition analysis, behavior decomposition, and acceptance mapping.",
    );
  });

  it("documents concise control label rules", () => {
    const contract = getToolcraftComponentContract("controlLabels");

    expect(contract.kind).toBe("composition");
    expect(contract.visualComponent).toBe("ControlFieldLabel");
    expect(contract.aiUsageRules).toContain(
      "Control labels must be short UI names, usually one to three words.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not put explanations, formulas, units, parenthetical hints, or usage instructions in control labels.",
    );
    expect(contract.aiUsageRules).toContain(
      "A concise property label such as Speed, Color, Size, or Opacity is allowed when the nearest visible section or group clearly names the affected product entity.",
    );
    expect(contract.aiUsageRules).toContain(
      "When the section is generic, mixed, missing, or otherwise weak context, include the affected entity or role in the label: Pattern color, Background opacity, Wave speed, Stroke width.",
    );
    expect(contract.aiUsageRules).toContain(
      "Acceptance validators suggest semantic replacement labels for weak generic labels; fix the schema label instead of relying on runtime fallback rewriting.",
    );
    expect(contract.aiUsageRules).toContain(
      "Controls-panel sections should stay discrete: two to seven product controls is the normal size, and larger sections must split by product sub-entity or workflow stage.",
    );
    expect(contract.aiUsageRules).toContain(
      "Every app-authored controls-panel body section must have a short meaningful visible title. Runtime-created Setup renders as the first visible headerless controls block with no title, reset action, collapse button, or collapsed state; sticky footer action sections use the technical title Export but render without a visible heading.",
    );
    expect(contract.aiUsageRules).toContain(
      "Every visible app-authored controls-panel section title renders through the standard 36px collapsible header row with vertically centered text and the runtime collapse icon; generated apps must not hand-build section headers.",
    );
    expect(contract.aiUsageRules).toContain(
      "Controls-panel section expand and collapse uses the standard runtime height/opacity animation; generated apps must not replace it with instant custom section visibility.",
    );
    expect(contract.aiUsageRules).toContain(
      "Controls-panel section collapsed/expanded state persists as a runtime UI preference per app. It is not undo/redo state, not settings import/export state, and Reset controls must not clear it. Runtime Setup is not collapsible; sticky footer Export sections are not collapsible.",
    );
    expect(contract.aiUsageRules).toContain(
      "Ordinary controls-panel section headers expose the runtime section reset action before the collapse button; it dispatches controls.resetTargets and restores only that section's control targets to their schema defaultValue.",
    );
    expect(contract.aiUsageRules).toContain(
      "Runtime Setup and ordinary controls-panel body sections use 8px top spacing and 24px bottom spacing for their control content. Sticky footer action sections keep their dedicated spacing.",
    );
    expect(contract.aiUsageRules).toContain(
      "Broad section titles such as Flow, Icon, Shapes, Scene, Text, Typography, or Motion are only valid for small cohesive groups; use specific titles such as Flow Motion, Flow Geometry, Letter Burst, Shape Colors, Logo Glow, Logo Plate, or Text Block for larger groups.",
    );
    expect(contract.aiUsageRules).toContain(
      "Section titles in one controls panel must be unique.",
    );
    expect(contract.aiUsageRules).toContain(
      "Bad: Grid Density (every Nth). Good: Grid Density, with Every 6th as the select option label.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use control.description for the short help tooltip shown beside visible labels. It must describe the product behavior or output affected by the control, not restate the label.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not write label-recap descriptions such as Adjusts Opacity, Controls Speed, or Sets Background.",
    );
    expect(contract.aiUsageRules).toContain(
      "If there is no useful product-specific explanation, omit control.description; the runtime should not show a help tooltip for that label.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not add control.description to sequential colors such as Color 1, Color 2, or simple palette controls such as Spread when the section title already names the color or palette context.",
    );
    expect(contract.aiUsageRules).toContain(
      "For compound controls such as FontPicker, do not use control.description to enumerate the control's owned fields. FontPicker descriptions must not recap font family, weight, size, case, color, opacity, letter spacing, or line height; use description only for non-obvious product scope or omit it.",
    );
    expect(contract.aiUsageRules).toContain(
      "The runtime renders a filled Phosphor question icon beside each visible ControlFieldLabel; generated apps must not hand-build their own help icon beside built-in labels.",
    );
    expect(contract.capabilities).toContain("control-description-tooltip");
  });

  it("documents FontPicker help as product-specific scope only", () => {
    const contract = getToolcraftComponentContract("fontPicker");

    expect(contract.aiUsageRules).toContain(
      "Do not put a help tooltip on FontPicker just to list its owned fields. If the section title and FontPicker labels already make the text target clear, omit description.",
    );
  });

  it("documents image picker option acceptance as product behavior", () => {
    const contract = getToolcraftComponentContract("imagePicker");

    expect(contract.kind).toBe("control");
    expect(contract.defaultSectionLayout).toBe("standalone");
    expect(contract.aiUsageRules).toContain(
      "Every visible ImagePicker item must be actionable in the current product context.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not show selectable image choices that the renderer later sanitizes to a fallback or no-op.",
    );
    expect(contract.aiUsageRules).toContain(
      "Tests must choose each visible ImagePicker item and assert the selected image, texture, gradient, or exported pixels change in the product output.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not accept renderer data attributes, runtime target changes, or option existence as final proof that an image choice works.",
    );
  });

  it("preserves runtime panel commands for optional layers and timeline panels", () => {
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.commands).toContain("layers.reorder");
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.capabilities).toContain("selection");
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.aiUsageRules).toContain(
      "Do not enable the layers panel for single-layer apps.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.aiUsageRules).toContain(
      "When layers are enabled, layer-specific controls should target selectedLayer.* and apply to the currently selected runtime layer.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.aiUsageRules).toContain(
      "Do not use selectedLayer.* targets when panels.layers is disabled; single-layer apps use app-specific targets.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.aiUsageRules).toContain(
      "Layer-enabled apps need layerCoverage acceptance for selection, visibility, reorder, and grouping.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.aiUsageRules).toContain(
      "Every selectedLayer.* control needs selected-layer-controls acceptance proving it edits the currently selected layer output.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.aiUsageRules).toContain(
      "Layer browser coverage must use real LayersPanel rows and buttons, not direct layers.* command dispatch.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.layersPanel.aiUsageRules).toContain(
      "Layer-enabled custom renderers need layers.interactions viewport-stability coverage around real selection, visibility, reorder or grouping, and selected-layer output checks.",
    );

    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.commands).toContain(
      "timeline.setCurrentTime",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.commands).toContain(
      "timeline.togglePlayback",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.commands).toContain(
      "panels.setHidden",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.capabilities).toContain("keyframes");
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Any product output animation must enable the top Toolcraft timeline; do not ship animated product output with only local requestAnimationFrame playback.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Before choosing no timeline for any animated product, write an Animation Intent Inventory: product transport, editable keyframes, or autonomous decorative output, plus the user-facing time behaviors present or intentionally absent.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      'User-requested product animation defaults to panels.timeline mode "playback" unless the spec explicitly declares autonomous decorative/self-running output with no play, pause, scrub, duration, loop, export-at-time behavior, or video export.',
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      'Any product app with Export Video must enable the top Toolcraft timeline: use panels.timeline mode "playback" for product animation transport, or mode "keyframes" when exported animation is driven by keyframes.',
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Video export renderers must render deterministic frames from runtime timeline timestamps and duration; do not treat autonomous wall-clock time or captureStream recording time as the source of product duration.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Playback renderers must consume runtime timeline state; pause freezes output, scrubbing renders a deterministic frame, and the full animation cycle maps to state.timeline.durationSeconds instead of a local fixed duration.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      'When panels.timeline is enabled for a new Toolcraft app, appTransferMode.animationIntent must match it: mode "timeline-playback" for playback, or mode "timeline-keyframes" for keyframes.',
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "When the product has a known loop duration, declare it as panels.timeline.defaultDurationSeconds; the runtime timeline duration starts from that loop duration instead of an unrelated 8s default.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      'Timeline animation intent must declare loopDuration with source "reference", "user-request", or "product-derived", plus seconds and evidence; runtime/template fallback 8s is not a valid source.',
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "panels.timeline.defaultDurationSeconds must match animationIntent.loopDuration.seconds for playback/keyframe animation, so the initial timeline UI shows the declared product loop instead of a generic default.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Playback renderers may compute an initial loop duration default during app initialization or reset, but must not watch state.timeline.durationSeconds and dispatch timeline.setDuration back to a computed local duration. User-edited timeline duration becomes the loop duration source of truth after initialization or reset.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Playback renderers should use getToolcraftTimelineLoopTime or getToolcraftTimelineLoopProgress to derive product loop phase from state.timeline.currentTimeSeconds and state.timeline.durationSeconds; do not hand-roll wall-clock, fixed-duration, mirror, yoyo, ping-pong, or reverse phase math.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Product animation loop means a seamless forward-only cycle by default: motion advances in one direction, first and last frames stitch without a visible jump, and mirror/yoyo/ping-pong/reverse loops require explicit user request.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Changing timeline duration must preserve seamless forward-loop semantics: one full product animation cycle maps from 0 to state.timeline.durationSeconds, first and last frames still stitch, direction does not reverse, and changing duration must not switch the renderer to wall-clock or fixed local speed.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "When non-looping playback reaches the end, pressing Play again restarts playback from time 0.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Intrinsic-media upload timelines must stay paused at time 0 until source media exists; clearing the last media asset must pause and reset playback.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Do not put Pause or Resume in panelActions; playback belongs to TimelinePanel transport controls.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "In keyframes mode, Toolcraft infers keyframe diamonds from control type; AI must not manually pick a smaller subset of slider/vector/color-style controls.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Keyframe state stores typed control values; valueLabel is display-only and must never be parsed by renderers or tests as the source of truth.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Custom renderers with keyframes must consume evaluateToolcraftTimelineValues or useToolcraftEvaluatedValues for keyframed settings instead of raw state.values for those targets.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Every inferred keyframe-capable control must be evaluated from runtime timeline keyframes and needs acceptance proving diamond creation, row creation, keyframe updates, scrub/playback evaluation, and product output change.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Keyframe custom renderers must prove zoom, radar, and canvas viewport stability while expanding the timeline, creating keyframes, and scrubbing or playing the timeline.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Keyframe renderers must not re-decode media or re-upload source textures on timeline ticks, scrubs, playback, or evaluated setting changes.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Timeline-driven preview renderers must suspend or coalesce non-essential animation work during canvas drag, pan, pinch, zoom, and radar/center interactions without mutating the user's timeline play/pause state.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Use keyframeable: false only on controls that are structurally unsupported by the shared keyframe capability helper; capable controls cannot opt out to hide broken animation wiring.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Right-panel animation controls may tune renderer parameters such as mode, intensity, speed, or stagger only after animation intent is declared; they must not replace top timeline transport.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "Do not replace TimelinePanel with an app-level playback, transport, or timeline panel to avoid runtime performance issues; fix the Toolcraft runtime clock/state path instead.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      'Custom timeline UI is allowed only for explicit referenceTimeline.mode "custom-reference-timeline" transfers with browser-backed referenceTimelineCoverage.',
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      'When panels.timeline is enabled, runtime inserts a Setup switch labeled "Timeline" as the last runtime setup control after Resolution scale.',
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "The Timeline Setup switch controls only compact versus extended runtime presentation: off shows the compact Play-only transport, on shows the extended timeline with scrubber, duration, loop, and keyframe UI. It must not stop playback, change keyframes, affect export, enter product values, or be reset by Reset controls/settings transfer.",
    );
    expect(TOOLCRAFT_COMPONENT_CONTRACTS.timelinePanel.aiUsageRules).toContain(
      "If timeline verification fails, wire the renderer to runtime timeline state or remove panels.timeline.",
    );
  });

  it("keeps panel actions documented as sticky footer command controls", () => {
    const contract = getToolcraftComponentContract("panelActions");

    expect(contract.stateMode).toBe("command-only");
    expect(contract.commands).toEqual(["controls.apply"]);
    expect(contract.aiUsageRules).toContain(
      "Do not use panelActions for resetting controls; the controls panel header owns Reset controls.",
    );
    expect(contract.aiUsageRules).toContain(
      "Handle product-specific panelActions through ToolcraftApp onPanelAction.",
    );
    expect(contract.aiUsageRules).toContain(
      "Async product actions such as Export, Download, Copy, Generate, or Apply must return the real Promise from onPanelAction and report progress through the onPanelAction reportProgress callback.",
    );
    expect(contract.aiUsageRules).toContain(
      "The sticky footer top accent indicator is determinate when reportProgress receives 0..1 values and falls back to pending state only when progress is unavailable.",
    );
    expect(contract.aiUsageRules).toContain(
      "defineToolcraft hoists panelActions into the controls panel sticky footer automatically.",
    );
    expect(contract.aiUsageRules).toContain(
      "Product-output apps must always include export in panelActions.",
    );
    expect(contract.aiUsageRules).toContain(
      'Export-labeled panelActions use icon "upload-simple", matching the Setup "Export Settings" action; do not use "download", "download-simple", or "export" icons for Export PNG or Export Video.',
    );
    expect(contract.aiUsageRules).toContain(
      "Static or still-output apps include Export PNG as the primary footer action.",
    );
    expect(contract.aiUsageRules).toContain(
      'Every app with Export PNG must expose a separate "Image Export" controls section.',
    );
    expect(contract.aiUsageRules).toContain(
      'The Image Export section must include "export.image.format" as a Select control with PNG and JPG choices, defaulting to "png".',
    );
    expect(contract.aiUsageRules).toContain(
      'The Image Export section must include "export.image.resolution" as a Select control with 2K, 4K, and 8K choices, defaulting to "4k".',
    );
    expect(contract.aiUsageRules).toContain(
      "Image Export format and resolution render as one compact two-column inline Select pair, matching the Video Export settings structure.",
    );
    expect(contract.aiUsageRules).toContain(
      "Image Export resolution controls the actual exported image long edge: 2K = 2048px, 4K = 4096px, 8K = 8192px. Pass the selected runtime value to createToolcraftPngExportCanvas resolution and prove decoded image width/height in browser acceptance.",
    );
    expect(contract.aiUsageRules).toContain(
      "Animated apps include Export Video as the primary footer action and Export PNG as a secondary footer action.",
    );
    expect(contract.aiUsageRules).toContain(
      "Any app with Export Video must enable the top Toolcraft timeline; video duration, loop, and rendered timestamps come from runtime timeline state.",
    );
    expect(contract.aiUsageRules).toContain(
      'Animated apps with Export Video must expose a separate "Video Export" controls section.',
    );
    expect(contract.aiUsageRules).toContain(
      'Animated apps with both Export PNG and Export Video must expose both "Image Export" and "Video Export"; Image Export sits immediately before Video Export.',
    );
    expect(contract.aiUsageRules).toContain(
      'The Video Export section must include format and resolution controls such as targets "export.video.format" and "export.video.resolution".',
    );
    expect(contract.aiUsageRules).toContain(
      "Use Select controls for Video Export format and resolution; do not use Segmented unless the product has a deliberately tiny fixed output menu and browser tests prove every cell keeps padding.",
    );
    expect(contract.aiUsageRules).toContain(
      "Place the Video Export section as the final controls section directly above sticky footer panelActions.",
    );
    expect(contract.aiUsageRules).toContain(
      'Video Export format defaults to "mp4"; keep "webm" available as the baseline alternate unless the prompt/reference requires another default.',
    );
    expect(contract.aiUsageRules).toContain(
      'Video Export resolution defaults to "current"; keep "4k" available as the high-resolution alternate.',
    );
    expect(contract.aiUsageRules).toContain(
      "Video Export format and resolution are a compact semantic pair and should use a two-column inline layout by default; use stacked rows only when labels or selected values do not fit without clipping.",
    );
    expect(contract.aiUsageRules).toContain(
      'Baseline browser video formats are "mp4" and "webm"; MOV or ProRes require an explicit custom encoder/transcoder and dedicated acceptance plus performance coverage.',
    );
    expect(contract.aiUsageRules).toContain(
      "Video export code must choose the actual MIME/container through MediaRecorder.isTypeSupported or an equivalent encoder capability check, then fall back safely.",
    );
    expect(contract.aiUsageRules).toContain(
      "Video export must use getToolcraftVideoExportSize for current and 4K dimensions. Current video export uses the current canvas/output size with even encoder-safe rounding; 4K video fits inside an encoder-safe 3840x2160 box, preserves canvas aspect ratio, and uses even pixel dimensions. Do not hand-roll 4096px long-edge video sizing.",
    );
    expect(contract.aiUsageRules).toContain(
      "Video export must set recording canvas dimensions before captureStream, MediaRecorder, VideoEncoder, or equivalent encoder setup, and must reject recorder/encoder errors instead of returning corrupt blobs.",
    );
    expect(contract.aiUsageRules).toContain(
      "Offline video export duration must be encoded from runtime timeline timestamps. Do not rely on canvas.captureStream plus MediaRecorder wall-clock recording time as the only duration mechanism for rendered-frame export.",
    );
    expect(contract.aiUsageRules).toContain(
      'Video resolution must control exported dimensions. Use "current" output size by default; "4K" is an export resolution target, not a hardcoded 3840x2160 canvas lock.',
    );
    expect(contract.aiUsageRules).toContain(
      "Video export browser coverage must load the exported blob metadata and prove video.duration matches the edited runtime timeline duration; blobSize/blobType checks alone are not enough.",
    );
    expect(contract.aiUsageRules).toContain(
      "Video export must report frame-based progress through reportProgress during render/encode steps. PNG export should report phase progress for render, blob, and handoff when those phases are asynchronous.",
    );
    expect(contract.aiUsageRules).toContain(
      'Product-output apps must expose a dedicated "Background" section directly before the first export settings section. With PNG export that first section is Image Export; with video-only export it is Video Export.',
    );
    expect(contract.aiUsageRules).toContain(
      "Product-output apps must pass the includeBackground runtime value to createToolcraftPngExportCanvas for PNG alpha and call shouldIncludeToolcraftPreviewBackground(state) for live preview product background.",
    );
    expect(contract.aiUsageRules).toContain(
      "PNG export must use createToolcraftPngExportCanvas so background transparency and selected image dimensions or retina fallback are applied consistently; turning Include off makes preview product background and PNG alpha transparent without hiding the Toolcraft canvas backing or video background.",
    );
    expect(contract.aiUsageRules).toContain(
      "Video export must keep product background and use getToolcraftVideoExportSize for current/4K output dimensions.",
    );
    expect(contract.aiUsageRules).toContain(
      "Copy PNG can be a secondary action when clipboard output is useful, but copy does not replace export.",
    );
    expect(contract.aiUsageRules).toContain(
      "Add Copy PNG as a secondary action only when the prompt/reference includes clipboard output or the product clearly benefits from paste/share workflows.",
    );
    expect(contract.aiUsageRules).toContain(
      "Footer actions must be one compact horizontal group; do not split them into stacked full-width sections.",
    );
    expect(contract.aiUsageRules).toContain(
      "If two footer actions are needed, render secondary/outline on the left and primary on the right.",
    );
    expect(contract.aiUsageRules).toContain(
      "When an odd number of footer actions renders in two columns, the final unpaired action spans the full row width.",
    );
  });

  it("documents file upload ownership across single-layer and multi-layer apps", () => {
    const contract = getToolcraftComponentContract("fileDrop");

    expect(contract.commands).toEqual([
      "media.delete",
      "media.import",
      "media.reorder",
      "media.transform",
    ]);
    expect(contract.aiUsageRules).toContain(
      'Use fileDrop with assetKind: "image" for image-only source media and assetKind: "file" for arbitrary uploaded files.',
    );
    expect(contract.aiUsageRules).toContain(
      "If an app ships with predefined source files or background images, declare them as schema media.defaultAssets with sourceTarget matching the fileDrop control. They must render as ordinary attached files in fileDrop, not as hidden renderer constants or canvas placeholder artwork.",
    );
    expect(contract.aiUsageRules).toContain(
      "Predefined media files are default runtime state: users can remove them to get an empty source/canvas state, persistence may keep that removal with include: [\"media\"], and global or section Reset restores the default attached files.",
    );
    expect(contract.aiUsageRules).toContain(
      "When uploaded/imported content is part of the source-material flow, the canvas must not show agent-invented artwork, CTA text, fake sample output, decorative placeholders, or preset source designs before real content exists; keep the canvas neutral/runtime-backed and put upload affordance in fileDrop.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not add procedural Source Preset modes only to avoid an empty canvas. A default procedural or reference source is allowed only when the prompt/reference explicitly defines it and the worklog records that evidence.",
    );
    expect(contract.aiUsageRules).toContain(
      "In single-layer apps, the runtime shows the uploaded image as the fileDrop preview and provides the clear action.",
    );
    expect(contract.aiUsageRules).toContain(
      "In image mode, the runtime owns image transform actions: 90° Right, Flip horizontal, and Flip vertical. These actions render through the built-in actions-control in one three-column row with compact visible labels: 90°, Flip H, Flip V; keep a 6px vertical gap between the uploader and action row. Do not create a custom image action button grid. They update runtime mediaAssets transform metadata, and product preview/export must consume that metadata instead of keeping a separate transform state.",
    );
    expect(contract.aiUsageRules).toContain(
      "When exactly one uploaded image is present, image transform actions are visible immediately. When multiple images are present, users select a thumbnail first; no transform actions render until a thumbnail is selected, and the action applies only to that selected image.",
    );
    expect(contract.aiUsageRules).toContain(
      "In file mode, the runtime shows uploaded files as a sortable list with paperclip icons, file names, remove buttons, and --border/5 separators.",
    );
    expect(contract.aiUsageRules).toContain(
      "In single-layer apps, global Reset controls and section reset must restore fileDrop source media to schema media.defaultAssets for that target; when no default asset exists, Reset removes uploaded media and returns the fileDrop target to defaultValue.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use fileDrop with multiple: true when the app needs several uploaded images as one source set; do not build a custom thumbnail uploader for this.",
    );
    expect(contract.aiUsageRules).toContain(
      "When multiple uploaded images are present, the runtime appends media, shows a sortable four-column preview grid, puts the add-more tile last, and exposes per-image removal.",
    );
    expect(contract.aiUsageRules).toContain(
      "Canvas drops route to the first visible matching fileDrop target by asset kind: image files prefer image uploaders, non-image files prefer file uploaders, and file uploaders accept images only when no image uploader matches.",
    );
    expect(contract.aiUsageRules).toContain(
      "Dragging thumbnails reorders runtime mediaAssets; preview, export, and renderer mapping must consume that media order instead of maintaining a separate product-only order.",
    );
    expect(contract.aiUsageRules).toContain(
      "When uploaded images are used as canvas/background source material, draw them with cover/crop behavior: scale proportionally until the current canvas bounds are fully covered, keep the canvas size/settings unchanged, and crop overflow at the canvas bounds.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not create custom upload buttons, file lists, or file sorting for generic source uploads when fileDrop can represent the source set.",
    );
    expect(contract.aiUsageRules).toContain(
      "In multi-layer apps, deletion and visibility belong to the Layers panel; fileDrop remains an upload target.",
    );
  });

  it("documents semantic color section titles", () => {
    const contract = getToolcraftComponentContract("color");

    expect(contract.aiUsageRules).toContain(
      "Color controls can be standalone color sections or grouped fields inside a semantic control section.",
    );
    expect(contract.aiUsageRules).toContain(
      "First identify the semantic entity the color belongs to, such as Square 1, Square 2, Background, Object, Connector, Glow, Tone Mapping, Brand, or Export.",
    );
    expect(contract.aiUsageRules).toContain(
      "Keep a color inside a section when it configures the same entity as nearby controls. Example: Square 1 (Right) contains Connections, Hover radius, and Color in one section.",
    );
    expect(contract.aiUsageRules).toContain(
      "When color belongs to the same object or effect as nearby controls, keep it inside that section and use a concise field label that is unambiguous in context, such as Color in a Square section or Symbol color in a mixed Style section.",
    );
    expect(contract.aiUsageRules).toContain(
      "The standalone default applies only to color-only sections; mixed semantic sections keep color grouped with nearby controls.",
    );
    expect(contract.aiUsageRules).toContain(
      "Never use generic Color or Colors as a generated section title. If no meaningful color role exists and the colors are just basic colors, use a neutral section title such as Appearance instead of omitting the title.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not split a grouped object section into a separate generated Color section; if the color role is unclear, ask the user before implementation.",
    );
    expect(contract.aiUsageRules).toContain(
      "Render multiple related color fields in one section with at most two colors per row.",
    );
    expect(contract.aiUsageRules).toContain(
      "If a multi-color bank has an odd trailing plain Color, keep that last Color at half width; only ColorOpacity or intentionally full-width compound controls occupy a full row.",
    );
  });

  it("documents CodeTextarea as generic multiline text input", () => {
    const contract = getToolcraftComponentContract("code");

    expect(contract.visualComponent).toBe("CodeTextarea");
    expect(contract.defaultSectionLayout).toBe("standalone");
    expect(contract.labelPolicy).toBe("required");
    expect(contract.aiUsageRules).toContain(
      "CodeTextarea is the multiline text input for any potentially long value, not only source code.",
    );
    expect(contract.aiUsageRules).toContain(
      "Do not use CodeTextarea for short single-line canvas text, button labels, names, titles, captions, badges, or short tokens; use TextInput.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use text for short single-line strings such as names, button labels, small numeric values, compact prompts, titles, captions, and short tokens.",
    );
    expect(contract.aiUsageRules).toContain(
      "Use code only when the user may enter long prompts, multiline text, instructions, JSON, CSS, shader code, scripts, templates, or other long structured data.",
    );
    expect(contract.aiUsageRules).toContain(
      "If CodeTextarea has a short single-line default value, the schema description must make the long, multiline, or structured-content reason explicit.",
    );
    expect(contract.aiUsageRules).toContain(
      "CodeTextarea is a content editor and applies values while typing; do not wait for blur, Enter, or Cmd/Ctrl+Enter to update runtime state.",
    );
    expect(contract.aiUsageRules).toContain(
      "CodeTextarea height is capped at 12 visible text lines; long content scrolls inside the textarea instead of making the controls panel taller.",
    );
  });

  it("documents TextInput content and setting commit modes", () => {
    const contract = getToolcraftComponentContract("text");

    expect(contract.visualComponent).toBe("TextInput");
    expect(contract.defaultSectionLayout).toBe("grouped");
    expect(contract.labelPolicy).toBe("required");
    expect(contract.aiUsageRules).toContain(
      "TextInput owns short single-line product text: button labels, labels on the canvas, names, titles, captions, badges, short tokens, and compact prompts.",
    );
    expect(contract.aiUsageRules).toContain(
      'TextInput commitMode defaults to "content": text content, prompts, names, tokens, titles, and instructions apply while typing.',
    );
    expect(contract.aiUsageRules).toContain(
      'Use commitMode: "setting" for text inputs that edit settings such as font size, numeric-like style values, dimensions, ids, or configuration fields; setting text commits on blur or Enter.',
    );
    expect(contract.aiUsageRules).toContain(
      "Canvas width and Canvas height are runtime editable-size fields and always commit on blur or Enter like editor size fields.",
    );
  });

  it("preserves literal contract types from the getter", () => {
    const contract = getToolcraftComponentContract("slider");

    expectTypeOf(contract.id).toEqualTypeOf<"slider">();
    expectTypeOf(contract.kind).toEqualTypeOf<"control">();
    expectTypeOf(contract.defaultSectionLayout).toEqualTypeOf<"grouped">();
    expectTypeOf(contract.labelPolicy).toEqualTypeOf<"required">();
  });
});
