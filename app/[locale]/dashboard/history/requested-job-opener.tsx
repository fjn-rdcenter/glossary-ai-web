"use client";

import {useSearchParams} from "next/navigation";
import {TranslationService} from "@/api";
import {useKeyedMountEffect} from "@/hooks/use-keyed-mount-effect";
import type {TranslationHistoryResponse} from "@/lib/types";

/**
 * Opens the details of the job named by `?job=<id>`, the link a translation notification carries. It reads the
 * job by id rather than looking it up in the list, which is paged and filtered and may not hold it. A job that
 * is gone, or is not the user's, just leaves the list on screen. The parameter is removed once it has been used,
 * so a reload does not open the dialog again.
 */
export function RequestedJobOpener({onJob}: {onJob: (job: TranslationHistoryResponse) => void}) {
  const jobId = useSearchParams().get("job");

  useKeyedMountEffect(jobId, () => {
    let cancelled = false;

    TranslationService.getTranslationStatus(jobId as string)
      .then((job) => {
        if (!cancelled) onJob(job);
      })
      .catch((error) => console.error("Failed to open the translation from a notification", error))
      .finally(() => {
        if (cancelled) return;
        const url = new URL(window.location.href);
        url.searchParams.delete("job");
        window.history.replaceState(null, "", url);
      });

    return () => {
      cancelled = true;
    };
  });

  return null;
}
