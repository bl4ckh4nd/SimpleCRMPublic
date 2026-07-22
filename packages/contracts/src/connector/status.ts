import { hasWorkspaceRole, type WorkspaceRole } from "../auth/workspace-role.js";

type StoredConnector = {
  mode: "direct" | "agent";
  enabled: boolean;
  lastSeenAt?: number;
  updatedAt: number;
};

export const publicConnectorStatus = (config: StoredConnector, role: WorkspaceRole) => ({
  mode: config.mode,
  enabled: config.enabled,
  ...(config.lastSeenAt === undefined ? {} : { lastSeenAt: config.lastSeenAt }),
  updatedAt: config.updatedAt,
  canManage: hasWorkspaceRole(role, "admin"),
});
