import { describe, expect, it } from "vitest";
import { CARTESIAN_CATEGORY_KEY_SEP } from "@/components/charts/engine/buildDatasetEncoding";
import { renderD3BarChart } from "@/components/charts/engine/d3/cartesian/renderBar";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

const theme = getAntvThemeTokens("dark");
const SEP = CARTESIAN_CATEGORY_KEY_SEP;

function compositeKey(date: string, province: string, product: string, category: string): string {
  return [date, province, product, category].join(SEP);
}

describe("renderD3BarChart multi-dimension axis", () => {
  it("renders tiered x-axis rows for four category dimensions", () => {
    setChartAnimationSuppressed(true);
    const host = document.createElement("div");
    host.style.width = "640px";
    host.style.height = "280px";
    document.body.appendChild(host);

    const provinces = ["上海市", "广东省", "四川省"];
    const products = ["27寸显示器", "无线鼠标", "机械键盘"];
    const categories = ["显示设备", "外设配件"];
    const dates = ["2025-06-08", "2025-07-01"];

    const keys: string[] = [];
    for (let i = 0; i < 18; i += 1) {
      keys.push(
        compositeKey(
          dates[i % dates.length],
          provinces[i % provinces.length],
          products[i % products.length],
          categories[i % categories.length],
        ),
      );
    }

    const data = keys.map((cat, i) => ({ __category__: cat, __value__: 1000 + i }));

    renderD3BarChart(host, {
      width: 640,
      height: 280,
      data,
      xField: "__category__",
      yField: "__value__",
      colors: ["#465fff"],
      theme,
      showLabel: false,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 11,
      categoryLevelCount: 4,
    });

    const tiered = host.querySelector(".vs-axis-x-tiered");
    expect(tiered).toBeTruthy();
    const labels = [...host.querySelectorAll(".vs-axis-x-tiered text")].map((node) => node.textContent);
    expect(labels.some((label) => label?.includes("2025"))).toBe(true);
    expect(labels.length).toBeGreaterThan(4);

    host.remove();
    setChartAnimationSuppressed(false);
  });
});
