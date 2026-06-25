import type { CatalogComponent } from "./types";
import { layoutComponents } from "./components/layout";
import { dataComponents } from "./components/data";
import { dataTableComponents } from "./components/data-table";
import { expandableTableComponents } from "./components/expandable-table";
import { ganttComponents } from "./components/gantt";
import { formComponents } from "./components/forms";
import { tokenComponents } from "./components/tokens";
import { documentComponents } from "./components/document";
import { spreadsheetComponents } from "./components/spreadsheet";
import { artifactWorkbenchComponents } from "./components/artifact-workbench";
import { widgetComponents } from "./components/widget";

/**
 * The JSON-render catalog: a registry of component type → renderer. Adding a
 * component = add it to a family module and it appears here. `UI_CATALOG_COMPONENTS`
 * is derived, so the list can never drift from the implementations.
 */
export const CATALOG: Record<string, CatalogComponent> = {
  ...layoutComponents,
  ...dataComponents,
  ...dataTableComponents,
  ...expandableTableComponents,
  ...ganttComponents,
  ...formComponents,
  ...tokenComponents,
  ...documentComponents,
  ...spreadsheetComponents,
  ...artifactWorkbenchComponents,
  ...widgetComponents,
};

export const UI_CATALOG_COMPONENTS = Object.keys(CATALOG);
