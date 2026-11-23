import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { describeCode, describeError, type ErrorTranslator, type UiError } from "@/lib/error-message";
import type { ErrorParams } from "@/lib/api-error";

/**
 * `describeError(error, title?)` for API failures and `describeCode(code, params)` for a failed
 * job's failure reason, both in the current locale.
 */
export function useDescribeError() {
  const t = useTranslations("Errors") as unknown as ErrorTranslator;

  const describe = useCallback((error: unknown, title?: string): UiError => describeError(t, error, title), [t]);
  const describeFailureReason = useCallback(
    (code: string | null | undefined, params?: ErrorParams | null): string =>
      describeCode(t, code ?? "TRANSLATION_FAILED", params),
    [t],
  );

  return { describeError: describe, describeFailureReason };
}
