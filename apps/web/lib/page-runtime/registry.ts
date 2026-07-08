import type { CatalogComponent } from "./types";
import { layoutComponents } from "./components/layout";
import { dataComponents } from "./components/data";
import { schemaDisplayComponents } from "./components/schema-display";
import { testResultsComponents } from "./components/test-results";
import { dataTableComponents } from "./components/data-table";
import { expandableTableComponents } from "./components/expandable-table";
import { ganttComponents } from "./components/gantt";
import { formComponents } from "./components/forms";
import { tokenComponents } from "./components/tokens";
import { documentComponents } from "./components/document";
import { spreadsheetComponents } from "./components/spreadsheet";
import { artifactWorkbenchComponents } from "./components/artifact-workbench";
import { flowComponents } from "./components/flow-canvas";
import { wireframeComponents } from "./components/wireframe-canvas";
import { erdDiagramComponents } from "./components/erd-diagram";
import { widgetComponents } from "./components/widget";
import { figmaEmbedComponents } from "./components/figma-embed";
import { mediaEmbedComponents } from "./components/media-embed";
import { periodSelectComponents } from "./components/period-select";
import { chartComponents } from "./components/charts";
import { approvalComponents } from "./components/approval-inbox";
import { kanbanComponents } from "./components/kanban-board";
import { statComponents } from "./components/stat-tile";
import { calendarComponents } from "./components/calendar-view";
import { recordComponents } from "./components/record-view";
import { timelineComponents } from "./components/timeline";

/**
 * The JSON-render catalog: a registry of component type → renderer. Adding a
 * component = add it to a family module and it appears here. `UI_CATALOG_COMPONENTS`
 * is derived, so the list can never drift from the implementations.
 */
export const CATALOG: Record<string, CatalogComponent> = {
  ...layoutComponents,
  ...dataComponents,
  ...schemaDisplayComponents,
  ...testResultsComponents,
  ...dataTableComponents,
  ...expandableTableComponents,
  ...ganttComponents,
  ...formComponents,
  ...tokenComponents,
  ...documentComponents,
  ...spreadsheetComponents,
  ...artifactWorkbenchComponents,
  ...flowComponents,
  ...wireframeComponents,
  ...erdDiagramComponents,
  ...widgetComponents,
  ...figmaEmbedComponents,
  ...mediaEmbedComponents,
  ...periodSelectComponents,
  ...chartComponents,
  ...approvalComponents,
  ...kanbanComponents,
  ...statComponents,
  ...calendarComponents,
  ...recordComponents,
  ...timelineComponents,
};

export const UI_CATALOG_COMPONENTS = Object.keys(CATALOG);
