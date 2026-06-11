import Link from "next/link";
import { PageHeader } from "@/components/studio/page-header";
import { SectionCard } from "@/components/studio/section-card";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";

const sections = [
  {
    href: "/studio/node-types",
    title: "Node Types",
    description: "노드 타입 카탈로그 — family, archetype, lifecycle transitions",
  },
  {
    href: "/studio/edge-types",
    title: "Edge Types",
    description: "엣지 타입 카탈로그 — domain, range, cardinality",
  },
  {
    href: "/studio/properties",
    title: "Properties",
    description: "속성 카탈로그 — value type, constraints",
  },
  {
    href: "/studio/actions",
    title: "Action Contracts",
    description: "액션 컨트랙트 — preconditions, effects, executor",
  },
  {
    href: "/studio/instructions",
    title: "Instructions",
    description: "에이전트 지침 — trigger patterns, applicable node types",
  },
  {
    href: "/studio/archetypes",
    title: "Archetypes",
    description: "아키타입 — typical values, allowed mutations",
  },
];

export default function StudioPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Meta Action Studio"
        description="카탈로그는 타입별 메타 액션으로만 변경됩니다. 이 화면은 read-only 브라우저입니다."
      />

      <SectionCard title="Catalog Surfaces" subtitle="Phase 2 read model">
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
