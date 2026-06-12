import type { ArgTypeDef } from "../lib/story-catalog";

function controlType(argType: ArgTypeDef | undefined, value: unknown): string {
  if (argType?.control) {
    if (typeof argType.control === "string") return argType.control;
    return argType.control.type;
  }
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (argType?.options?.length) return "select";
  return "text";
}

function controlKeys(
  argTypes: Record<string, ArgTypeDef> | undefined,
  args: Record<string, unknown>,
): string[] {
  const keys = new Set<string>();
  if (argTypes) {
    for (const key of Object.keys(argTypes)) keys.add(key);
  }
  for (const key of Object.keys(args)) keys.add(key);
  return [...keys].sort();
}

type PropsControlsProps = {
  argTypes?: Record<string, ArgTypeDef>;
  args: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
};

export function PropsControls({
  argTypes,
  args,
  onChange,
  onReset,
}: PropsControlsProps) {
  const keys = controlKeys(argTypes, args);

  if (keys.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        이 variant에는 조작 가능한 props가 없습니다.{" "}
        <code className="text-foreground">args</code> 또는{" "}
        <code className="text-foreground">argTypes</code>를 story에 추가하세요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          선택한 variant의 props를 실시간으로 조작합니다.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-[0.625rem] hover:bg-muted"
        >
          Reset
        </button>
      </div>

      {keys.map((key) => {
        const argType = argTypes?.[key];
        const value = args[key];
        const type = controlType(argType, value);
        const label = (
          <span className="font-mono text-foreground">{key}</span>
        );

        if (type === "boolean") {
          return (
            <label
              key={key}
              className="flex items-center justify-between gap-2 text-xs"
            >
              {label}
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => onChange(key, e.target.checked)}
                className="size-4 rounded border-border"
              />
            </label>
          );
        }

        if (type === "select" && argType?.options?.length) {
          return (
            <label key={key} className="flex flex-col gap-1 text-xs">
              {label}
              <select
                value={String(value ?? "")}
                onChange={(e) => onChange(key, e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-foreground"
              >
                {argType.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (type === "number" || type === "range") {
          const num = typeof value === "number" ? value : Number(value) || 0;
          return (
            <label key={key} className="flex flex-col gap-1 text-xs">
              {label}
              <input
                type="number"
                value={num}
                onChange={(e) => onChange(key, Number(e.target.value))}
                className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-foreground"
              />
            </label>
          );
        }

        return (
          <label key={key} className="flex flex-col gap-1 text-xs">
            {label}
            {argType?.description && (
              <span className="text-muted-foreground">{argType.description}</span>
            )}
            <input
              type="text"
              value={value == null ? "" : String(value)}
              onChange={(e) => onChange(key, e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-foreground"
            />
          </label>
        );
      })}
    </div>
  );
}
