export type DatasetTable = { name: string; alias?: string | null };
export type DatasetComputedField = { name: string; expression: string };

export type DatasetItem = {
  datasetId: string;
  displayName: string;
  tables: DatasetTable[];
  computedFields: DatasetComputedField[];
  allowedRoles: string[];
  boundConfigId?: string | null;
};

export type DatasetEditorValues = {
  datasetId: string;
  displayName: string;
  tables: DatasetTable[];
  computedFields: DatasetComputedField[];
  allowedRoles: string[];
};
