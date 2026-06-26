import { describe, expect, it } from "vitest";
import {
  cardinalityEnds,
  coerceErd,
  erdTableSize,
  erdToFlowModel,
  ERD_HEADER_HEIGHT,
  ERD_ROW_HEIGHT,
  ERD_MIN_WIDTH,
} from "./erd-model";

describe("coerceErd", () => {
  it("returns an empty model for junk input", () => {
    expect(coerceErd(null)).toEqual({ tables: [], relations: [] });
    expect(coerceErd(42)).toEqual({ tables: [], relations: [] });
    expect(coerceErd({})).toEqual({ tables: [], relations: [] });
  });

  it("coerces tables + columns with id/name fallbacks", () => {
    const model = coerceErd({
      tables: [
        {
          name: "users",
          columns: [
            { name: "id", type: "uuid", pk: true },
            { name: "email", type: "varchar", nullable: false, unique: true },
            "junk",
          ],
        },
        { fields: [{ column: "x" }] }, // `fields` + `column` aliases, id fallback
      ],
    });
    expect(model.tables).toHaveLength(2);
    expect(model.tables[0]).toMatchObject({ id: "t0", name: "users" });
    expect(model.tables[0]!.columns).toHaveLength(2); // "junk" dropped
    expect(model.tables[0]!.columns[0]).toEqual({
      name: "id",
      type: "uuid",
      pk: true,
    });
    // nullable:false → notNull:true; unique preserved
    expect(model.tables[0]!.columns[1]).toMatchObject({
      notNull: true,
      unique: true,
    });
    expect(model.tables[1]!.id).toBe("t1");
    expect(model.tables[1]!.columns[0]!.name).toBe("x");
  });

  it("drops dangling relations and keeps valid ones", () => {
    const model = coerceErd({
      tables: [
        { id: "a", name: "A", columns: [{ name: "id", pk: true }] },
        { id: "b", name: "B", columns: [{ name: "a_id" }] },
      ],
      relations: [
        { source: "a", target: "b", sourceColumn: "id", targetColumn: "a_id" },
        { source: "a", target: "ghost" }, // dangling → dropped
        { from: "b", to: "a", cardinality: "N:1" }, // from/to aliases
      ],
    });
    expect(model.relations).toHaveLength(2);
    expect(model.relations[0]).toMatchObject({ source: "a", target: "b" });
    expect(model.relations[1]).toMatchObject({
      source: "b",
      target: "a",
      cardinality: "N:1",
    });
  });

  it("infers fk flag on a relation's source column", () => {
    const model = coerceErd({
      tables: [
        { id: "a", name: "A", columns: [{ name: "id", pk: true }] },
        { id: "b", name: "B", columns: [{ name: "a_id" }] },
      ],
      relations: [
        { source: "b", target: "a", sourceColumn: "a_id", targetColumn: "id" },
      ],
    });
    const aId = model.tables[1]!.columns.find((c) => c.name === "a_id");
    expect(aId?.fk).toBe(true);
  });
});

describe("erdTableSize", () => {
  it("scales height with column count and clamps width", () => {
    const size = erdTableSize({
      id: "t",
      name: "t",
      columns: [{ name: "a" }, { name: "b" }, { name: "c" }],
    });
    expect(size.height).toBe(ERD_HEADER_HEIGHT + 3 * ERD_ROW_HEIGHT + 8);
    expect(size.width).toBeGreaterThanOrEqual(ERD_MIN_WIDTH);
  });
});

describe("erdToFlowModel", () => {
  it("maps tables to sized flow nodes and relations to edges", () => {
    const flow = erdToFlowModel({
      tables: [
        { id: "a", name: "A", columns: [{ name: "id" }], x: 10, y: 20 },
        { id: "b", name: "B", columns: [{ name: "id" }] },
      ],
      relations: [{ id: "r", source: "a", target: "b" }],
    });
    expect(flow.nodes).toHaveLength(2);
    expect(flow.nodes[0]).toMatchObject({ id: "a", x: 10, y: 20 });
    expect(flow.nodes[0]!.width).toBeGreaterThan(0);
    expect(flow.nodes[0]!.height).toBeGreaterThan(0);
    expect(flow.nodes[1]!.x).toBeUndefined();
    expect(flow.edges).toEqual([{ id: "r", source: "a", target: "b" }]);
  });
});

describe("cardinalityEnds", () => {
  it("maps cardinality to crow's-foot ends", () => {
    expect(cardinalityEnds("1:1")).toEqual({ source: "one", target: "one" });
    expect(cardinalityEnds("1:N")).toEqual({ source: "one", target: "many" });
    expect(cardinalityEnds("N:1")).toEqual({ source: "many", target: "one" });
    expect(cardinalityEnds("N:M")).toEqual({ source: "many", target: "many" });
    expect(cardinalityEnds(undefined)).toEqual({
      source: "one",
      target: "many",
    });
  });
});
