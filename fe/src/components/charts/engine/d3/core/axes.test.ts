import { describe, expect, it } from "vitest";
import { pickCategoryTicks } from "@/components/charts/engine/d3/core/axes";
import { nearestCategory } from "@/components/charts/engine/d3/core/interaction";
import * as d3 from "d3";

describe("d3 core", () => {
  it("pickCategoryTicks thins dense categories", () => {
    const cats = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const picked = pickCategoryTicks(cats, 200);
    expect(picked.length).toBeLessThan(cats.length);
    expect(picked[0]).toBe("c0");
    expect(picked[picked.length - 1]).toBe("c19");
  });

  it("nearestCategory finds closest x", () => {
    const cats = ["a", "b", "c"];
    const x = d3.scalePoint<string>().domain(cats).range([0, 100]).padding(0.5);
    expect(nearestCategory(50, cats, x)).toBe("b");
  });
});
