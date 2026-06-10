import { redirect } from "next/navigation";
import { approveGateFormAction } from "@/app/actions";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@loopos/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@loopos/ui/components/ui/card";

export default async function GatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ports = getActionPorts();
  const gates = await ports.gate.listPendingGates();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Human Gate</h1>
      {gates.length === 0 ? (
        <p className="text-muted-foreground">대기 중인 게이트가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {gates.map((gate) => (
            <li key={gate.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{gate.actionType}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{gate.reason}</p>
                    <pre className="mt-2 overflow-auto rounded-md bg-muted p-2 text-xs">
                      {JSON.stringify(gate.input, null, 2)}
                    </pre>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveGateFormAction}>
                      <input type="hidden" name="gateId" value={gate.id} />
                      <input type="hidden" name="approved" value="true" />
                      <Button type="submit" size="sm">
                        승인
                      </Button>
                    </form>
                    <form action={approveGateFormAction}>
                      <input type="hidden" name="gateId" value={gate.id} />
                      <input type="hidden" name="approved" value="false" />
                      <Button type="submit" variant="outline" size="sm">
                        반려
                      </Button>
                    </form>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
