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
  roles: {
    all: ["roles"] as const,
    list: (params?: { codePrefix?: string; limit?: number; offset?: number }) =>
      ["roles", "list", params] as const,
  },
  dashboards: {
    all: ["dashboards"] as const,
    list: () => ["dashboards", "list"] as const,
    globalFilters: (id: string) => ["dashboards", id, "globalFilters"] as const,
  },
  metadata: {
    entityTypes: ["metadata", "entityTypes"] as const,
    physicalTables: (entityTypeCode?: string) =>
      ["metadata", "physicalTables", entityTypeCode ?? "all"] as const,
    entityOverview: (dashboardId: string) =>
      ["metadata", "entityOverview", dashboardId] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: { q?: string; limit?: number; offset?: number }) =>
      ["users", "list", params] as const,
    roles: (userId: string) => ["users", userId, "roles"] as const,
  },
};
