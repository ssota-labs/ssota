import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import type { CatalogComponent } from "../types";

/** Structural / static display components. */
export const layoutComponents: Record<string, CatalogComponent> = {
  PageHeader: ({ props }) => (
    <header className="mb-4 space-y-1">
      <h1 className="text-2xl font-semibold">{String(props.title ?? "Page")}</h1>
      {props.subtitle ? (
        <p className="text-muted-foreground text-sm">{String(props.subtitle)}</p>
      ) : null}
    </header>
  ),
  Text: ({ props }) => <p className="text-sm">{String(props.text ?? "")}</p>,
  Badge: ({ props }) => (
    <Badge variant="secondary">{String(props.label ?? "Badge")}</Badge>
  ),
  Card: ({ props, children }) => (
    <Card className="mb-4">
      {props.title ? (
        <CardHeader>
          <CardTitle>{String(props.title)}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  ),
  Tabs: ({ children }) => (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">Tabs (mock layout)</p>
      {children}
    </div>
  ),
  SplitPane: ({ children }) => (
    <div className="grid gap-4 md:grid-cols-2">{children}</div>
  ),
};
