"use client";

import { Badge } from "@ssota/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { DynamicPageRenderer } from "@/lib/page-runtime/renderer";
import { getPageRuntimeDemo } from "@/lib/lab/page-runtime-demos";
import { cn } from "@/lib/utils";

type CatalogDemoMockupProps = {
  demoId: string;
  title: string;
  caption: string;
  className?: string;
};

const graphNodes = [
  { label: "User voice", detail: "Onboarding takes too long" },
  { label: "Product hypothesis", detail: "First success must happen in 3 minutes" },
  { label: "PRD", detail: "Project creation onboarding" },
  { label: "Tech design", detail: "Signup API + task seed" },
  { label: "Test result", detail: "E2E onboarding passes" },
  { label: "Approved context", detail: "Next agents can reuse it" },
];

const agentRows = [
  {
    agent: "Cursor",
    task: "Signup email verification",
    context: "PRD + policy + API spec",
    status: "review",
  },
  {
    agent: "Claude Code",
    task: "Onboarding E2E",
    context: "Feature spec + test criteria",
    status: "done",
  },
  {
    agent: "Codex",
    task: "Decision log summary",
    context: "Implementation evidence",
    status: "draft",
  },
];

function CatalogDemoMockup({
  demoId,
  title,
  caption,
  className,
}: CatalogDemoMockupProps) {
  const demo = getPageRuntimeDemo(demoId);

  return (
    <Card className={cn("min-h-0 overflow-hidden bg-card/80", className)}>
      <CardHeader className="border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{caption}</CardDescription>
          </div>
          <Badge variant="outline">UI catalog</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-border bg-muted/40 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            <span className="ml-2 rounded border border-border bg-background px-2 py-1 font-mono text-[0.65rem] text-muted-foreground">
              /labs/page-runtime?demo={demoId}
            </span>
          </div>
        </div>
        <div className="h-[25rem] overflow-hidden bg-background">
          {demo ? (
            <div className="origin-top-left scale-[0.68] p-5 [width:147%]">
              <DynamicPageRenderer
                spec={demo.spec}
                bindingData={demo.bindingData ?? {}}
              />
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Missing catalog demo: {demoId}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductWorkspaceMockup() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[0.85fr_1.15fr] gap-5">
      <div className="grid min-h-0 gap-5">
        <CatalogDemoMockup
          demoId="layout-shell"
          title="Workflow workspace"
          caption="Section, Toolbar, Tabs, and NodeTable in the live json-render catalog."
        />
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Approved context rail</CardTitle>
            <CardDescription>
              Product intent becomes reusable agent context only after review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {graphNodes.slice(0, 4).map((node, index) => (
              <div key={node.label} className="flex items-start gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-[0.65rem] text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{node.label}</p>
                  <p className="text-xs text-muted-foreground">{node.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <CatalogDemoMockup
        demoId="flow-canvas"
        title="Decision graph canvas"
        caption="A live FlowCanvas catalog component shown as the product graph surface."
        className="min-h-0"
      />
    </div>
  );
}

export function DecisionControlPlaneMockup() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1.05fr_0.95fr] gap-5">
      <Card className="bg-card/80">
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Agent work queue</CardTitle>
              <CardDescription>
                Every task carries the product artifacts it must follow.
              </CardDescription>
            </div>
            <Badge>Control plane</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[0.75fr_1.2fr_1.25fr_0.5fr] border-b border-border bg-muted/50 px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Agent</span>
            <span>Task</span>
            <span>Required context</span>
            <span>Status</span>
          </div>
          {agentRows.map((row) => (
            <div
              key={row.task}
              className="grid grid-cols-[0.75fr_1.2fr_1.25fr_0.5fr] items-center border-b border-border px-4 py-4 text-sm last:border-b-0"
            >
              <span className="font-medium">{row.agent}</span>
              <span>{row.task}</span>
              <span className="text-muted-foreground">{row.context}</span>
              <Badge variant={row.status === "done" ? "default" : "outline"}>
                {row.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid min-h-0 gap-5">
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Closed-loop evidence</CardTitle>
            <CardDescription>
              Work results are stored as decision evidence, not chat leftovers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {graphNodes.map((node, index) => (
                <div key={node.label} className="relative flex gap-3">
                  {index < graphNodes.length - 1 ? (
                    <span
                      className="absolute left-3 top-7 h-full w-px bg-border"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="relative mt-1 h-6 w-6 shrink-0 rounded-full border border-primary/40 bg-primary/10" />
                  <div>
                    <p className="text-sm font-medium">{node.label}</p>
                    <p className="text-xs text-muted-foreground">{node.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <CatalogDemoMockup
          demoId="data-table"
          title="Artifact table"
          caption="Catalog table UI for specs, policies, tasks, and evidence."
        />
      </div>
    </div>
  );
}
