export const JOB_LEASE_MS = 30_000;
export const RESULT_TTL_MS = 5 * 60_000;

export type JobState = "queued" | "leased" | "succeeded" | "failed" | "expired" | "indeterminate";

export function canClaim(status: JobState, leaseUntil: number | undefined, now: number) {
  return status === "queued" || (status === "leased" && (leaseUntil ?? 0) <= now);
}

export function classifyWriteTimeout(operation: string): JobState {
  return operation === "orders.create" ? "indeterminate" : "queued";
}

export function nextPollDelay(previousMs: number, hadJob: boolean) {
  return hadJob ? 2_000 : Math.min(15_000, Math.max(2_000, previousMs * 2));
}
