export const NODE_LABELS: Record<string, string> = {
  draft: "草稿",
  pending_approval: "待审批",
  designing: "设计中",
  pending_publish: "待发布",
  published: "已发布",
};

export const ROLE_LABELS: Record<string, string> = {
  requester: "申请人",
  approver: "审批人",
  designer: "设计人",
  publisher: "发布人",
};

export function nodeLabel(id: string) {
  return NODE_LABELS[id] ?? id;
}

export function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export type WorkflowTemplate = {
  id: string;
  name: string;
  nodes: Array<{ id: string; role: string }>;
};

export type WorkflowNodeRole = {
  nodeId: string;
  role: string;
  description: string;
};
