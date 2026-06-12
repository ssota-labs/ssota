import type { ArgTypeDef } from "../lib/story-catalog";

function controlLabel(argType: ArgTypeDef): string {
  if (!argType.control) return "—";
  if (typeof argType.control === "string") return argType.control;
  return argType.control.type;
}

export function PropsTable({ argTypes }: { argTypes: Record<string, ArgTypeDef> }) {
  const entries = Object.entries(argTypes);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        argTypes가 정의되지 않았습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-3 py-2 font-medium text-foreground">Prop</th>
            <th className="px-3 py-2 font-medium text-foreground">Control</th>
            <th className="px-3 py-2 font-medium text-foreground">Options</th>
            <th className="px-3 py-2 font-medium text-foreground">Default</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, argType]) => (
            <tr key={name} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-mono text-foreground">{name}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {controlLabel(argType)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {argType.options?.join(", ") ?? "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {argType.table?.defaultValue?.summary ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
