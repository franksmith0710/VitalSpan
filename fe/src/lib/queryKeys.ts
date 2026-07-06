export const queryKeys = {
  me: ["me"] as const,
  datasources: {
    all: ["datasources"] as const,
    list: (params?: { q?: string; type?: string }) => ["datasources", "list", params] as const,
    detail: (id: string) => ["datasources", "detail", id] as const,
    schemas: (id: string) => ["datasources", id, "schemas"] as const,
    tables: (id: string, schema: string) => ["datasources", id, "tables", schema] as const,
    columns: (id: string, schema: string, table: string) =>
      ["datasources", id, "columns", schema, table] as const,
  },
  connectorTypes: ["connectorTypes"] as const,
};
