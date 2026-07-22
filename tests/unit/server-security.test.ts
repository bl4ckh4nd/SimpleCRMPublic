/** @jest-environment node */

import { hasWorkspaceRole } from "../../packages/contracts/src/auth/workspace-role";
import { publicConnectorStatus } from "../../packages/contracts/src/connector/status";
import { validateDirectConnection } from "../../packages/contracts/src/connector/direct-connection";

describe("server security policy", () => {
  it("keeps connector management owner/admin-only", () => {
    expect(hasWorkspaceRole("owner", "admin")).toBe(true);
    expect(hasWorkspaceRole("admin", "admin")).toBe(true);
    expect(hasWorkspaceRole("member", "admin")).toBe(false);
  });

  it("never exposes connector secrets through status", () => {
    const status = publicConnectorStatus({ mode: "direct", enabled: true, lastSeenAt: 42, updatedAt: 41, secretCiphertext: "cipher", agentTokenHash: "hash" }, "member");
    expect(status).toEqual({ mode: "direct", enabled: true, lastSeenAt: 42, updatedAt: 41, canManage: false });
    expect(JSON.stringify(status)).not.toMatch(/cipher|hash/);
  });

  it("rejects unsafe direct SQL configuration", () => {
    const base = { server: "sql.internal", database: "eazybusiness", user: "crm", password: "long-enough-secret", port: 1433, encrypt: true, trustServerCertificate: false };
    expect(validateDirectConnection(base)).toEqual(base);
    expect(() => validateDirectConnection({ ...base, encrypt: false })).toThrow("TLS_REQUIRED");
    expect(() => validateDirectConnection({ ...base, port: 0 })).toThrow();
  });
});
