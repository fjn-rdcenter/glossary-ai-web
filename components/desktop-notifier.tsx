"use client";

import { useLocale, useTranslations } from "next-intl";
import { NotificationService } from "@/api";
import { isSignedIn } from "@/api/auth-session";
import { runDesktopNotifier } from "@/api/desktop-notifier";
import { useDescribeError } from "@/hooks/use-describe-error";
import { useDesktopNotificationState } from "@/hooks/use-desktop-notification-state";
import { useKeyedMountEffect } from "@/hooks/use-keyed-mount-effect";
import { useLatest } from "@/hooks/use-latest";
import { usePathname, useRouter } from "@/i18n/routing";
import { notificationText } from "@/lib/notification-types";
import { notificationPath } from "@/lib/notifications";

const TITLE = "GlossaryAI";
const ICON = `${process.env.NEXT_PUBLIC_BASE_PATH}/glossaryai-notification.png`;
const MAX_SEPARATE = 3;

/**
 * Mounted once, around every page, so it survives navigation: while desktop notifications are on and someone is
 * signed in, this tab takes part in announcing new notifications (see `api/desktop-notifier.ts`).
 * Each one says what the bell says; more than a few at once become one summary. A click focuses the tab, marks the
 * notification read, and opens what it is about as the bell's link does, so a page that guards against leaving
 * (the translate page) asks first and the notification is read whatever the answer.
 */
export function DesktopNotifier() {
  const state = useDesktopNotificationState();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Notifications");
  const router = useRouter();
  const { describeFailureReason } = useDescribeError();
  const latest = useLatest({ t, router, locale, describeFailureReason });

  // Navigation re-renders this: signing in lands on the dashboard, signing out on the login page.
  const signedIn = !/^\/login\/?$/.test(pathname) && isSignedIn();

  useKeyedMountEffect(state === "on" && signedIn ? "on" : null, () =>
    runDesktopNotifier((items) => {
      const { t, describeFailureReason } = latest.current;
      if (items.length > MAX_SEPARATE) {
        show(t("desktop.summary", { count: items.length }), `glossaryai-summary-${items[items.length - 1].id}`);
        return;
      }
      for (const item of items) {
        const { message, reason } = notificationText(item, t, describeFailureReason);
        show([message, reason].filter(Boolean).join("\n"), `glossaryai-${item.id}`, () => {
          void NotificationService.markRead(item.id).catch(() => undefined);
          const path = notificationPath(item);
          if (path) followLink(path, latest.current);
        });
      }
    }),
  );

  return null;
}

/** One desktop notification. A click brings this tab forward, then runs `onOpen`. */
function show(body: string, tag: string, onOpen?: () => void) {
  try {
    const notification = new Notification(TITLE, { body, tag, icon: ICON });
    notification.onclick = () => {
      window.focus();
      notification.close();
      onOpen?.();
    };
  } catch (error) {
    console.warn("Could not show a desktop notification", error);
  }
}

/**
 * Open `path` through a click on a real link, as the bell does, rather than straight through the router: a page
 * that guards against leaving catches link clicks, cancels them and asks first. An uncaught click navigates in-app.
 */
function followLink(path: string, { router, locale }: { router: ReturnType<typeof useRouter>; locale: string }) {
  const link = document.createElement("a");
  link.href = `${process.env.NEXT_PUBLIC_BASE_PATH}/${locale}${path}`;
  link.hidden = true;
  link.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    router.push(path);
  });
  document.body.append(link);
  link.click();
  link.remove();
}
