"use client";

import { CircleCheck, CircleX, FileCheck2, FileX2, KeyRound, LoaderCircle, Share2, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ErrorDetails } from "@/components/error-details";
import { useDescribeError } from "@/hooks/use-describe-error";
import type { useNotificationCenter } from "@/hooks/use-notification-center";
import type { UiError } from "@/lib/error-message";
import { glossaryPath, formatRelativeTime, invitationTarget, translationFailure, translationPath } from "@/lib/notifications";
import { isKnownNotificationType, type NotificationType } from "@/lib/notification-types";
import type { NotificationResponse } from "@/lib/types";
import { Link } from "@/i18n/routing";

type NotificationCenter = ReturnType<typeof useNotificationCenter>;

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  GLOSSARY_SHARED: Share2,
  GLOSSARY_SHARE_ACCEPTED: CircleCheck,
  GLOSSARY_SHARE_DECLINED: CircleX,
  GLOSSARY_PERMISSION_CHANGED: KeyRound,
  TRANSLATION_COMPLETED: FileCheck2,
  TRANSLATION_FAILED: FileX2,
};

const BUTTON_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c]";

function stringParam(item: NotificationResponse, key: string): string {
  const value = item.params[key];
  return typeof value === "string" ? value : "";
}

function NotificationItem({
  center,
  item,
  onNavigate,
}: {
  center: NotificationCenter;
  item: NotificationResponse;
  onNavigate: () => void;
}) {
  const t = useTranslations("Notifications");
  const locale = useLocale();
  const { describeError, describeFailureReason } = useDescribeError();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<UiError | null>(null);

  const known = isKnownNotificationType(item.type);
  const Icon = known ? TYPE_ICONS[item.type as NotificationType] : Share2;
  const message = t(known ? item.type : "UNKNOWN", {
    actorName: stringParam(item, "actorName"),
    glossaryName: stringParam(item, "glossaryName"),
    documentName: stringParam(item, "documentName") || t("documentFallback"),
  });
  // Why a translation failed: the job's own failure code, in the user's language.
  const failureReason = (() => {
    if (item.type !== "TRANSLATION_FAILED") return null;
    const failure = translationFailure(item);
    return describeFailureReason(failure.code, failure.params);
  })();

  const level = stringParam(item, "permission");
  const showLevel = (item.type === "GLOSSARY_SHARED" || item.type === "GLOSSARY_PERMISSION_CHANGED") && t.has(`level.${level}`);
  const stateKey = item.type === "GLOSSARY_SHARED" && item.actionState && item.actionState !== "pending" ? item.actionState : null;
  const isUnread = item.readAt === null;
  const canAnswer = invitationTarget(item) !== null;
  const glossaryHref = glossaryPath(item);
  const path = glossaryHref ?? translationPath(item);

  const answer = async (accept: boolean) => {
    setBusy(accept ? "accept" : "decline");
    setError(null);
    try {
      // On success the card changes state and the buttons go away with it. On failure the list reloads
      // (so a card for an invitation answered elsewhere or withdrawn shows what is true now) and the reason shows here.
      await center.answerInvitation(item, accept);
    } catch (answerError) {
      console.error("Failed to answer a glossary invitation", answerError);
      setError(describeError(answerError, t("answerError")));
    } finally {
      setBusy(null);
    }
  };

  const body = (
    <>
      <span className="block text-[13px] leading-5 text-[#2a2633]">{message}</span>
      {failureReason ? <span className="mt-0.5 block text-[12px] text-[#625d6b]">{failureReason}</span> : null}
      {showLevel ? (
        <span className="mt-0.5 block text-[12px] text-[#625d6b]">{t("accessLevel", { level: t(`level.${level}`) })}</span>
      ) : null}
      {stateKey ? <span className="mt-0.5 block text-[12px] font-medium text-[#625d6b]">{t(`state.${stateKey}`)}</span> : null}
      <span className="mt-1 block text-[11px] text-[#827c89]">{formatRelativeTime(item.createdAt, locale)}</span>
    </>
  );

  const bodyClass = `min-w-0 flex-1 rounded-[6px] text-left ${BUTTON_FOCUS}`;

  return (
    <li className={`flex gap-3 border-b border-[#ece8f0] px-5 py-3.5 last:border-b-0 ${isUnread ? "bg-[#faf8ff]" : ""}`}>
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${isUnread ? "bg-[#eee9fb] text-[#4a3696]" : "bg-[#f3f1f6] text-[#7a7484]"}`}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {path ? (
            <Link
              className={bodyClass}
              href={path}
              onClick={() => {
                if (isUnread) void center.markRead(item.id);
                onNavigate();
              }}
              title={glossaryHref ? t("openGlossary") : t("openTranslation")}
            >
              {body}
            </Link>
          ) : isUnread && !canAnswer ? (
            <button className={bodyClass} onClick={() => void center.markRead(item.id)} type="button">
              {body}
            </button>
          ) : (
            <div className="min-w-0 flex-1">{body}</div>
          )}
          {isUnread ? (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#f06317]">
              <span className="sr-only">{t("unread")}</span>
            </span>
          ) : null}
        </div>

        {canAnswer ? (
          <div className="mt-2.5 flex gap-2">
            <button
              className={`inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[#21175c] px-3.5 text-[12px] font-bold text-white transition-colors hover:bg-[#f06317] disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_FOCUS}`}
              disabled={busy !== null}
              onClick={() => void answer(true)}
              type="button"
            >
              {busy === "accept" ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : null}
              {t("accept")}
            </button>
            <button
              className={`inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-[#cfc9d8] bg-white px-3.5 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_FOCUS}`}
              disabled={busy !== null}
              onClick={() => void answer(false)}
              type="button"
            >
              {busy === "decline" ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : null}
              {t("decline")}
            </button>
          </div>
        ) : null}

        {error ? (
          <p aria-live="polite" className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700" role="alert">
            <ErrorDetails error={error} />
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** The "Notifications" tab of the bell: the list, with Accept and Decline on open invitations. */
export function NotificationList({ center, onNavigate }: { center: NotificationCenter; onNavigate: () => void }) {
  const t = useTranslations("Notifications");
  const { state } = center;

  if (state.items.length === 0) {
    if (state.status === "idle" || state.status === "loading") {
      return (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-[#625d6b]">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {t("loading")}
        </p>
      );
    }
    if (state.status === "error") {
      return (
        <div className="px-5 py-6">
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("loadError")}</p>
          <button
            className={`mt-3 inline-flex h-8 items-center rounded-[7px] border border-[#cfc9d8] bg-white px-3.5 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] ${BUTTON_FOCUS}`}
            onClick={() => void center.reloadList()}
            type="button"
          >
            {t("retry")}
          </button>
        </div>
      );
    }
    return <p className="px-5 py-8 text-center text-sm text-[#625d6b]">{t("empty")}</p>;
  }

  return (
    <div>
      <div className="flex justify-end border-b border-[#ece8f0] px-5 py-2">
        <button
          className={`rounded-[6px] px-2 py-1 text-[12px] font-bold text-[#21175c] transition-colors hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#21175c] ${BUTTON_FOCUS}`}
          disabled={state.unreadCount === 0}
          onClick={() => void center.markAllRead()}
          type="button"
        >
          {t("markAllRead")}
        </button>
      </div>

      <ul>
        {state.items.map((item) => (
          <NotificationItem center={center} item={item} key={item.id} onNavigate={onNavigate} />
        ))}
      </ul>

      {state.nextCursor ? (
        <div className="border-t border-[#ece8f0] px-5 py-3 text-center">
          <button
            className={`inline-flex h-8 items-center gap-2 rounded-[7px] px-3 text-[12px] font-bold text-[#21175c] transition-colors hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_FOCUS}`}
            disabled={state.isLoadingMore}
            onClick={() => void center.loadMore()}
            type="button"
          >
            {state.isLoadingMore ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : null}
            {state.isLoadingMore ? t("loadingMore") : t("loadMore")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
