import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LayoutWidget, TabsWidgetConfig } from "./layoutUtils";

type TabsWidgetInspectorProps = {
  widget: LayoutWidget & { tabsConfig: TabsWidgetConfig };
  onChange: (tabsConfig: TabsWidgetConfig) => void;
  embedded?: boolean;
};

export function TabsWidgetInspector({ widget, onChange, embedded = false }: TabsWidgetInspectorProps) {
  const cfg = widget.tabsConfig;

  const updatePaneTitle = (paneId: string, title: string) => {
    onChange({
      ...cfg,
      panes: cfg.panes.map((p) => (p.id === paneId ? { ...p, title } : p)),
    });
  };

  const addPane = () => {
    const id = crypto.randomUUID();
    onChange({
      ...cfg,
      panes: [...cfg.panes, { id, title: `Tab ${cfg.panes.length + 1}`, childWidgetIds: [] }],
    });
  };

  const body = (
    <div className="space-y-4 p-4">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        选中 Tab 组件后，从工具栏插入的图表会加入当前激活页签。
      </p>
      {cfg.panes.map((pane, index) => (
        <div key={pane.id} className="space-y-1.5">
          <Label htmlFor={`tab-pane-${pane.id}`}>页签 {index + 1}</Label>
          <Input
            id={`tab-pane-${pane.id}`}
            value={pane.title}
            onChange={(e) => updatePaneTitle(pane.id, e.target.value)}
          />
          <p className="text-theme-xs text-gray-400">{pane.childWidgetIds.length} 个子组件</p>
        </div>
      ))}
      {cfg.panes.length < 8 ? (
        <Button type="button" variant="outline" size="sm" onClick={addPane}>
          添加页签
        </Button>
      ) : null}
    </div>
  );

  if (embedded) return body;
  return <div className="rounded-xl border border-gray-200 dark:border-gray-800">{body}</div>;
}
