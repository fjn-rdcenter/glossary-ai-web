/**
 * Follow one translation job until it ends.
 *
 * While the push stream is up the job reports itself: progress events move the percentage, a status event
 * makes it fetch the job. A job that stays quiet for `QUIET_JOB_REFETCH_MS` is fetched anyway, in case an event
 * was lost (a worker that publishes nothing, a failed publish); every event starts that wait over. While the
 * stream is down it polls, as before. Either way the server has the last word: it fetches the job when it
 * starts, on every status event and whenever the stream comes (back) up.
 */

import { isEventStreamConnected, subscribeToEvents, watchEventStreamConnection } from "./event-stream";
import { isFinishedStatus, isProgressEvent, QUIET_JOB_REFETCH_MS, withLiveProgress } from "@/lib/job-events";

const FALLBACK_POLL_MS = 1_500;

interface WatchedJob {
  id: string;
  status: string;
  progress: number;
}

interface WatchOptions<T> {
  fetchJob: () => Promise<T>;
  onUpdate: (job: T) => void;
  /** Checked on every event and poll; once true the watch ends with `null`. */
  isStopped: () => boolean;
}

/**
 * Resolves with the job once it has ended, or `null` if `isStopped` said to stop. Rejects when fetching the job
 * fails.
 */
export function watchJob<T extends WatchedJob>(initial: T, options: WatchOptions<T>): Promise<T | null> {
  if (isFinishedStatus(initial.status)) return Promise.resolve(initial);

  return new Promise((resolve, reject) => {
    let job = initial;
    let finished = false;
    let fetching = false;
    let fetchAgain = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopListening = () => {};
    let stopWatchingConnection = () => {};

    const stopTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const finish = (result: T | null, error?: unknown) => {
      if (finished) return;
      finished = true;
      stopTimer();
      stopListening();
      stopWatchingConnection();
      if (error === undefined) resolve(result);
      else reject(error);
    };

    const apply = (next: T) => {
      if (finished) return;
      if (options.isStopped()) return finish(null);
      job = next;
      options.onUpdate(job);
      if (isFinishedStatus(job.status)) finish(job);
    };

    const refresh = async () => {
      if (fetching) {
        fetchAgain = true;
        return;
      }
      fetching = true;
      try {
        do {
          fetchAgain = false;
          const fresh = await options.fetchJob();
          if (finished) return;
          apply(withLiveProgress(fresh, job.progress));
        } while (fetchAgain && !finished);
      } catch (error) {
        finish(null, error);
      } finally {
        fetching = false;
      }
    };

    /** (Re)start the one timer: a poll while the stream is down, the quiet-job check while it is up. */
    const arm = () => {
      stopTimer();
      if (finished) return;
      timer = setTimeout(
        async () => {
          timer = null;
          await refresh();
          arm();
        },
        isEventStreamConnected() ? QUIET_JOB_REFETCH_MS : FALLBACK_POLL_MS,
      );
    };

    stopListening = subscribeToEvents({
      onReady: () => void refresh(),
      onJob: (event) => {
        if (event.id !== job.id || finished) return;
        if (options.isStopped()) return finish(null);
        arm();
        if (!isProgressEvent(event)) return void refresh();
        const next = withLiveProgress(job, event.progress);
        if (next !== job) apply(next);
      },
    });
    stopWatchingConnection = watchEventStreamConnection(arm);

    void refresh();
    arm();
  });
}
