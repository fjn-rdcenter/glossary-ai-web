"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useDesktopNotificationState } from "@/hooks/use-desktop-notification-state";
import { disableDesktopNotifications, enableDesktopNotifications } from "@/lib/desktop-notifications";

/** The bell's switch for desktop notifications. Hidden where the browser cannot show them. */
export function DesktopNotificationToggle() {
  const t = useTranslations("Notifications.desktop");
  const state = useDesktopNotificationState();
  const [asking, setAsking] = useState(false);
  const id = useId();

  if (state === "unsupported") return null;

  const enable = async () => {
    setAsking(true);
    try {
      await enableDesktopNotifications();
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex shrink-0 items-start gap-3 border-t border-[#e4dfee] px-5 py-3">
      <div className="min-w-0 flex-1">
        <label className="block text-[13px] font-bold text-[#21175c]" htmlFor={id}>
          {t("label")}
        </label>
        <p className="mt-0.5 text-[12px] leading-4 text-[#625d6b]" id={`${id}-hint`}>
          {state === "blocked" ? t("blocked") : t("hint")}
        </p>
      </div>
      <Switch
        aria-describedby={`${id}-hint`}
        checked={state === "on"}
        className="mt-0.5 data-[state=unchecked]:bg-[#d0cbd8]"
        disabled={state === "blocked" || asking}
        id={id}
        onCheckedChange={(on) => (on ? void enable() : disableDesktopNotifications())}
      />
    </div>
  );
}
