import { THEME_MANIFEST } from "../theme-manifest";
import { TOKEN_MANIFEST } from "../token-manifest";

export function ColorsPreview() {
  const colors = THEME_MANIFEST.filter((v) => v.kind === "color");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Theme colors</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          globals.css CSS 변수 — 오른쪽 Theme 패널에서 편집합니다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {colors.map((token) => (
          <div
            key={token.name}
            className="overflow-hidden rounded-lg border border-border"
          >
            <div
              className="h-16"
              style={{ backgroundColor: `var(${token.name})` }}
            />
            <div className="space-y-0.5 p-2">
              <p className="text-xs font-medium text-foreground">
                {token.label}
              </p>
              <p className="font-mono text-[0.625rem] text-muted-foreground">
                {token.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RadiusPreview() {
  const radius = THEME_MANIFEST.find((v) => v.name === "--radius");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Radius scale</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          --radius 기준 파생 값 (globals.css @theme inline)
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        {[
          { label: "sm", className: "rounded-sm" },
          { label: "md", className: "rounded-md" },
          { label: "lg", className: "rounded-lg" },
          { label: "xl", className: "rounded-xl" },
          { label: "2xl", className: "rounded-2xl" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div
              className={`size-16 border-2 border-primary bg-primary/10 ${item.className}`}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      {radius && (
        <p className="text-xs text-muted-foreground">
          Base: <code className="text-foreground">{radius.defaultValue}</code>
        </p>
      )}
    </div>
  );
}

export function ComponentTokensPreview() {
  const slots = [...new Set(TOKEN_MANIFEST.map((t) => t.slot))].sort();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          Component tokens (cn-*)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          style-ssota.css — 컴포넌트를 선택해 개별 토큰을 편집하세요.
        </p>
      </div>
      <div className="space-y-3">
        {slots.map((slot) => {
          const tokens = TOKEN_MANIFEST.filter((t) => t.slot === slot);
          return (
            <div
              key={slot}
              className="rounded-lg border border-border bg-card p-3"
            >
              <p className="text-xs font-medium text-foreground">{slot}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tokens.map((token) => (
                  <code
                    key={token.className}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground"
                  >
                    .{token.className}
                  </code>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TypeScalePreview() {
  const scale = [
    { label: "text-xs", className: "text-xs", sample: "Action log row" },
    { label: "text-sm", className: "text-sm", sample: "Console section title" },
    { label: "text-base", className: "text-base", sample: "Body default" },
    { label: "text-lg", className: "text-lg", sample: "Emphasized body" },
    { label: "text-xl", className: "text-xl", sample: "Page subtitle" },
    { label: "text-2xl", className: "text-2xl", sample: "Section heading" },
    { label: "text-3xl", className: "text-3xl", sample: "Hero heading" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Type scale</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Tailwind font-size utilities on style-ssota base.
        </p>
      </div>
      <div className="space-y-4">
        {scale.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-b border-border pb-3"
          >
            <span className={`${row.className} text-foreground`}>
              {row.sample}
            </span>
            <code className="shrink-0 font-mono text-[0.625rem] text-muted-foreground">
              {row.label}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FontWeightsPreview() {
  const weights = [
    { label: "font-normal", className: "font-normal", weight: "400" },
    { label: "font-medium", className: "font-medium", weight: "500" },
    { label: "font-semibold", className: "font-semibold", weight: "600" },
    { label: "font-bold", className: "font-bold", weight: "700" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Font weights</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Geist sans — console UI weight range.
        </p>
      </div>
      <div className="space-y-3">
        {weights.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className={`text-lg ${row.className} text-foreground`}>
              Human Gate approval queue
            </span>
            <code className="font-mono text-[0.625rem] text-muted-foreground">
              {row.label} ({row.weight})
            </code>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border p-4">
        <p className="cn-font-heading text-sm font-medium text-foreground">
          cn-font-heading — card titles & section labels
        </p>
      </div>
    </div>
  );
}

export function createBuiltInCatalogItems() {
  return {
    tokens: [
      {
        id: "colors",
        groupId: "tokens" as const,
        label: "Colors",
        render: () => <ColorsPreview />,
      },
      {
        id: "radius",
        groupId: "tokens" as const,
        label: "Radius",
        render: () => <RadiusPreview />,
      },
      {
        id: "component-tokens",
        groupId: "tokens" as const,
        label: "Component tokens",
        render: () => <ComponentTokensPreview />,
      },
    ],
    typography: [
      {
        id: "type-scale",
        groupId: "typography" as const,
        label: "Type scale",
        render: () => <TypeScalePreview />,
      },
      {
        id: "font-weights",
        groupId: "typography" as const,
        label: "Font weights",
        render: () => <FontWeightsPreview />,
      },
    ],
  };
}
