import { describe, expect, it } from "vitest";
import {
  inferStyleSchemaFromDefault,
  mergeCustomVizStyleValue,
  resolveCustomVizStyleSchema,
} from "./customVizStyleSchema";

describe("customVizStyleSchema", () => {
  it("infers style schema from defaultStyle when styleSchema is missing", () => {
    const schema = inferStyleSchemaFromDefault({ accentColor: "#2563eb", barHeight: 20 });
    expect(schema?.properties).toMatchObject({
      accentColor: { type: "string", format: "color", title: "强调色" },
      barHeight: { type: "number", title: "条高度" },
    });
  });

  it("prefers explicit styleSchema over inferred default", () => {
    const explicit = { type: "object", properties: { foo: { type: "string" } } };
    expect(resolveCustomVizStyleSchema(explicit, { barHeight: 20 })).toBe(explicit);
  });

  it("merges layout style over manifest defaultStyle", () => {
    expect(
      mergeCustomVizStyleValue({ accentColor: "#111111" }, { accentColor: "#2563eb", barHeight: 20 }),
    ).toEqual({ accentColor: "#111111", barHeight: 20 });
  });
});
