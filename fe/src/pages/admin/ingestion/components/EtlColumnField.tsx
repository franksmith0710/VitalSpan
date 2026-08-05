import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EtlColumnField({
  label,
  value,
  onChange,
  columnNames,
  placeholder,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  columnNames: string[];
  placeholder?: string;
  invalid?: boolean;
}) {
  const trimmed = value.trim();
  const inList = trimmed && columnNames.includes(trimmed);
  const [manual, setManual] = useState(columnNames.length === 0 || (Boolean(trimmed) && !inList));

  useEffect(() => {
    if (columnNames.length === 0) {
      setManual(true);
      return;
    }
    if (!trimmed) {
      setManual(false);
      return;
    }
    setManual(!columnNames.includes(trimmed));
  }, [columnNames, trimmed]);

  const options =
    trimmed && !columnNames.includes(trimmed) ? [trimmed, ...columnNames] : columnNames;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {columnNames.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-theme-xs text-gray-500 hover:text-brand-600"
            onClick={() => setManual((prev) => !prev)}
          >
            {manual ? "切换为下拉" : "切换为手填"}
          </Button>
        ) : null}
      </div>
      {manual || columnNames.length === 0 ? (
        <Input
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger aria-label={label} aria-invalid={invalid || undefined}>
            <SelectValue placeholder={placeholder ?? "选择列"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
