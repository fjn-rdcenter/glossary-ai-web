"use client";

import {ChevronLeft, ChevronRight, LoaderCircle, Plus, Trash2, UserRound, X} from "lucide-react";
import type {ReactNode} from "react";
import {useCallback, useEffect, useMemo, useState} from "react";
import {GlossaryService} from "@/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Switch} from "@/components/ui/switch";
import type {
  GlossaryPermissionAdminResponse,
  GlossaryPermissionBaseResponse,
  GlossaryResponse,
} from "@/lib/types";
import {DashboardFooter, DashboardHeader, FileFormatBadgeBackground} from "../dashboard-shell";
import {
  getGlossaryLanguageFlag,
  getGlossaryLanguageLabel,
  type GlossaryCopy,
  type GlossaryLocale,
} from "./glossary-copy";

export function GlossaryPageFrame({
  children,
  localePath,
  pageType,
}: {
  children: ReactNode;
  localePath: `dashboard/glossaries${string}`;
  pageType: "list" | "detail" | "form";
}) {
  return (
    <div className="login-shell relative isolate flex min-h-dvh flex-col overflow-x-hidden text-[#1f2537]">
      <FileFormatBadgeBackground />
      <DashboardHeader activeNav="glossaries" localePath={localePath} />
      <main
        className="dashboard-page-body relative z-10 mx-auto w-full max-w-[1540px] flex-1 px-4 pb-14 pt-8 sm:px-8 lg:px-10 lg:pt-10"
        data-dashboard-page={`glossary-${pageType}`}
      >
        {children}
      </main>
      <DashboardFooter />
    </div>
  );
}

export function formatGlossaryDateTime(value: string | null | undefined, locale: GlossaryLocale) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : locale === "ja" ? "ja-JP" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function GlossaryPagination({
  copy,
  page,
  totalPages,
  onPageChange,
}: {
  copy: GlossaryCopy;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <nav aria-label={copy.list.page} className="flex items-center justify-center gap-3 border-t border-[#e7e2ed] py-5">
      <button
        aria-label={copy.list.previousPage}
        className="grid size-9 place-items-center rounded-[7px] border border-[#d8d2e1] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-35"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-24 text-center text-[12px] font-semibold text-[#5f5968]">
        {copy.list.page} {page} / {safeTotalPages}
      </span>
      <button
        aria-label={copy.list.nextPage}
        className="grid size-9 place-items-center rounded-[7px] border border-[#d8d2e1] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-35"
        disabled={page >= safeTotalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

export function GlossaryLanguagePair({
  locale,
  sourceLanguage,
  targetLanguage,
  compact = false,
}: {
  locale: GlossaryLocale;
  sourceLanguage: string;
  targetLanguage: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
      <GlossaryLanguage language={sourceLanguage} locale={locale} />
      <ChevronRight className="size-4 shrink-0 text-[#837b8d]" />
      <GlossaryLanguage language={targetLanguage} locale={locale} />
    </div>
  );
}

export function GlossaryLanguage({
  language,
  locale,
  className = "",
}: {
  language: string;
  locale: GlossaryLocale;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <img
        alt=""
        aria-hidden="true"
        className="h-3.5 w-5 shrink-0 rounded-[1px] border-[0.5px] border-black/80 object-cover"
        src={getGlossaryLanguageFlag(language)}
      />
      <span className="min-w-0 truncate font-semibold text-[#21175c]">
        {getGlossaryLanguageLabel(language, locale)}
      </span>
    </span>
  );
}

function PermissionAvatar({value, index}: {value: string; index: number}) {
  const colors = ["#21175c", "#f06317", "#1769d2", "#0f8277"];

  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
      style={{backgroundColor: colors[index % colors.length]}}
    >
      {(value.trim().charAt(0) || "U").toUpperCase()}
    </span>
  );
}

export function GlossaryShareDialog({
  copy,
  glossary,
  open,
  onOpenChange,
}: {
  copy: GlossaryCopy;
  glossary: GlossaryResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [permissions, setPermissions] = useState<GlossaryPermissionAdminResponse | null>(null);
  const [username, setUsername] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPermissions = useCallback(async () => {
    if (!glossary) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      setPermissions(await GlossaryService.getGlossaryPermissions(glossary.id));
    } catch (error) {
      console.error("Failed to load glossary permissions", error);
      setPermissions(null);
      setErrorMessage(copy.share.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.share.loadError, glossary]);

  useEffect(() => {
    if (open) {
      setUsername("");
      setExpiresAt("");
      void loadPermissions();
    }
  }, [loadPermissions, open]);

  const isPublic = Boolean(permissions?.publicPermission);
  const accessRows = useMemo(() => permissions?.userPermissions ?? [], [permissions]);

  const handlePublicChange = async (nextPublic: boolean) => {
    if (!glossary || busyKey) return;

    setBusyKey("public");
    setErrorMessage("");

    try {
      if (nextPublic) {
        await GlossaryService.createGlossaryPermission(glossary.id, {
          principalType: "public",
          principalId: null,
          permission: "clone",
          expiresAt: null,
        });
      } else if (permissions?.publicPermission) {
        await GlossaryService.deleteGlossaryPermission(glossary.id, permissions.publicPermission.id);
      }

      await loadPermissions();
    } catch (error) {
      console.error("Failed to update public glossary permission", error);
      setErrorMessage(copy.share.publicError);
    } finally {
      setBusyKey(null);
    }
  };

  const handleInvite = async () => {
    const normalizedUsername = username.trim();
    if (!glossary || isPublic || busyKey) return;

    if (!normalizedUsername) {
      setErrorMessage(copy.share.usernameRequired);
      return;
    }

    setBusyKey("invite");
    setErrorMessage("");

    try {
      await GlossaryService.createGlossaryPermission(glossary.id, {
        principalType: "user",
        principalId: normalizedUsername,
        permission: "view",
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      setUsername("");
      setExpiresAt("");
      await loadPermissions();
    } catch (error) {
      console.error("Failed to invite glossary user", error);
      setErrorMessage(copy.share.inviteError);
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (permission: GlossaryPermissionBaseResponse) => {
    if (!glossary || busyKey) return;

    setBusyKey(permission.id);
    setErrorMessage("");

    try {
      await GlossaryService.deleteGlossaryPermission(glossary.id, permission.id);
      await loadPermissions();
    } catch (error) {
      console.error("Failed to remove glossary permission", error);
      setErrorMessage(copy.share.removeError);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-hidden rounded-[8px] border-[#d8d2e1] bg-white p-0 text-[#21175c] sm:max-w-[620px]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-[#e7e2ed] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-[21px] font-bold">{copy.share.title}</DialogTitle>
              <DialogDescription className="mt-1 text-[12px] text-[#716b79]">
                {glossary?.name ?? ""}
              </DialogDescription>
            </div>
            <button
              aria-label="Close"
              className="grid size-9 place-items-center rounded-[7px] border border-[#d8d2e1] text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          <section className="flex items-start justify-between gap-5 border-b border-[#e7e2ed] pb-5">
            <div>
              <h3 className="text-[13px] font-bold">{copy.share.public}</h3>
              <p className="mt-1 text-[12px] leading-5 text-[#716b79]">{copy.share.publicDescription}</p>
            </div>
            {busyKey === "public" ? (
              <LoaderCircle className="mt-0.5 size-6 animate-spin text-[#f06317]" />
            ) : (
              <Switch
                aria-label={copy.share.public}
                checked={isPublic}
                className="h-7 w-12 data-[state=checked]:bg-[#0f8277] data-[state=unchecked]:bg-[#d6d1dd] [&_[data-slot=switch-thumb]]:size-6"
                disabled={isLoading || Boolean(busyKey)}
                onCheckedChange={(checked) => void handlePublicChange(checked)}
              />
            )}
          </section>

          <section className="border-b border-[#e7e2ed] py-5">
            <h3 className="text-[13px] font-bold">{copy.share.inviteUsers}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold">{copy.share.username}</span>
                <span className="flex h-10 items-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white px-3 focus-within:border-[#21175c] focus-within:ring-2 focus-within:ring-[#21175c]/10 has-[:disabled]:bg-[#f1eff4] has-[:disabled]:opacity-60">
                  <UserRound className="size-4 shrink-0 text-[#777080]" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9a94a1]"
                    disabled={isPublic || isLoading || Boolean(busyKey)}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder={copy.share.usernamePlaceholder}
                    value={username}
                  />
                </span>
              </label>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold">{copy.share.expiration}</span>
                <input
                  className="h-10 w-full rounded-[7px] border border-[#d8d2e1] bg-white px-3 text-[12px] outline-none focus:border-[#21175c] focus:ring-2 focus:ring-[#21175c]/10 disabled:bg-[#f1eff4] disabled:opacity-60"
                  disabled={isPublic || isLoading || Boolean(busyKey)}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  type="date"
                  value={expiresAt}
                />
              </label>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] bg-[#21175c] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#f06317] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isPublic || isLoading || Boolean(busyKey)}
                onClick={() => void handleInvite()}
                type="button"
              >
                {busyKey === "invite" ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {copy.share.invite}
              </button>
            </div>
          </section>

          <section className="pt-5">
            <h3 className="mb-3 text-[11px] font-bold uppercase text-[#716b79]">{copy.share.accessList}</h3>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-[12px] text-[#716b79]">
                <LoaderCircle className="size-4 animate-spin" />
                {copy.share.loading}
              </div>
            ) : permissions ? (
              <div className="content-reveal">
                <div className="flex items-center gap-3 border-b border-[#ece8f0] py-3">
                  <PermissionAvatar index={0} value={permissions.ownerName} />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold">{permissions.ownerName}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[#797280]">
                      {permissions.ownerId} ({copy.share.owner})
                    </p>
                  </div>
                </div>

                {accessRows.length > 0 ? (
                  accessRows.map((permission, index) => {
                    const principal = permission.principalId || permission.principalType;

                    return (
                      <div className="flex items-center gap-3 border-b border-[#ece8f0] py-3 last:border-b-0" key={permission.id}>
                        <PermissionAvatar index={index + 1} value={principal} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold">{principal}</p>
                          <p className="mt-0.5 text-[10px] text-[#797280]">{permission.permission}</p>
                        </div>
                        <button
                          aria-label={copy.share.remove}
                          className="grid size-8 place-items-center rounded-[6px] text-[#756e7d] transition-colors hover:bg-[#fff0ed] hover:text-[#d92d20] disabled:opacity-40"
                          disabled={Boolean(busyKey)}
                          onClick={() => void handleRemove(permission)}
                          title={copy.share.remove}
                          type="button"
                        >
                          {busyKey === permission.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-5 text-[12px] text-[#716b79]">{copy.share.noUsers}</p>
                )}
              </div>
            ) : null}
          </section>

          {errorMessage ? (
            <p className="mt-4 rounded-[7px] border border-[#f4b4ae] bg-[#fff4f2] px-3 py-2 text-[12px] text-[#b42318]">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[#e7e2ed] px-6 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-[7px] bg-[#21175c] px-5 text-[12px] font-bold text-white transition-colors hover:bg-[#f06317]"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {copy.share.done}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
