import { redirect } from "next/navigation";
import { getActionPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function LogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ports = getActionPorts();
  const log = await ports.commit.getActionLog({ limit: 50 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Action Log</h1>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50">
            <tr>
              <th className="px-4 py-3">시간</th>
              <th className="px-4 py-3">액션</th>
              <th className="px-4 py-3">결과</th>
              <th className="px-4 py-3">실행자</th>
            </tr>
          </thead>
          <tbody>
            {log.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-neutral-600">
                  {entry.createdAt.toISOString()}
                </td>
                <td className="px-4 py-3 font-medium">{entry.actionType}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      entry.outcome === "committed"
                        ? "text-green-700"
                        : entry.outcome === "gated"
                          ? "text-amber-700"
                          : "text-red-700"
                    }
                  >
                    {entry.outcome}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {entry.executorType}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
