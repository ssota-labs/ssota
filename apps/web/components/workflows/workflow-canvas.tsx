"use client";

import * as React from "react";
import Link from "next/link";
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  ClockIcon,
  GavelIcon,
  LightningIcon,
  RobotIcon,
  CodeIcon,
} from "@phosphor-icons/react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { layoutFlowWithDagre } from "@/lib/page-runtime/flow-layout";
import { orgPath } from "@/lib/console/paths";
import type { WiringModel, WiringNode, WiringNodeKind } from "@/lib/workflows/build-wiring";

/**
 * Workflows 캔버스 — 이미 존재하는 배선(스케줄·에이전트·워커·액션·게이트)을 그린다.
 * 실행기가 아니다: 여기서 흐름을 "만들지" 않고, 무엇이 무엇을 부를 수 있는지 보여준다.
 */

/**
 * 5종 노드의 색은 semantic categorical 토큰(chart-1..5)을 쓴다 — raw palette 금지 [DS-02].
 * 테두리/칩 색을 인라인 스타일로 주는 이유: Tailwind는 런타임 변수 클래스를 생성하지 못한다.
 */
const KIND_STYLE: Record<
  WiringNodeKind,
  { token: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  trigger: { token: "var(--color-chart-1)", Icon: ClockIcon },
  agent: { token: "var(--color-chart-2)", Icon: RobotIcon },
  worker: { token: "var(--color-chart-3)", Icon: CodeIcon },
  action: { token: "var(--color-chart-4)", Icon: LightningIcon },
  gate: { token: "var(--color-chart-5)", Icon: GavelIcon },
};

const NODE_WIDTH = 210;
const NODE_HEIGHT = 68;

type WiringNodeData = WiringNode & { basePath: string };

function WiringFlowNode({ data }: NodeProps) {
  const node = data as unknown as WiringNodeData;
  const style = KIND_STYLE[node.kind];
  const Icon = style.Icon;
  const body = (
    <div
      className="flex h-full w-full flex-col justify-center gap-0.5 rounded-md border-2 bg-background px-2.5 py-1.5 shadow-sm"
      style={{ borderColor: style.token }}
      data-testid="workflow-node"
      data-kind={node.kind}
    >
      <div className="flex items-center gap-1.5">
        <span className="rounded p-0.5" style={{ backgroundColor: style.token, color: "var(--color-background)" }}>
          <Icon className="size-3" />
        </span>
        <span className="truncate text-xs font-medium">{node.label}</span>
      </div>
      {node.sublabel ? (
        <span className="truncate pl-6 text-[10px] text-muted-foreground">{node.sublabel}</span>
      ) : null}
    </div>
  );

  return (
    <>
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-muted-foreground" />
      {node.href ? (
        <Link href={`${node.basePath}/${node.href}`} className="block h-full w-full">
          {body}
        </Link>
      ) : (
        body
      )}
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-muted-foreground" />
    </>
  );
}

const NODE_TYPES = { wiring: WiringFlowNode };

export function WorkflowCanvas({
  model,
  orgSlug,
  teamspaceSlug,
}: {
  model: WiringModel;
  orgSlug: string;
  teamspaceSlug: string;
}) {
  const basePath = orgPath({ orgSlug, teamspaceSlug });

  const { nodes, edges } = React.useMemo(() => {
    const positions = layoutFlowWithDagre(
      {
        nodes: model.nodes.map((n) => ({
          id: n.id,
          title: n.label,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        })),
        edges: model.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      },
      "LR",
    );

    const flowNodes: Node[] = model.nodes.map((n) => ({
      id: n.id,
      type: "wiring",
      position: positions[n.id] ?? { x: 0, y: 0 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: { ...n, basePath } as unknown as Record<string, unknown>,
      draggable: true,
    }));

    const flowEdges: Edge[] = model.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.label === "may run",
      style: { strokeWidth: 1.5 },
      labelStyle: { fontSize: 10 },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [model, basePath]);

  return (
    <div className="h-full min-h-0 w-full" data-testid="workflow-canvas">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.15, minZoom: 0.2 }}
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export function WorkflowLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
      {(Object.keys(KIND_STYLE) as WiringNodeKind[]).map((kind) => {
        const { token, Icon } = KIND_STYLE[kind];
        return (
          <Badge key={kind} variant="outline" className="gap-1 text-[10px] font-normal">
            <span className="rounded p-0.5" style={{ backgroundColor: token, color: "var(--color-background)" }}>
              <Icon className="size-2.5" />
            </span>
            {kind}
          </Badge>
        );
      })}
      <p className="ml-auto text-[11px] text-muted-foreground">
        Wiring only — every write still goes through the action path.
      </p>
    </div>
  );
}
