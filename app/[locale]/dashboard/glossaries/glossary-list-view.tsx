"use client";

import {
  CalendarDays,
  Copy,
  Info,
  LoaderCircle,
  NotebookTabs,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  TableProperties,
  Trash2,
} from "lucide-react";
import {useLocale} from "next-intl";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {GlossaryService} from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Checkbox} from "@/components/ui/checkbox";
import {Skeleton} from "@/components/ui/skeleton";
import {Link, useRouter} from "@/i18n/routing";
import type {GlossaryResponse, PaginatedResponse} from "@/lib/types";
import {
  glossaryCopy,
  resolveGlossaryLocale,
} from "./glossary-copy";
import {
  formatGlossaryDateTime,
  GlossaryLanguagePair,
  GlossaryPageFrame,
  GlossaryPagination,
  GlossaryShareDialog,
} from "./glossary-shared";
import {GlossaryGuidedTour} from "./glossary-guided-tour";
import {
  clearSessionGlossaryTemplate,
  deleteSessionGlossaryTemplate,
  getOrCreateSessionGlossaryTemplate,
  isSessionGlossaryTemplate,
} from "./glossary-session-template";

type GlossaryTab = "mine" | "public" | "shared";

type GlossaryPageCacheEntry = {
  items: GlossaryResponse[];
  total: number;
  totalPages: number;
};

type GlossaryPageParams = {
  page: number;
  search?: string;
  size: number;
};

const DEFAULT_PAGE_SIZE = 8;

function getPageSizeForViewport(width: number) {
  if (width >= 1440) return 8;
  if (width >= 1100) return 6;
  if (width >= 760) return 4;
  return 2;
}

function getGlossaryCacheKey(tab: GlossaryTab, search: string, page: number, pageSize: number) {
  return JSON.stringify([tab, search, page, pageSize]);
}

function fetchGlossaryPage(tab: GlossaryTab, params: GlossaryPageParams) {
  if (tab === "public") return GlossaryService.getPublicGlossaries(params);
  if (tab === "shared") return GlossaryService.getSharedWithMeGlossaries(params);

  return GlossaryService.getGlossaries(params);
}

function setGlossaryCacheEntry(cache: Map<string, GlossaryPageCacheEntry>, key: string, entry: GlossaryPageCacheEntry) {
  cache.delete(key);
  cache.set(key, entry);

  if (cache.size > 24) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

const createdAtLabels = {
  vi: "Ngày tạo",
  en: "Created",
  ja: "作成日",
} as const;

const termUnitLabels = {
  vi: "từ",
  en: "terms",
  ja: "語",
} as const;

const infoActionLabels = {
  vi: "Thông tin",
  en: "Info",
  ja: "詳細",
} as const;

export function GlossaryListView() {
  const rawLocale = useLocale();
  const locale = resolveGlossaryLocale(rawLocale);
  const copy = glossaryCopy[locale];
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<GlossaryTab>("mine");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isPageSizeReady, setIsPageSizeReady] = useState(false);
  const pageSizeRef = useRef(DEFAULT_PAGE_SIZE);
  const [items, setItems] = useState<GlossaryResponse[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [shareGlossary, setShareGlossary] = useState<GlossaryResponse | null>(null);
  const [sessionTemplate, setSessionTemplate] = useState<GlossaryResponse | null>(null);
  const glossaryCacheRef = useRef<Map<string, GlossaryPageCacheEntry>>(new Map());
  const glossaryRequestIdRef = useRef(0);
  const [showInitialSkeleton, setShowInitialSkeleton] = useState(false);

  useEffect(() => {
    const syncPageSize = () => {
      const nextPageSize = getPageSizeForViewport(window.innerWidth);

      if (pageSizeRef.current !== nextPageSize) {
        pageSizeRef.current = nextPageSize;
        setPageSize(nextPageSize);
        setPage(1);
      }

      setIsPageSizeReady(true);
    };

    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const isInitialLoading = isLoading && items.length === 0;

  useEffect(() => {
    if (!isInitialLoading) {
      setShowInitialSkeleton(false);
      return;
    }

    const timer = window.setTimeout(() => setShowInitialSkeleton(true), 150);
    return () => window.clearTimeout(timer);
  }, [isInitialLoading]);

  const loadGlossaries = useCallback(async () => {
    if (!isPageSizeReady) return;

    const requestId = ++glossaryRequestIdRef.current;
    const cacheKey = getGlossaryCacheKey(activeTab, debouncedSearch, page, pageSize);
    const cachedPage = glossaryCacheRef.current.get(cacheKey);

    if (cachedPage) {
      setItems(cachedPage.items);
      setTotal(cachedPage.total);
      setTotalPages(cachedPage.totalPages);
    }

    setIsLoading(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const params = {
        page,
        size: pageSize,
        search: debouncedSearch || undefined,
      };
      const response: PaginatedResponse<GlossaryResponse> = await fetchGlossaryPage(activeTab, params);
      if (requestId !== glossaryRequestIdRef.current) return;

      const pages = Math.max(1, response.pages || 1);
      const entry = {
        items: response.items || [],
        total: response.total || 0,
        totalPages: pages,
      };
      setGlossaryCacheEntry(glossaryCacheRef.current, cacheKey, entry);

      if (page > pages) {
        setPage(pages);
        return;
      }

      setItems(entry.items);
      setTotal(entry.total);
      setTotalPages(pages);
      setSelectedIds(new Set());

      if (page < pages) {
        const nextPage = page + 1;
        const nextCacheKey = getGlossaryCacheKey(activeTab, debouncedSearch, nextPage, pageSize);

        if (!glossaryCacheRef.current.has(nextCacheKey)) {
          void fetchGlossaryPage(activeTab, {...params, page: nextPage})
            .then((nextResponse) => {
              if (requestId !== glossaryRequestIdRef.current) return;
              setGlossaryCacheEntry(glossaryCacheRef.current, nextCacheKey, {
                items: nextResponse.items || [],
                total: nextResponse.total || 0,
                totalPages: Math.max(1, nextResponse.pages || 1),
              });
            })
            .catch(() => undefined);
        }
      }
    } catch (error) {
      if (requestId !== glossaryRequestIdRef.current) return;
      console.error("Failed to load glossaries", error);
      setSelectedIds(new Set());
      setErrorMessage(copy.list.loadError);
    } finally {
      if (requestId === glossaryRequestIdRef.current) setIsLoading(false);
    }
  }, [activeTab, copy.list.loadError, debouncedSearch, isPageSizeReady, page, pageSize, refreshVersion]);

  useEffect(() => {
    void loadGlossaries();
  }, [loadGlossaries]);

  const showGlossaryTourTemplate =
    activeTab === "mine" &&
    page === 1 &&
    total === 0 &&
    items.length === 0 &&
    debouncedSearch === "" &&
    search.trim() === "" &&
    !errorMessage;

  useEffect(() => {
    if (!showGlossaryTourTemplate) {
      setSessionTemplate(null);
      return;
    }

    setSessionTemplate(getOrCreateSessionGlossaryTemplate(locale));
  }, [locale, showGlossaryTourTemplate]);

  useEffect(() => {
    if (activeTab !== "mine" || total === 0) return;
    clearSessionGlossaryTemplate();
    setSessionTemplate(null);
  }, [activeTab, total]);

  const visibleGlossaryItems = showGlossaryTourTemplate && sessionTemplate ? [sessionTemplate] : items;
  const allVisibleSelected =
    visibleGlossaryItems.length > 0 && visibleGlossaryItems.every((item) => selectedIds.has(item.id));
  const selectedCount = selectedIds.size;
  const skeletonCount = Math.max(1, pageSize / 2);

  const tabs = useMemo(
    () =>
      [
        {key: "mine" as const, label: copy.list.mine},
        {key: "public" as const, label: copy.list.public},
        {key: "shared" as const, label: copy.list.shared},
      ],
    [copy],
  );

  const toggleSelected = (id: string, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllVisible = (selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleGlossaryItems.forEach((item) => {
        if (selected) next.add(item.id);
        else next.delete(item.id);
      });
      return next;
    });
  };

  const handleDelete = async () => {
    if (activeTab !== "mine" || selectedIds.size === 0 || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const ids = Array.from(selectedIds);
      const backendIds = ids.filter((id) => !isSessionGlossaryTemplate(id));
      await Promise.all(backendIds.map((id) => GlossaryService.deleteGlossary(id)));

      if (backendIds.length > 0) {
        clearSessionGlossaryTemplate();
      }

      if (ids.some(isSessionGlossaryTemplate)) {
        deleteSessionGlossaryTemplate();
        setSessionTemplate(null);
      }

      setIsDeleteOpen(false);
      setSelectedIds(new Set());
      glossaryRequestIdRef.current += 1;
      glossaryCacheRef.current.clear();
      setRefreshVersion((version) => version + 1);
    } catch (error) {
      console.error("Failed to delete selected glossaries", error);
      setErrorMessage(copy.list.deleteError);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClone = async (glossary: GlossaryResponse) => {
    if (busyId) return;

    setBusyId(glossary.id);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      await GlossaryService.cloneGlossary(glossary.id, {
        name: glossary.name,
        description: glossary.description ?? null,
      });
      setFeedbackMessage(copy.list.cloneSuccess);
    } catch (error) {
      console.error("Failed to clone glossary", error);
      setErrorMessage(copy.list.cloneError);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <GlossaryPageFrame localePath="dashboard/glossaries" pageType="list">
      <section aria-labelledby="glossary-list-title">
        <div>
          <h1 id="glossary-list-title" className="text-[28px] font-bold leading-tight text-[#21175c]">
            {copy.list.title}
          </h1>
          <p className="mt-1.5 max-w-[760px] text-[13px] leading-5 text-[#6d6675]">{copy.list.description}</p>
        </div>

        <div className="mt-10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="inline-grid w-full shrink-0 grid-cols-3 rounded-[7px] bg-[#f0edf4] p-1 sm:w-[400px]" data-glossary-list-tour="scope">
              {tabs.map((tab) => (
                <button
                  aria-pressed={activeTab === tab.key}
                  className={"h-10 rounded-[5px] px-3 text-[13px] font-semibold transition-colors " + (
                    activeTab === tab.key ? "bg-white text-[#21175c] shadow-sm" : "text-[#716b79] hover:text-[#21175c]"
                  )}
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                    setSelectedIds(new Set());
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap lg:justify-end">
              <label className="flex h-11 w-full min-w-[230px] items-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white/90 px-3 focus-within:border-[#21175c] focus-within:ring-2 focus-within:ring-[#21175c]/10 sm:max-w-[360px] sm:flex-1" data-glossary-list-tour="search">
                <Search className="size-4 shrink-0 text-[#777080]" />
                <input
                  aria-label={copy.list.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9a94a1]"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.list.searchPlaceholder}
                  type="search"
                  value={search}
                />
              </label>

              <label className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 px-1 text-[13px] font-medium text-[#5f5968]">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                />
                {copy.list.selectAll}
              </label>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  aria-label={copy.list.refresh}
                  className="grid size-11 place-items-center rounded-[7px] border border-[#d8d2e1] bg-white/90 text-[#21175c] shadow-sm transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-wait disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => {
                    glossaryRequestIdRef.current += 1;
                    glossaryCacheRef.current.clear();
                    setRefreshVersion((version) => version + 1);
                  }}
                  title={copy.list.refresh}
                  type="button"
                >
                  <RefreshCw className={"size-4 " + (isLoading ? "animate-spin" : "")} />
                </button>

                <button
                  aria-label={copy.list.delete}
                  className="grid size-11 place-items-center rounded-[7px] border border-[#ff9b90] bg-white/90 text-[#d92d20] shadow-sm transition-colors hover:bg-[#fff3f1] disabled:cursor-not-allowed disabled:border-[#ddd8e3] disabled:text-[#aaa3b0] disabled:opacity-55"
                  disabled={activeTab !== "mine" || selectedCount === 0 || isDeleting}
                  onClick={() => setIsDeleteOpen(true)}
                  title={copy.list.delete}
                  type="button"
                >
                  {isDeleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </button>

                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[7px] bg-[#21175c] px-4 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#f06317]"
                  data-glossary-list-tour="create"
                  href="/dashboard/glossaries/new"
                >
                  <Plus className="size-4" />
                  {copy.list.create}
                </Link>
              </div>
            </div>
          </div>

          {feedbackMessage ? (
            <p className="mt-3 rounded-[7px] border border-[#a7dfc2] bg-[#f0fbf5] px-3 py-2 text-[12px] text-[#087443]">
              {feedbackMessage}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-3 rounded-[7px] border border-[#f4b4ae] bg-[#fff4f2] px-3 py-2 text-[12px] text-[#b42318]">
              {errorMessage}
            </p>
          ) : null}

          <div aria-busy={isLoading} className="relative mt-5 w-full">
            {isLoading && !isInitialLoading ? <span aria-hidden="true" className="list-loading-progress" /> : null}
            {isInitialLoading ? (
              showInitialSkeleton ? (
              <div
                aria-label={copy.list.loading}
                aria-live="polite"
                className="glossary-reference-grid"
                role="status"
              >
                <span className="sr-only">{copy.list.loading}</span>
                {Array.from({length: skeletonCount}, (_, index) => (
                  <div aria-hidden="true" className="glossary-reference-card" key={index}>
                    <span className="glossary-reference-sheet glossary-reference-sheet-back" />
                    <span className="glossary-reference-sheet glossary-reference-sheet-front" />
                    <span className="glossary-reference-tab" />
                    <span className="glossary-reference-surface" />
                    <span className="glossary-reference-bookmark" />

                    <div className="glossary-lazy-content relative z-[5] flex h-full min-w-0 flex-col px-5 pb-4 pt-6">
                      <div className="flex items-start justify-between gap-3 pl-7">
                        <Skeleton className="h-6 w-3/5" />
                        <Skeleton className="size-5 rounded-[4px]" />
                      </div>
                      <div className="mt-3 space-y-2 pl-7">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-center gap-3 pl-7">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="ml-7 mt-4 h-7 w-40 rounded-[6px]" />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#e5e8ef] pt-3">
                        <Skeleton className="h-10 rounded-[7px]" />
                        <Skeleton className="h-10 rounded-[7px]" />
                        <Skeleton className="h-10 rounded-[7px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div aria-hidden="true" className="min-h-[310px]" />
              )
            ) : visibleGlossaryItems.length === 0 ? (
              <div className="content-reveal flex min-h-[520px] items-center justify-center rounded-[8px] border border-dashed border-[#d7d0e1] bg-white/55 px-6 text-center text-[13px] text-[#716b79]">
                {copy.list.empty}
              </div>
            ) : (
              <div className={"glossary-reference-grid transition-opacity duration-200 " + (isLoading ? "pointer-events-none opacity-60" : "")}>
                {visibleGlossaryItems.map((glossary, glossaryIndex) => {
                  const isTemplate = isSessionGlossaryTemplate(glossary);
                  const isSelected = selectedIds.has(glossary.id);
                  const isTourItem = activeTab === "mine" && glossaryIndex === 0;
                  const createdAt = glossary.createdAt || glossary.updatedAt;

                  return (
                    <article
                      aria-label={glossary.name}
                      aria-selected={isSelected}
                      className={"glossary-reference-card glossary-reference-reveal group cursor-pointer focus-visible:outline-none " + (isSelected ? "is-selected" : "")}
                      data-glossary-list-tour={isTourItem ? "item" : undefined}
                      key={glossary.id}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a, button, input, [role='checkbox']")) return;
                        router.push("/dashboard/glossaries/" + glossary.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                        event.preventDefault();
                        router.push("/dashboard/glossaries/" + glossary.id);
                      }}
                      role="link"
                      tabIndex={0}
                    >
                      <span aria-hidden="true" className="glossary-reference-sheet glossary-reference-sheet-back" />
                      <span aria-hidden="true" className="glossary-reference-sheet glossary-reference-sheet-front" />
                      <span aria-hidden="true" className="glossary-reference-tab" />
                      <span aria-hidden="true" className="glossary-reference-surface" />
                      <span aria-hidden="true" className="glossary-reference-bookmark" />

                      <div className="glossary-lazy-content relative z-[5] flex h-full min-w-0 flex-col px-5 pb-4 pt-6">
                        <div className="flex min-w-0 items-start justify-between gap-3 pl-7">
                          <h2 className="line-clamp-2 min-w-0 text-[18px] font-bold leading-[1.35] text-[#142147]" title={glossary.name}>
                            {glossary.name}
                          </h2>
                          <Checkbox
                            aria-label={glossary.name}
                            checked={isSelected}
                            className="mt-0.5 shrink-0 bg-white"
                            onCheckedChange={(checked) => toggleSelected(glossary.id, checked === true)}
                          />
                        </div>

                        <p className="mt-2 line-clamp-2 min-h-[38px] text-[12px] leading-[19px] text-[#5f687c]">
                          {isTemplate ? <span className="mr-1.5 rounded-full bg-[#eaf1ff] px-2 py-0.5 font-bold text-[#31548a]">{copy.common.sampleData}</span> : null}
                          {glossary.description || copy.common.noDescription}
                        </p>

                        <div className="mt-auto">
                          <div className="flex min-w-0 items-center gap-3 text-[14px] text-[#55617a]">
                            <span className="inline-flex h-5 shrink-0 items-center gap-1">
                              <NotebookTabs aria-hidden="true" className="size-5 shrink-0 text-[#31548a]" />
                              <strong className="inline-flex h-5 items-center font-semibold leading-none text-[#26375f] pt-1">
                                {new Intl.NumberFormat(locale).format(glossary.termCount)} {termUnitLabels[locale]}
                              </strong>
                            </span>
                            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-[#d9dee8]" />
                            <time
                              className="inline-flex min-w-0 items-center gap-1"
                              dateTime={createdAt}
                              title={formatGlossaryDateTime(createdAt, locale)}
                            >
                              <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#31548a]" />
                              <span className="truncate pt-1">
                                {createdAtLabels[locale]} {formatGlossaryDateTime(createdAt, locale)}
                              </span>
                            </time>
                          </div>

                          <div className="mt-4">
                            <div className="glossary-reference-language-tag inline-flex max-w-full text-[11px]">
                              <GlossaryLanguagePair
                                compact
                                locale={locale}
                                sourceLanguage={glossary.sourceLanguage}
                                targetLanguage={glossary.targetLanguage}
                              />
                            </div>
                          </div>
                        </div>

                        <div className={"mt-3 grid gap-2 border-t border-[#e1e6ef] pt-3 " + (activeTab === "mine" ? "grid-cols-3" : "grid-cols-2")}>
                          <Link
                            aria-label={copy.list.open}
                            className="glossary-reference-action"
                            data-glossary-list-tour={isTourItem ? "info" : undefined}
                            href={"/dashboard/glossaries/" + glossary.id}
                            title={copy.list.open}
                          >
                            <Info aria-hidden="true" className="size-4" />
                            <span className="truncate">{infoActionLabels[locale]}</span>
                          </Link>

                          {activeTab === "mine" ? (
                            <>
                              <Link
                                aria-label={copy.detail.edit}
                                className="glossary-reference-action"
                                data-glossary-list-tour={isTourItem ? "edit" : undefined}
                                href={"/dashboard/glossaries/" + glossary.id + "/edit"}
                                title={copy.detail.edit}
                              >
                                <Pencil aria-hidden="true" className="size-4" />
                                <span className="truncate">{copy.detail.edit}</span>
                              </Link>
                              <button
                                aria-label={copy.list.share}
                                className="glossary-reference-action disabled:cursor-not-allowed disabled:opacity-70"
                                data-glossary-list-tour={isTourItem ? "share" : undefined}
                                onClick={() => setShareGlossary(glossary)}
                                title={copy.list.share}
                                type="button"
                              >
                                <Share2 aria-hidden="true" className="size-4" />
                                <span className="truncate">{copy.list.share}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              aria-label={copy.list.clone}
                              className="glossary-reference-action disabled:cursor-wait disabled:opacity-50"
                              disabled={Boolean(busyId)}
                              onClick={() => void handleClone(glossary)}
                              title={copy.list.clone}
                              type="button"
                            >
                              {busyId === glossary.id ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Copy aria-hidden="true" className="size-4" />}
                              <span className="truncate">{copy.list.clone}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-6">
              <GlossaryPagination copy={copy} onPageChange={setPage} page={page} totalPages={totalPages} />
            </div>
          </div>
        </div>
      </section>

      <GlossaryShareDialog
        copy={copy}
        glossary={shareGlossary}
        onOpenChange={(open) => {
          if (!open) setShareGlossary(null);
        }}
        open={Boolean(shareGlossary)}
      />

      <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
        <AlertDialogContent className="rounded-[8px] border-[#d8d2e1] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#21175c]">{copy.list.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.list.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{copy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#d92d20] text-white hover:bg-[#b42318]"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
              {copy.list.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GlossaryGuidedTour locale={locale} phase="list" />
    </GlossaryPageFrame>
  );
}
