"use client";

import {ChevronLeft, ChevronRight, LoaderCircle, Plus, Trash2, X} from "lucide-react";
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
import {DashboardFooter, DashboardHeader} from "../dashboard-shell";
import {
  getGlossaryLanguageFlag,
  getGlossaryLanguageLabel,
  type GlossaryCopy,
  type GlossaryLocale,
} from "./glossary-copy";
import {
  getSessionGlossaryPermissions,
  inviteSessionGlossaryUser,
  isSessionGlossaryTemplate,
  removeSessionGlossaryPermission,
  setSessionGlossaryPublic,
} from "./glossary-session-template";
import {ErrorDetails} from "@/components/error-details";
import {UsernameCombobox, UsernameNoticeLine} from "@/components/username-combobox";
import {useDescribeError} from "@/hooks/use-describe-error";
import {useUserSearch} from "@/hooks/use-user-search";
import {uiError, type UiError} from "@/lib/error-message";
import {describePerson, describeUsernameInput, fillName, selectableSuggestions} from "@/lib/user-suggestions";

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
  const [errorMessage, setErrorMessage] = useState<UiError | null>(null);
  const {describeError} = useDescribeError();
  // The guided tour's sample glossary has no real accounts behind it.
  const userSearch = useUserSearch({enabled: !isSessionGlossaryTemplate(glossary)});
  const resetUserSearch = userSearch.reset;

  const loadPermissions = useCallback(async () => {
    if (!glossary) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isSessionGlossaryTemplate(glossary)) {
        const sessionPermissions = getSessionGlossaryPermissions();
        if (!sessionPermissions) throw new Error("Session glossary permissions are unavailable");
        setPermissions(sessionPermissions);
      } else {
        setPermissions(await GlossaryService.getGlossaryPermissions(glossary.id));
      }
    } catch (error) {
      console.error("Failed to load glossary permissions", error);
      setPermissions(null);
      setErrorMessage(describeError(error, copy.share.loadError));
    } finally {
      setIsLoading(false);
    }
  }, [copy.share.loadError, glossary]);

  useEffect(() => {
    if (open) {
      setUsername("");
      setExpiresAt("");
      resetUserSearch();
      void loadPermissions();
    }
  }, [loadPermissions, open, resetUserSearch]);

  const isPublic = Boolean(permissions?.publicPermission);
  const accessRows = useMemo(() => permissions?.userPermissions ?? [], [permissions]);
  // Who needs no invitation: the owner, and everyone with access or an invitation still open.
  // A declined invitation can be sent again.
  const blockedUsernames = useMemo(() => {
    const blocked = new Set<string>();
    if (permissions?.ownerName) blocked.add(permissions.ownerName.toLowerCase());
    for (const row of accessRows) {
      if (row.principalId && (row.status === "pending" || row.status === "accepted")) {
        blocked.add(row.principalId.toLowerCase());
      }
    }
    return blocked;
  }, [accessRows, permissions?.ownerName]);
  const owner = describePerson(permissions?.ownerName ?? "", permissions?.ownerDisplayName);
  const usernameNotice = describeUsernameInput({
    typed: username,
    items: userSearch.items,
    status: userSearch.status,
    searchedFor: userSearch.searchedFor,
    blocked: blockedUsernames,
  });
  const suggestions = useMemo(
    () => selectableSuggestions(userSearch.items, blockedUsernames),
    [userSearch.items, blockedUsernames],
  );

  const handlePublicChange = async (nextPublic: boolean) => {
    if (!glossary || busyKey) return;

    setBusyKey("public");
    setErrorMessage(null);

    try {
      if (isSessionGlossaryTemplate(glossary)) {
        const sessionPermissions = setSessionGlossaryPublic(nextPublic);
        if (!sessionPermissions) throw new Error("Session glossary permissions are unavailable");
        setPermissions(sessionPermissions);
      } else {
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
      }
    } catch (error) {
      console.error("Failed to update public glossary permission", error);
      setErrorMessage(describeError(error, copy.share.publicError));
    } finally {
      setBusyKey(null);
    }
  };

  const handleInvite = async () => {
    const normalizedUsername = username.trim();
    if (!glossary || isPublic || busyKey) return;

    if (!normalizedUsername) {
      setErrorMessage(uiError(copy.share.usernameRequired));
      return;
    }

    setBusyKey("invite");
    setErrorMessage(null);

    try {
      const normalizedExpiration = expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null;
      if (isSessionGlossaryTemplate(glossary)) {
        const sessionPermissions = inviteSessionGlossaryUser(normalizedUsername, normalizedExpiration);
        if (!sessionPermissions) throw new Error("Session glossary permissions are unavailable");
        setPermissions(sessionPermissions);
      } else {
        // An account's username (not an email, not another letter case) is what permissions are matched on.
        // A name nobody has used, or a lookup that failed, is invited as typed.
        const resolution = await userSearch.resolve(normalizedUsername);
        if (resolution.status === "found" && blockedUsernames.has(resolution.user.username.toLowerCase())) {
          setErrorMessage(
            uiError(fillName(copy.share.alreadyHasAccess, resolution.user.displayName || resolution.user.username)),
          );
          return;
        }

        await GlossaryService.createGlossaryPermission(glossary.id, {
          principalType: "user",
          principalId: resolution.status === "found" ? resolution.user.username : normalizedUsername,
          permission: "clone",
          expiresAt: normalizedExpiration,
        });
        await loadPermissions();
      }
      setUsername("");
      setExpiresAt("");
      userSearch.reset();
    } catch (error) {
      console.error("Failed to invite glossary user", error);
      setErrorMessage(describeError(error, copy.share.inviteError));
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (permission: GlossaryPermissionBaseResponse) => {
    if (!glossary || busyKey) return;

    setBusyKey(permission.id);
    setErrorMessage(null);

    try {
      if (isSessionGlossaryTemplate(glossary)) {
        const sessionPermissions = removeSessionGlossaryPermission(permission.id);
        if (!sessionPermissions) throw new Error("Session glossary permissions are unavailable");
        setPermissions(sessionPermissions);
      } else {
        await GlossaryService.deleteGlossaryPermission(glossary.id, permission.id);
        await loadPermissions();
      }
    } catch (error) {
      console.error("Failed to remove glossary permission", error);
      setErrorMessage(describeError(error, copy.share.removeError));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[92vh] gap-0 overflow-hidden rounded-[8px] border-[#d8d2e1] bg-white p-0 text-[#21175c] sm:max-w-[620px]"
        onEscapeKeyDown={(event) => {
          // With the suggestion list open, Escape closes just the list (the field handles it).
          const focused = document.activeElement;
          if (focused?.getAttribute("role") === "combobox" && focused.getAttribute("aria-expanded") === "true") {
            event.preventDefault();
          }
        }}
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
              <UsernameCombobox
                copy={{
                  label: copy.share.username,
                  placeholder: copy.share.usernamePlaceholder,
                  suggestions: copy.share.suggestions,
                }}
                disabled={isPublic || isLoading || Boolean(busyKey)}
                onChange={(value) => {
                  setUsername(value);
                  userSearch.search(value);
                }}
                onSubmit={() => void handleInvite()}
                suggestions={suggestions}
                value={username}
              />
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
                disabled={isPublic || isLoading || Boolean(busyKey) || usernameNotice.kind === "blocked"}
                onClick={() => void handleInvite()}
                type="button"
              >
                {busyKey === "invite" ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {copy.share.invite}
              </button>
            </div>
            <UsernameNoticeLine copy={copy.share} notice={usernameNotice} status={userSearch.status} />
            <p className="mt-1 text-[11px] leading-4 text-[#716b79]">{copy.share.inviteNote}</p>
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
                <div className="flex items-center gap-3 py-3">
                  <PermissionAvatar index={0} value={owner.primary} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold">{owner.primary}</p>
                    <p className="mt-0.5 truncate text-[10px] text-[#797280]">{owner.secondary}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#21175c] px-3 py-1 text-[11px] font-bold text-white">
                    {copy.share.owner}
                  </span>
                </div>

                <hr aria-hidden="true" className="my-1 w-1/2 border-0 border-t-1 border-[#d8d2e1]" />

                {accessRows.length > 0 ? (
                  accessRows.map((permission, index) => {
                    const person = describePerson(
                      permission.principalId || permission.principalType,
                      permission.principalDisplayName,
                    );
                    const levelLabel = permission.permission ? copy.share.levels[permission.permission] : null;

                    return (
                      <div className="flex items-center gap-3 py-3" key={permission.id}>
                        <PermissionAvatar index={index + 1} value={person.primary} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-bold">{person.primary}</p>
                          <p className="mt-0.5 truncate text-[10px] text-[#797280]">{person.secondary}</p>
                        </div>
                        {permission.status === "pending" || permission.status === "declined" ? (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              permission.status === "pending" ? "bg-[#fff4ef] text-[#f06317]" : "bg-[#f3f1f6] text-[#716b79]"
                            }`}
                          >
                            {permission.status === "pending" ? copy.share.statusPending : copy.share.statusDeclined}
                          </span>
                        ) : null}
                        {levelLabel ? (
                          <span className="shrink-0 rounded-full border border-[#d8d2e1] bg-[#f6f4fa] px-3 py-1 text-[11px] font-bold text-[#21175c]">
                            {levelLabel}
                          </span>
                        ) : null}
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
              <ErrorDetails error={errorMessage} />
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
