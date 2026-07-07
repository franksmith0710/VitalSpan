import { useState } from "react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DimensionsPanel,
  GlossaryPanel,
  ThemesPanel,
} from "./metadata-panels";

export function MetadataHubPage() {
  const [tab, setTab] = useState("glossary");
  const [prefix, setPrefix] = useState("");

  return (
    <AdminPageShell
      title="语义层元数据"
      description="术语字典、业务主题树与维度字典（META-001~003）。"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="glossary">术语字典</TabsTrigger>
          <TabsTrigger value="themes">业务主题</TabsTrigger>
          <TabsTrigger value="dimensions">维度字典</TabsTrigger>
        </TabsList>

        <TabsContent value="glossary" className="mt-6 space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="glossary-prefix">编码前缀</Label>
            <Input
              id="glossary-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </div>
          <GlossaryPanel prefix={prefix} />
        </TabsContent>

        <TabsContent value="themes" className="mt-6 space-y-4">
          <ThemesPanel />
        </TabsContent>

        <TabsContent value="dimensions" className="mt-6 space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="dim-prefix">编码前缀</Label>
            <Input id="dim-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <DimensionsPanel prefix={prefix} />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
