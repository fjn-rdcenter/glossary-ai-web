import type { StatusEnum } from "./types";

/** What the push stream says about a translation job: its live progress, or that its status changed. */
export type JobEvent = { id: string; progress: number } | { id: string; status: StatusEnum };

export type JobProgressEvent = Extract<JobEvent, { progress: number }>;

/** A running job that sends no event for this long is fetched anyway, in case an event was lost. */
export const QUIET_JOB_REFETCH_MS = 30_000;

const STATUSES: ReadonlySet<string> = new Set(["pending", "translating", "completed", "failed", "cancelled"]);

/** The event in an SSE `data:` line, or `null` when it is not one this build understands. */
export function parseJobEvent(data: string): JobEvent | null {
  try {
    const value = JSON.parse(data) as Record<string, unknown> | null;
    if (typeof value?.id !== "string") return null;
    if (typeof value.progress === "number" && Number.isFinite(value.progress)) {
      return { id: value.id, progress: value.progress };
    }
    if (typeof value.status === "string" && STATUSES.has(value.status)) {
      return { id: value.id, status: value.status as StatusEnum };
    }
  } catch {
    // not JSON: ignore
  }
  return null;
}

export function isProgressEvent(event: JobEvent): event is JobProgressEvent {
  return "progress" in event;
}

export function isRunningStatus(status: string): boolean {
  return status === "pending" || status === "translating";
}

export function isFinishedStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

/**
 * The job with a newer live percentage. Progress only goes up, and a job that has ended keeps what the server
 * saved for it. Returns the same object when nothing changes.
 */
export function withLiveProgress<T extends { status: string; progress?: number }>(job: T, progress: number): T {
  if (!isRunningStatus(job.status) || progress <= (job.progress ?? 0)) return job;
  return { ...job, progress };
}
