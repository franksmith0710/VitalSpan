import * as echarts from "echarts/core";

function sanitizeFilename(name: string): string {
  const trimmed = name.trim() || "chart";
  return trimmed.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/-+/g, "-");
}

/** 从 ECharts 容器导出 PNG（放大预览区等） */
export function exportChartPngFromContainer(
  container: HTMLElement,
  title: string,
): void {
  const canvas = container.querySelector("canvas");
  if (!canvas) {
    throw new Error("当前预览区无可导出的图表画布");
  }
  const instance = echarts.getInstanceByDom(canvas);
  if (!instance) {
    throw new Error("图表尚未渲染完成，请稍后再试");
  }
  const dataUrl = instance.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = `${sanitizeFilename(title)}.png`;
  anchor.click();
}
