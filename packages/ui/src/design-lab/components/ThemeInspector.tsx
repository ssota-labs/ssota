import { THEME_MANIFEST } from "../theme-manifest";
import { useDesignLab } from "../context/design-lab-context";
import {
  formatLengthFromPx,
  parseLengthToPx,
} from "../lib/override-engine";

export function ThemeInspector() {
  const { themeOverrides, setThemeOverride } = useDesignLab();

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        테마 변수는{" "}
        <code className="text-foreground">globals.css</code>의{" "}
        <code className="text-foreground">:root</code>에 적용합니다.
      </p>
      {THEME_MANIFEST.map((variable) => {
        const current =
          themeOverrides[variable.name] ?? variable.defaultValue;

        if (variable.kind === "color") {
          return (
            <label
              key={variable.name}
              className="flex flex-col gap-1 text-xs"
            >
              <span className="text-muted-foreground">{variable.label}</span>
              <input
                type="text"
                value={current}
                onChange={(e) =>
                  setThemeOverride(variable.name, e.target.value)
                }
                className="rounded-md border border-input bg-background px-2 py-1 font-mono text-[0.625rem]"
              />
            </label>
          );
        }

        const px = parseLengthToPx(current);
        return (
          <label key={variable.name} className="flex flex-col gap-1 text-xs">
            <span className="flex justify-between text-muted-foreground">
              <span>{variable.label}</span>
              <span className="font-mono text-foreground">{current}</span>
            </span>
            <input
              type="range"
              min={variable.min ?? 0}
              max={variable.max ?? 24}
              step={variable.step ?? 1}
              value={px}
              onChange={(e) =>
                setThemeOverride(
                  variable.name,
                  formatLengthFromPx(Number(e.target.value)),
                )
              }
              className="w-full"
            />
          </label>
        );
      })}
    </div>
  );
}
