import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DESIGN_THEME_TOKEN_MANIFEST } from "../catalog/design-theme-schemas.js";

/**
 * SWDL `design/theme` 페이지 anti-drift 가드.
 *
 * 페이지 spec의 TokenList manifest들은 캐노니컬 DESIGN_THEME_TOKEN_MANIFEST의
 * 스냅샷(복제)이다 — 캐노니컬에 토큰을 추가/변경하고 페이지를 갱신하지 않으면
 * 편집 UI가 스키마에서 드리프트한다(과거: 5개 토큰만 노출 + 저장 시 나머지 토큰
 * 유실). 이 테스트는 두 SSOT가 항상 일치함을 강제한다.
 */

type TokenManifestEntry = {
  name: string;
  label?: string;
  kind?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

type PageElement = {
  type?: string;
  props?: Record<string, unknown> & { manifest?: TokenManifestEntry[] };
};

type PageEntry = {
  key: string;
  spec?: { elements?: Record<string, PageElement> };
  bindings?: Record<string, unknown>;
  actions?: Record<string, unknown>;
};

const pagesTree = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../seed-packs/software-development-workflow/pages-tree.json",
    ),
    "utf8",
  ),
) as PageEntry[];

describe("SWDL design/theme page — canonical token manifest parity", () => {
  const page = pagesTree.find((p) => p.key === "design/theme");

  it("exists with theme binding and saveTokens action", () => {
    expect(page).toBeDefined();
    expect(page!.bindings).toMatchObject({
      theme: { kind: "evergreen", catalogKey: "design_theme" },
    });
    expect(page!.actions).toHaveProperty("saveTokens");
  });

  const tokenLists = Object.values(page?.spec?.elements ?? {}).filter(
    (el) => el.type === "TokenList",
  );

  it("wires every TokenList to the theme binding and saveTokens action", () => {
    expect(tokenLists.length).toBeGreaterThan(0);
    for (const el of tokenLists) {
      expect(el.props).toMatchObject({
        binding: "theme",
        field: "tokens",
        action: "saveTokens",
      });
    }
  });

  it("covers the canonical manifest exactly (no missing, no extra, no dupes)", () => {
    const pageEntries = tokenLists.flatMap((el) => el.props?.manifest ?? []);
    const pageNames = pageEntries.map((e) => e.name);
    // TokenList 간 중복 없음 (중복이면 마지막 편집이 서로를 덮어쓴다)
    expect(new Set(pageNames).size).toBe(pageNames.length);
    // 합집합 = 캐노니컬 전체
    expect([...pageNames].sort()).toEqual(
      DESIGN_THEME_TOKEN_MANIFEST.map((t) => t.name).sort(),
    );
  });

  it("copies kind/options/min/max/step/unit faithfully per token", () => {
    const canonical = new Map(
      DESIGN_THEME_TOKEN_MANIFEST.map((t) => [t.name, t]),
    );
    for (const el of tokenLists) {
      for (const entry of el.props?.manifest ?? []) {
        const source = canonical.get(entry.name);
        expect(source, entry.name).toBeDefined();
        expect(
          {
            label: entry.label,
            kind: entry.kind,
            options: entry.options,
            min: entry.min,
            max: entry.max,
            step: entry.step,
            unit: entry.unit,
          },
          entry.name,
        ).toEqual({
          label: source!.label,
          kind: source!.kind,
          options: undefined,
          min: source!.min,
          max: source!.max,
          step: source!.step,
          unit: source!.unit,
        });
      }
    }
  });

  it("keeps a step granularity that can represent the seeded radius value", () => {
    const radius = DESIGN_THEME_TOKEN_MANIFEST.find(
      (t) => t.name === "--radius",
    );
    expect(radius).toBeDefined();
    const value = Number.parseFloat(radius!.defaultValue);
    const step = radius!.step ?? 1;
    // 0.625rem이 슬라이더 스텝 위에 정확히 놓여야 드래그 시 값이 튀지 않는다.
    expect((value - (radius!.min ?? 0)) % step).toBeCloseTo(0, 10);
    expect(radius!.unit).toBe("rem");
  });
});
