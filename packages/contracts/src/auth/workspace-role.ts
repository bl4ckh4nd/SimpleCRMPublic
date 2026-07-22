export type WorkspaceRole = "owner" | "admin" | "member";
const rank: Record<WorkspaceRole, number> = { member: 0, admin: 1, owner: 2 };

export const hasWorkspaceRole = (actual: WorkspaceRole, minimum: WorkspaceRole) => rank[actual] >= rank[minimum];
