import Link from "next/link";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@ssota/ui/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ssota/ui/components/ui/table";
import { createEdgeTableFormAction } from "@/app/actions";
import { PageHeader } from "@/components/studio/page-header";
import { getActionPorts } from "@/lib/ports";

export default async function ContextGraphEdgesPage() {
  const ports = getActionPorts();
  const edges = await ports.catalog.listEdgeCatalogEntries();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edges"
        description="Edge tables define allowed relationships between node tables."
      />

      <div className="flex justify-end">
        <Sheet>
          <SheetTrigger render={<Button />}>New edge table</SheetTrigger>
          <SheetContent className="inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>New edge table</SheetTitle>
              <SheetDescription>define_edge_type 메타 액션을 실행합니다.</SheetDescription>
            </SheetHeader>
            <form action={createEdgeTableFormAction} className="space-y-4 px-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="edgeType">Key</Label>
                <Input id="edgeType" name="edgeType" placeholder="cites" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Source node types</Label>
                <Input id="domain" name="domain" placeholder="Document, Note" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="range">Target node types</Label>
                <Input id="range" name="range" placeholder="Document, Instruction" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardinality">Cardinality</Label>
                <Input id="cardinality" name="cardinality" defaultValue="many-to-many" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representation">Representation</Label>
                <Input id="representation" name="representation" defaultValue="directed" required />
              </div>
              <Button type="submit">Create edge table</Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edge tables</CardTitle>
          <CardDescription>Source/target constraints are enforced before commit.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Cardinality</TableHead>
                <TableHead>Representation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edges.map((edge) => (
                <TableRow key={edge.edgeType}>
                  <TableCell className="font-medium">
                    <Link href={`/context-graph/edges/${edge.edgeType}`} className="hover:underline">
                      {edge.edgeType}
                    </Link>
                  </TableCell>
                  <TableCell>{edge.domain.join(", ")}</TableCell>
                  <TableCell>{edge.range.join(", ")}</TableCell>
                  <TableCell>{edge.cardinality}</TableCell>
                  <TableCell>{edge.representation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
