import { DashboardConfigSection } from "./DashboardConfigSection";
import { ChartTableColorFields } from "./chartTableColorFields";

/** @deprecated 表格配色已并入「图表配色」；保留兼容测试锚点 */
export function ChartTableColorPanel() {
  return (
    <DashboardConfigSection title="表格配色" defaultOpen compact data-testid="table-style-color">
      <ChartTableColorFields />
    </DashboardConfigSection>
  );
}
