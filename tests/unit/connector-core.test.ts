/** @jest-environment node */

import { assertResultSize, parseOperation, sourceKey } from "../../packages/contracts/src/connector/catalog";
import { decryptJson, encryptJson, sha256 } from "../../packages/contracts/src/connector/crypto";
import { canClaim, classifyWriteTimeout, nextPollDelay } from "../../packages/contracts/src/connector/lease";

describe("connector boundary", () => {
  it("allows only fixed, bounded operations", () => {
    expect(parseOperation("customers.page", { limit: 200 }).operation).toBe("customers.page");
    expect(() => parseOperation("sql.execute", { sql: "select 1" })).toThrow("CONNECTOR_OPERATION_NOT_ALLOWED");
    expect(() => parseOperation("customers.page", { limit: 201 })).toThrow();
    expect(() => assertResultSize("x".repeat(1024 * 1024))).toThrow("CONNECTOR_RESULT_TOO_LARGE");
  });

  it("keeps source identities unambiguous", () => {
    expect(sourceKey("jtl", 42)).toBe("jtl:42");
    expect(sourceKey("crm", "abc")).toBe("crm:abc");
    expect(() => sourceKey("crm", "bad:id")).toThrow("INVALID_SOURCE_ID");
  });

  it("leases predictably and never blindly retries writes", () => {
    expect(canClaim("queued", undefined, 100)).toBe(true);
    expect(canClaim("leased", 101, 100)).toBe(false);
    expect(canClaim("leased", 99, 100)).toBe(true);
    expect(canClaim("succeeded", undefined, 100)).toBe(false);
    expect(classifyWriteTimeout("orders.create")).toBe("indeterminate");
    expect(classifyWriteTimeout("customers.get")).toBe("queued");
    expect(nextPollDelay(500, false)).toBe(2_000);
    expect(nextPollDelay(8_000, false)).toBe(15_000);
    expect(nextPollDelay(15_000, true)).toBe(2_000);
  });

  it("encrypts payloads with authenticated encryption", async () => {
    const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
    const encrypted = await encryptJson({ customerId: 42 }, key);
    expect(encrypted).not.toContain("customerId");
    expect(await decryptJson(encrypted, key)).toEqual({ customerId: 42 });
    expect(await sha256("token")).toBe(await sha256("token"));
    await expect(decryptJson("invalid", key)).rejects.toThrow("INVALID_ENCRYPTED_ENVELOPE");
    await expect(encryptJson({}, btoa("short"))).rejects.toThrow("32 bytes");
  });
});
