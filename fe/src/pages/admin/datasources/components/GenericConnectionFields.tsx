import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONNECTOR_FIELD_HINTS,
  connectorHintId,
  hidePortField,
  hostFieldLabel,
  type FormState,
} from "./datasource-form-constants";

type Props = {
  form: FormState;
  mode: "create" | "edit";
  onFieldChange: (key: keyof FormState, value: string) => void;
};

export function GenericConnectionFields({ form, mode, onFieldChange }: Props) {
  const hintId = connectorHintId(form.type);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="host">{hostFieldLabel(form.type)}</Label>
          <Input
            id="host"
            value={form.host}
            onChange={(e) => onFieldChange("host", e.target.value)}
            required
            className="h-11"
          />
        </div>
        {hidePortField(form.type) ? null : (
          <div className="grid gap-2">
            <Label htmlFor="port">端口</Label>
            <Input
              id="port"
              type="number"
              value={form.port}
              onChange={(e) => onFieldChange("port", e.target.value)}
              required
              className="h-11"
            />
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="database">{CONNECTOR_FIELD_HINTS[form.type]?.databaseLabel ?? "数据库"}</Label>
        <Input
          id="database"
          value={form.database}
          onChange={(e) => onFieldChange("database", e.target.value)}
          required
          className="h-11"
          aria-describedby={hintId}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="username">{CONNECTOR_FIELD_HINTS[form.type]?.usernameLabel ?? "用户名"}</Label>
        <Input
          id="username"
          value={form.username}
          onChange={(e) => onFieldChange("username", e.target.value)}
          required
          className="h-11"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{mode === "edit" ? "密码（留空不修改）" : "密码"}</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => onFieldChange("password", e.target.value)}
          required={mode === "create"}
          className="h-11"
          autoComplete={mode === "create" ? "new-password" : "current-password"}
        />
      </div>
    </>
  );
}
