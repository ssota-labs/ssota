import { redirect } from "next/navigation";
import { approveGateAction } from "@/app/actions";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function GatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ports = getActionPorts();
  const gates = await ports.gate.listPendingGates();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Human Gate</h1>
      {gates.length === 0 ? (
        <p className="text-neutral-600">대기 중인 게이트가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {gates.map((gate) => (
            <li key={gate.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{gate.actionType}</p>
                  <p className="mt-1 text-sm text-neutral-600">{gate.reason}</p>
                  <pre className="mt-2 overflow-auto rounded bg-neutral-50 p-2 text-xs">
                    {JSON.stringify(gate.input, null, 2)}
                  </pre>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await approveGateAction(gate.id, true);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded bg-green-600 px-3 py-1.5 text-sm text-white"
                    >
                      승인
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await approveGateAction(gate.id, false);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded border px-3 py-1.5 text-sm"
                    >
                      반려
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
