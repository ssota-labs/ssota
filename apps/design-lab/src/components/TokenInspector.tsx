import { useMemo } from "react";

import { useDesignLab } from "../context/design-lab-context";
import {
  formatLengthFromPx,
  parseLengthToPx,
} from "../lib/override-engine";

export function TokenInspector() {
  const { selection, tokenOverrides, setTokenOverride } = useDesignLab();

  const tokens = selection?.tokens ?? [];

  const activeToken = useMemo(() => {
    if (tokens.length === 0) return null;
    return tokens[0];
  }, [tokens]);

  if (!selection) {
    return (
      <p className="text-xs text-muted-foreground">
        캔버스에서 컴포넌트를 클릭하면 편집 가능한 cn-* 토큰이 표시됩니다.
      </p>
    );
  }

  if (tokens.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">slot:</span>{" "}
        {selection.slot}
        <br />
        이 slot에 대한 토큰 매니페스트가 아직 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
        <p>
          <span className="text-muted-foreground">slot:</span>{" "}
          <code className="text-foreground">{selection.slot}</code>
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">classes:</span>{" "}
          <code className="text-foreground">
            {selection.cnClasses.join(" ") || "(none)"}
          </code>
        </p>
      </div>

      {tokens.map((token) => (
        <div key={token.className} className="space-y-2">
          <p className="text-xs font-medium text-foreground">
            {token.label}
            <span className="ml-1 font-normal text-muted-foreground">
              .{token.className}
            </span>
          </p>
          {token.fields.map((field) => {
            const current =
              tokenOverrides[token.className]?.[field.property] ??
              field.defaultValue;

            if (field.kind === "color") {
              return (
                <label
                  key={field.property}
                  className="flex flex-col gap-1 text-xs"
                >
                  <span className="text-muted-foreground">{field.label}</span>
                  <input
                    type="text"
                    value={current}
                    onChange={(e) =>
                      setTokenOverride(
                        token.className,
                        field.property,
                        e.target.value,
                      )
                    }
                    className="rounded-md border border-input bg-background px-2 py-1 font-mono text-[0.625rem]"
                  />
                </label>
              );
            }

            const px = parseLengthToPx(current);
            const min = field.min ?? 0;
            const max = field.max ?? 48;

            return (
              <label
                key={field.property}
                className="flex flex-col gap-1 text-xs"
              >
                <span className="flex justify-between text-muted-foreground">
                  <span>{field.label}</span>
                  <span className="font-mono text-foreground">{current}</span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={field.step ?? 1}
                  value={px}
                  onChange={(e) =>
                    setTokenOverride(
                      token.className,
                      field.property,
                      formatLengthFromPx(Number(e.target.value)),
                    )
                  }
                  className="w-full"
                />
              </label>
            );
          })}
        </div>
      ))}

      {activeToken && tokens.length > 1 && (
        <p className="text-[0.625rem] text-muted-foreground">
          {tokens.length}개 토큰 매칭됨 — 위에서 모두 편집 가능합니다.
        </p>
      )}
    </div>
  );
}
