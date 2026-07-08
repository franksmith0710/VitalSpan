import { ConnectorCategoryCard } from "@/components/datasources/ConnectorCategoryCard";
import {
  connectorTypeIcon,
  DISPLAY_GROUP_META,
  type ConnectorTypeItem,
  type DisplayGroup,
} from "@/lib/connector-taxonomy";
import { CONNECTOR_FIELD_HINTS } from "./datasource-form-constants";

type WizardStep = "category" | "type" | "form";

type Props = {
  wizardStep: WizardStep;
  selectedGroup: DisplayGroup | null;
  visibleGroups: DisplayGroup[];
  groupedTypes: Map<DisplayGroup, ConnectorTypeItem[]>;
  onSelectGroup: (group: DisplayGroup) => void;
  onBackToCategory: () => void;
  onSelectType: (type: string, port: string) => void;
};

export function DatasourceFormWizard({
  wizardStep,
  selectedGroup,
  visibleGroups,
  groupedTypes,
  onSelectGroup,
  onBackToCategory,
  onSelectType,
}: Props) {
  if (wizardStep === "category") {
    return (
      <div className="mx-auto grid max-w-3xl w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleGroups.map((group) => {
          const items = groupedTypes.get(group) ?? [];
          const meta = DISPLAY_GROUP_META[group];
          const Icon = connectorTypeIcon(items[0]?.type ?? group, group);
          return (
            <ConnectorCategoryCard
              key={group}
              label={items[0]?.categoryLabel ?? meta.label}
              description={meta.description}
              count={items.length}
              icon={Icon}
              onSelect={() => onSelectGroup(group)}
            />
          );
        })}
      </div>
    );
  }

  if (wizardStep === "type" && selectedGroup) {
    return (
      <div className="mx-auto max-w-3xl w-full space-y-4">
        <button type="button" className="text-theme-sm text-brand-600" onClick={onBackToCategory}>
          ← 返回选择大类
        </button>
        <div className="grid gap-3 sm:grid-cols-2">
          {(groupedTypes.get(selectedGroup) ?? []).map((t) => {
            const Icon = connectorTypeIcon(t.type, t.displayGroup);
            return (
              <ConnectorCategoryCard
                key={t.type}
                label={t.displayName}
                description={t.type}
                count={0}
                icon={Icon}
                onSelect={() => {
                  const hints = CONNECTOR_FIELD_HINTS[t.type];
                  onSelectType(t.type, hints?.port ?? "3306");
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
