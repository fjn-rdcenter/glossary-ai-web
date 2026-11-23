"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { UiError } from "@/lib/error-message";

const SHORT_REFERENCE_LENGTH = 8;

/** Internal deployments may run over plain HTTP, where `navigator.clipboard` is unavailable. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/** "Reference: 7f3c1a2b" with a button that copies the full request ID for a bug report. */
export function ErrorReference({ requestId }: { requestId: string }) {
  const t = useTranslations("Errors");
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  const handleCopy = async () => {
    if (!(await copyText(requestId))) return;
    setCopied(true);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-normal opacity-80">
      <span>{t("reference", { id: requestId.slice(0, SHORT_REFERENCE_LENGTH) })}</span>
      <button
        aria-label={copied ? t("referenceCopied") : t("copyReference")}
        className="inline-flex size-5 items-center justify-center rounded hover:bg-black/5"
        onClick={handleCopy}
        title={copied ? t("referenceCopied") : t("copyReference")}
        type="button"
      >
        {copied ? <Check aria-hidden="true" className="size-3" /> : <Copy aria-hidden="true" className="size-3" />}
      </button>
    </span>
  );
}

/** The content of an error message: action context, reason, and the reference when there is one. */
export function ErrorDetails({ error }: { error: UiError }) {
  return (
    <>
      <span className="block">{error.title}</span>
      {error.reason ? <span className="block font-normal">{error.reason}</span> : null}
      {error.requestId ? <ErrorReference requestId={error.requestId} /> : null}
    </>
  );
}
