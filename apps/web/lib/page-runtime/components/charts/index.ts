import type { CatalogComponent } from "../../types";
import { chartAreaComponent } from "./chart-area";
import { chartBarComponent } from "./chart-bar";
import { chartLineComponent } from "./chart-line";
import { chartPieComponent } from "./chart-pie";
import { chartRadarComponent } from "./chart-radar";
import { chartRadialComponent } from "./chart-radial";

export const chartComponents: Record<string, CatalogComponent> = {
  ChartLine: chartLineComponent,
  ChartBar: chartBarComponent,
  ChartArea: chartAreaComponent,
  ChartPie: chartPieComponent,
  ChartRadar: chartRadarComponent,
  ChartRadial: chartRadialComponent,
};
