"use client";

import {ArrowLeft, ArrowRight, Pencil, Search, Share2} from "lucide-react";
import {useLocale} from "next-intl";
import {useEffect, useMemo, useState} from "react";
import {GlossaryService} from "@/api";
import {Skeleton} from "@/components/ui/skeleton";
import {Link} from "@/i18n/routing";
import type {GlossaryDetailResponse} from "@/lib/types";
import {
  glossaryCopy,
  resolveGlossaryLocale,
} from "../glossary-copy";
import {
  formatGlossaryDateTime,
  GlossaryLanguagePair,
  GlossaryPageFrame,
  GlossaryPagination,
  GlossaryShareDialog,
} from "../glossary-shared";

const FETCH_SIZE = 100;
const TERMS_PER_PAGE = 10;

function GlossaryDetailSkeleton({label}: {label: string}) {
  return (
    <section aria-label={label} aria-live="polite" role="status">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-32 rounded-[7px]" />

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <Skeleton className="h-9 w-full max-w-[420px]" />
        <div className="flex gap-2 self-end sm:self-auto">
          <Skeleton className="h-10 w-24 rounded-[7px]" />
          <Skeleton className="h-10 w-24 rounded-[7px]" />
        </div>
      </div>

      <div className="mt-7 grid overflow-hidden rounded-[8px] border border-[#dcd7e4] bg-white/92 lg:grid-cols-[minmax(230px,.85fr)_minmax(120px,.42fr)_minmax(180px,.6fr)_minmax(360px,1.75fr)]">
        {[0, 1, 2, 3].map((item) => (
          <div className="border-b border-[#e8e4ec] px-5 py-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0" key={item}>
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className={"mt-3 h-5 " + (item === 3 ? "w-4/5" : "w-3/5")} />
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-[520px]">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-3 h-11 w-full rounded-[7px]" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      <div className="mt-4 overflow-hidden rounded-[8px] border border-[#ddd8e5] bg-white/92">
        <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] bg-[#f6f3f8] px-6 py-3">
          <Skeleton className="h-2.5 w-28" />
          <span />
          <Skeleton className="h-2.5 w-28" />
        </div>
        {Array.from({length: 5}, (_, index) => (
          <div className="grid min-h-[62px] grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-center border-t border-[#ebe7ef] px-6 py-3" key={index}>
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="mx-auto size-4 rounded-full" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        ))}
        <div className="flex justify-center gap-3 border-t border-[#e7e2ed] py-5">
          <Skeleton className="size-9 rounded-[7px]" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="size-9 rounded-[7px]" />
        </div>
      </div>
    </section>
  );
}

export function GlossaryDetailView({glossaryId}: {glossaryId: string}) {
  const rawLocale = useLocale();
  const locale = resolveGlossaryLocale(rawLocale);
  const copy = glossaryCopy[locale];

  const [glossary, setGlossary] = useState<GlossaryDetailResponse | null>(null);
  const [search, setSearch] = useState("");
  const [termPage, setTermPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadGlossary = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const firstPage = await GlossaryService.getGlossaryById(glossaryId, {
          page: 1,
          size: FETCH_SIZE,
          sort: "source:asc",
        });
        const pageCount = Math.max(1, firstPage.terms.pages || 1);
        const remainingPages = pageCount > 1
          ? await Promise.all(
              Array.from({length: pageCount - 1}, (_, index) =>
                GlossaryService.getGlossaryById(glossaryId, {
                  page: index + 2,
                  size: FETCH_SIZE,
                  sort: "source:asc",
                }),
              ),
            )
          : [];

        if (isMounted) {
          const allTerms = [
            ...(firstPage.terms.items || []),
            ...remainingPages.flatMap((pageResponse) => pageResponse.terms.items || []),
          ];

          setGlossary({
            ...firstPage,
            terms: {
              ...firstPage.terms,
              items: allTerms,
              page: 1,
              size: allTerms.length,
              pages: 1,
            },
          });
        }
      } catch (error) {
        console.error("Failed to load glossary details", error);
        if (isMounted) {
          setGlossary(null);
          setErrorMessage(copy.detail.loadError);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadGlossary();

    return () => {
      isMounted = false;
    };
  }, [copy.detail.loadError, glossaryId]);

  const filteredTerms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const terms = glossary?.terms?.items ?? [];

    if (!query) return terms;

    return terms.filter(
      (term) =>
        term.source.toLocaleLowerCase().includes(query) ||
        term.target.toLocaleLowerCase().includes(query),
    );
  }, [glossary, search]);

  const totalTermPages = Math.max(1, Math.ceil(filteredTerms.length / TERMS_PER_PAGE));
  const visibleTerms = filteredTerms.slice(
    (termPage - 1) * TERMS_PER_PAGE,
    termPage * TERMS_PER_PAGE,
  );

  useEffect(() => {
    setTermPage(1);
  }, [search]);

  useEffect(() => {
    if (termPage > totalTermPages) setTermPage(totalTermPages);
  }, [termPage, totalTermPages]);

  return (
    <GlossaryPageFrame localePath={`dashboard/glossaries/${glossaryId}`} pageType="detail">
      {isLoading ? (
        <GlossaryDetailSkeleton label={copy.detail.loading} />
      ) : errorMessage || !glossary ? (
        <div className="rounded-[8px] border border-[#f4b4ae] bg-[#fff4f2] px-4 py-4 text-[12px] text-[#b42318]">
          {errorMessage || copy.detail.loadError}
        </div>
      ) : (
        <section aria-labelledby="glossary-detail-title" className="content-reveal">
          <nav>
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white px-3 text-[11px] font-bold text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
              href="/dashboard/glossaries"
            >
              <ArrowLeft className="size-4" />
              {copy.common.backToGlossaries}
            </Link>
          </nav>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 id="glossary-detail-title" className="break-words text-[30px] font-bold leading-tight text-[#21175c]">
                {glossary.name}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white px-4 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                onClick={() => setIsShareOpen(true)}
                type="button"
              >
                <Share2 className="size-4" />
                {copy.detail.share}
              </button>
              <Link
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] bg-[#21175c] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#f06317]"
                href={`/dashboard/glossaries/${glossary.id}/edit`}
              >
                <Pencil className="size-4" />
                {copy.detail.edit}
              </Link>
            </div>
          </div>

          <div className="mt-7 grid overflow-hidden rounded-[8px] border border-[#dcd7e4] bg-white/92 lg:grid-cols-[minmax(230px,.85fr)_minmax(120px,.42fr)_minmax(180px,.6fr)_minmax(360px,1.75fr)]">
            <div className="border-b border-[#e8e4ec] px-5 py-5 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-semibold uppercase text-[#716b79]">{copy.detail.languagePair}</p>
              <div className="mt-2 text-[13px]">
                <GlossaryLanguagePair
                  locale={locale}
                  sourceLanguage={glossary.sourceLanguage}
                  targetLanguage={glossary.targetLanguage}
                />
              </div>
            </div>
            <div className="border-b border-[#e8e4ec] px-5 py-5 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-semibold uppercase text-[#716b79]">{copy.detail.totalTerms}</p>
              <p className="mt-2 text-[23px] font-bold text-[#21175c]">
                {glossary.termCount} <span className="text-[11px] font-medium text-[#716b79]">{copy.common.terms}</span>
              </p>
            </div>
            <div className="border-b border-[#e8e4ec] px-5 py-5 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-semibold uppercase text-[#716b79]">{copy.detail.modifiedAt}</p>
              <time className="mt-2 block text-[12px] font-semibold leading-5 text-[#21175c]" dateTime={glossary.updatedAt}>
                {formatGlossaryDateTime(glossary.updatedAt, locale)}
              </time>
            </div>
            <div className="px-5 py-5">
              <p className="text-[10px] font-semibold uppercase text-[#716b79]">{copy.detail.description}</p>
              <p className="mt-2 line-clamp-4 text-[12px] leading-5 text-[#3f3a45]">
                {glossary.description || copy.common.unknown}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-[520px]">
              <h2 className="text-[12px] font-bold uppercase text-[#21175c]">{copy.detail.termList}</h2>
              <label className="mt-3 flex h-11 items-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white/90 px-3 focus-within:border-[#21175c] focus-within:ring-2 focus-within:ring-[#21175c]/10">
                <Search className="size-4 shrink-0 text-[#777080]" />
                <input
                  aria-label={copy.detail.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9a94a1]"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.detail.searchPlaceholder}
                  type="search"
                  value={search}
                />
              </label>
            </div>
            <span className="inline-flex w-fit rounded-full bg-[#fff0eb] px-3 py-1.5 text-[11px] font-bold text-[#f06317]">
              {filteredTerms.length} {copy.common.terms}
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[8px] border border-[#ddd8e5] bg-white/92">
            <div className="list-table-viewport">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-center bg-[#f6f3f8] px-6 py-3 text-[10px] font-semibold uppercase text-[#6f6877]">
                  <span>{copy.common.source}</span>
                  <span aria-hidden="true" />
                  <span>{copy.common.target}</span>
                </div>

                {visibleTerms.length > 0 ? (
                  visibleTerms.map((term) => (
                    <article
                      className="grid min-h-[62px] grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-center border-t border-[#ebe7ef] px-6 py-3 first:border-t-0"
                      key={term.id}
                    >
                      <span className="min-w-0 break-words text-[12px] font-semibold text-[#21175c]">{term.source}</span>
                      <ArrowRight className="mx-auto size-4 text-[#8a8391]" />
                      <span className="min-w-0 break-words text-[12px] text-[#2f2b34]">{term.target}</span>
                    </article>
                  ))
                ) : (
                  <div className="flex min-h-[180px] items-center justify-center text-[12px] text-[#716b79]">
                    {copy.detail.empty}
                  </div>
                )}
              </div>
            </div>

            <GlossaryPagination
              copy={copy}
              onPageChange={setTermPage}
              page={termPage}
              totalPages={totalTermPages}
            />
          </div>
        </section>
      )}

      <GlossaryShareDialog
        copy={copy}
        glossary={glossary}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
      />
    </GlossaryPageFrame>
  );
}
