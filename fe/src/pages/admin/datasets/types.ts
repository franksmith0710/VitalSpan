export type DatasetOrigin = "manual" | "sync_job";

export type DatasetTable = { name: string; alias?: string | null };
export type DatasetComputedField = { name: string; expression: string };

export type DatasetItem = {
  datasetId: string;
  displayName: string;
  tables: DatasetTable[];
  computedFields: DatasetComputedField[];
  allowedRoles: string[];
  tableSourceDataSourceId?: string | null;
  boundConfigId?: string | null;
  origin?: DatasetOrigin;
  syncJobId?: string | null;
};

export type DatasetEditorValues = {
  datasetId: string;
  displayName: string;
  tables: DatasetTable[];
  computedFields: DatasetComputedField[];
  allowedRoles: string[];
  tableSourceDataSourceId?: string;
};
