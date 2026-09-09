"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Info,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {useLocale} from "next-intl";
import {useCallback, useEffect, useMemo, useState} from "react";
import {TranslationService} from "@/api";
import {FileTypeTile} from "@/components/file-type-tile";
import {LanguageDisplay} from "@/components/language-display";
import {TranslationDetailDialog} from "@/components/translation-detail-dialog";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Select, SelectContent, SelectItem, SelectTrigger} from "@/components/ui/select";
import {Skeleton} from "@/components/ui/skeleton";
import {getTranslatedFileName} from "@/lib/translation-file-name";
import type {StatusEnum, TranslationHistoryResponse} from "@/lib/types";
import {DashboardFooter, DashboardHeader, FileFormatBadgeBackground} from "../dashboard-shell";

type HistoryLocale = "en" | "vi" | "ja";
type HistoryJob = TranslationHistoryResponse & {
  fileSize?: number;
  keepSource?: boolean;
  sourceDocumentSize?: number;
  sourceSize?: number;
  targetDocumentName?: string;
};

const PAGE_SIZE = 10;
type HistoryStatusFilter = "all" | "processing" | Exclude<StatusEnum, "pending" | "translating">;
const statusOptions: Exclude<HistoryStatusFilter, "all">[] = ["completed", "processing", "failed", "cancelled"];

const historyCopy = {
  vi: {
    title: "Lịch sử dịch",
    description: "Theo dõi trạng thái và truy cập các tệp nguồn, tệp dịch của mọi tác vụ.",
    refresh: "Làm mới",
    searchPlaceholder: "Tìm theo tên tài liệu",
    dateRange: "Khoảng thời gian",
    dateFrom: "Từ ngày",
    dateTo: "Đến ngày",
    clearDate: "Xóa bộ lọc ngày",
    allStatuses: "Tất cả trạng thái",
    document: "Tài liệu",
    status: "Trạng thái",
    languages: "Ngôn ngữ",
    date: "Ngày",
    actions: "Thao tác",
    sourceFile: "Tệp gốc",
    translatedFile: "Tệp dịch",
    viewDetails: "Xem chi tiết",
    loading: "Đang tải lịch sử dịch...",
    empty: "Không tìm thấy tài liệu phù hợp.",
    loadError: "Không thể tải lịch sử dịch. Vui lòng thử lại.",
    downloadError: "Không thể tải tệp. Vui lòng thử lại.",
    notReady: "Tệp dịch chưa sẵn sàng",
    page: "Trang",
    detailsTitle: "Chi tiết bản dịch",
    detailsDescription: "Thông tin cấu hình và tiến trình của tác vụ dịch.",
    name: "Tên tài liệu",
    sourceLanguage: "Ngôn ngữ gốc",
    targetLanguage: "Dịch sang",
    startedAt: "Bắt đầu",
    completedAt: "Hoàn thành",
    options: "Tùy chọn nâng cao",
    translateImages: "Dịch hình ảnh",
    keepSource: "Giữ văn bản gốc",
    glossaries: "Bộ thuật ngữ sử dụng",
    noGlossaries: "Không sử dụng bộ thuật ngữ",
    loadingGlossaries: "Đang tải bộ thuật ngữ...",
    enabled: "Bật",
    disabled: "Tắt",
    unknown: "Chưa có dữ liệu",
    close: "Đóng",
    cancel: "Hủy",
    cancelling: "Đang hủy",
    cancelError: "Không thể hủy bản dịch. Vui lòng thử lại.",
    statuses: {
      pending: "Chờ xử lý",
      translating: "Đang xử lý",
      completed: "Hoàn thành",
      failed: "Thất bại",
      cancelled: "Đã hủy",
    },
  },
  en: {
    title: "Translation history",
    description: "Track status and access the source and translated files for every task.",
    refresh: "Refresh",
    searchPlaceholder: "Search by document name",
    dateRange: "Date range",
    dateFrom: "From",
    dateTo: "To",
    clearDate: "Clear date filter",
    allStatuses: "All statuses",
    document: "Document",
    status: "Status",
    languages: "Languages",
    date: "Date",
    actions: "Actions",
    sourceFile: "Source file",
    translatedFile: "Translated file",
    viewDetails: "View details",
    loading: "Loading translation history...",
    empty: "No matching documents found.",
    loadError: "Translation history could not be loaded. Please try again.",
    downloadError: "The file could not be downloaded. Please try again.",
    notReady: "The translated file is not ready",
    page: "Page",
    detailsTitle: "Translation details",
    detailsDescription: "Configuration and progress information for this translation task.",
    name: "Document name",
    sourceLanguage: "Source language",
    targetLanguage: "Translate to",
    startedAt: "Started",
    completedAt: "Completed",
    options: "Advanced options",
    translateImages: "Translate images",
    keepSource: "Keep source text",
    glossaries: "Glossaries used",
    noGlossaries: "No glossary used",
    loadingGlossaries: "Loading glossaries...",
    enabled: "On",
    disabled: "Off",
    unknown: "No data",
    close: "Close",
    cancel: "Cancel",
    cancelling: "Cancelling",
    cancelError: "The translation could not be cancelled. Please try again.",
    statuses: {
      pending: "Pending",
      translating: "Processing",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled",
    },
  },
  ja: {
    title: "翻訳履歴",
    description: "すべてのタスクの状態を確認し、原文と翻訳済みファイルにアクセスできます。",
    refresh: "更新",
    searchPlaceholder: "文書名で検索",
    dateRange: "期間",
    dateFrom: "開始日",
    dateTo: "終了日",
    clearDate: "日付フィルターを解除",
    allStatuses: "すべての状態",
    document: "文書",
    status: "状態",
    languages: "言語",
    date: "日付",
    actions: "操作",
    sourceFile: "原文ファイル",
    translatedFile: "翻訳ファイル",
    viewDetails: "詳細を見る",
    loading: "翻訳履歴を読み込んでいます...",
    empty: "該当する文書がありません。",
    loadError: "翻訳履歴を読み込めませんでした。もう一度お試しください。",
    downloadError: "ファイルをダウンロードできませんでした。もう一度お試しください。",
    notReady: "翻訳ファイルはまだ準備できていません",
    page: "ページ",
    detailsTitle: "翻訳の詳細",
    detailsDescription: "翻訳タスクの設定と進捗情報です。",
    name: "文書名",
    sourceLanguage: "原文言語",
    targetLanguage: "翻訳先",
    startedAt: "開始",
    completedAt: "完了",
    options: "高度なオプション",
    translateImages: "画像を翻訳",
    keepSource: "原文を保持",
    glossaries: "使用した用語集",
    noGlossaries: "用語集を使用していません",
    loadingGlossaries: "用語集を読み込んでいます...",
    enabled: "オン",
    disabled: "オフ",
    unknown: "データなし",
    close: "閉じる",
    cancel: "キャンセル",
    cancelling: "キャンセル中",
    cancelError: "翻訳をキャンセルできませんでした。もう一度お試しください。",
    statuses: {
      pending: "待機中",
      translating: "処理中",
      completed: "完了",
      failed: "失敗",
      cancelled: "キャンセル済み",
    },
  },
} as const;

function isHistoryLocale(locale: string): locale is HistoryLocale {
  return locale === "en" || locale === "vi" || locale === "ja";
}

function getDocumentName(job: HistoryJob) {
  return job.sourceDocumentName || job.sourceDocument || job.id;
}

function getStatusClassName(status: StatusEnum) {
  if (status === "completed") return "bg-[#e8f8ef] text-[#087443]";
  if (status === "translating") return "bg-[#fff5df] text-[#b54708]";
  if (status === "pending") return "bg-[#eef4ff] text-[#3538cd]";
  if (status === "failed") return "bg-[#fff0ee] text-[#b42318]";

  return "bg-[#f0eff3] text-[#5d5967]";
}

function clampProgress(progress: number | undefined) {
  if (!Number.isFinite(progress)) return 0;

  return Math.min(100, Math.max(0, Math.round(progress ?? 0)));
}

function getStatusLabel(job: HistoryJob, copy: (typeof historyCopy)[HistoryLocale]) {
  if (job.status === "pending" || job.status === "translating") {
    return copy.statuses[job.status] + " (" + clampProgress(job.progress) + "%)";
  }

  return copy.statuses[job.status];
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) return "";
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";

  return (size / (1024 * 1024)).toFixed(1) + " MB";
}

function getDocumentSize(job: HistoryJob) {
  return formatFileSize(job.sourceDocumentSize || job.sourceSize || job.fileSize);
}

function localeTag(locale: HistoryLocale) {
  if (locale === "vi") return "vi-VN";
  if (locale === "ja") return "ja-JP";

  return "en-GB";
}

function formatDateTime(value: string | undefined, locale: HistoryLocale, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateInput(value: string, locale: HistoryLocale) {
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function documentCountLabel(count: number, locale: HistoryLocale) {
  if (locale === "vi") return count + " tài liệu";
  if (locale === "ja") return count + " 件";

  return count + " documents";
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HistoryView() {
  const rawLocale = useLocale();
  const locale = isHistoryLocale(rawLocale) ? rawLocale : "en";
  const copy = historyCopy[locale];
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const [isStatusFilterReady, setIsStatusFilterReady] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadKey, setDownloadKey] = useState<string | null>(null);
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);

  useEffect(() => {
    const requestedStatus = new URLSearchParams(window.location.search).get("status");
    if (requestedStatus === "processing") setStatusFilter("processing");
    setIsStatusFilterReady(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setLoadError("");
    }

    try {
      const sharedParams = {
        sort: "startedAt:desc",
        search: debouncedSearch || undefined,
        startedFrom: dateFrom ? new Date(dateFrom + "T00:00:00").toISOString() : undefined,
        startedTo: dateTo ? new Date(dateTo + "T23:59:59.999").toISOString() : undefined,
      };

      if (statusFilter === "processing") {
        const fetchAllByStatus = async (status: "pending" | "translating") => {
          const firstPage = await TranslationService.getTranslationHistory({
            ...sharedParams,
            page: 1,
            size: 100,
            status,
          });
          const remainingPages = await Promise.all(
            Array.from({length: Math.max(0, firstPage.pages - 1)}, (_, index) => (
              TranslationService.getTranslationHistory({
                ...sharedParams,
                page: index + 2,
                size: 100,
                status,
              })
            )),
          );

          return [firstPage, ...remainingPages].flatMap((response) => response.items || []) as HistoryJob[];
        };
        const [pendingJobs, translatingJobs] = await Promise.all([
          fetchAllByStatus("pending"),
          fetchAllByStatus("translating"),
        ]);
        const processingJobs = Array.from(
          new Map([...pendingJobs, ...translatingJobs].map((job) => [job.id, job])).values(),
        ).sort((currentJob, nextJob) => (
          new Date(nextJob.startedAt).getTime() - new Date(currentJob.startedAt).getTime()
        ));
        const processingPages = Math.max(1, Math.ceil(processingJobs.length / PAGE_SIZE));
        const currentPage = Math.min(page, processingPages);
        const startIndex = (currentPage - 1) * PAGE_SIZE;

        if (currentPage !== page) setPage(currentPage);
        setJobs(processingJobs.slice(startIndex, startIndex + PAGE_SIZE));
        setTotal(processingJobs.length);
        setTotalPages(processingPages);
      } else {
        const response = await TranslationService.getTranslationHistory({
          ...sharedParams,
          page,
          size: PAGE_SIZE,
          status: statusFilter === "all" ? undefined : statusFilter,
        });

        setJobs((response.items || []) as HistoryJob[]);
        setTotal(response.total || 0);
        setTotalPages(Math.max(1, response.pages || 1));
      }
    } catch (error) {
      console.error("Failed to load translation history", error);
      if (!silent) {
        setJobs([]);
        setTotal(0);
        setTotalPages(1);
        setLoadError(copy.loadError);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [copy.loadError, dateFrom, dateTo, debouncedSearch, page, refreshVersion, statusFilter]);

  useEffect(() => {
    if (!isStatusFilterReady) return;
    void fetchHistory();
  }, [fetchHistory, isStatusFilterReady]);

  useEffect(() => {
    if (!jobs.some((job) => job.status === "pending" || job.status === "translating")) return;

    const interval = window.setInterval(() => {
      void fetchHistory(true);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [fetchHistory, jobs]);

  const dateRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return copy.dateRange;
    const fromLabel = dateFrom ? formatDateInput(dateFrom, locale) : "...";
    const toLabel = dateTo ? formatDateInput(dateTo, locale) : "...";

    return fromLabel + " - " + toLabel;
  }, [copy.dateRange, dateFrom, dateTo, locale]);
  const statusFilterLabel = statusFilter === "all"
    ? copy.allStatuses
    : statusFilter === "processing"
      ? copy.statuses.translating
      : copy.statuses[statusFilter];

  const handleDownloadOriginal = async (job: HistoryJob) => {
    const actionKey = "source:" + job.id;
    setDownloadKey(actionKey);
    setDownloadError("");

    try {
      const blob = await TranslationService.downloadOriginalDocument(job.sourceDocument || job.id);
      triggerBlobDownload(blob, getDocumentName(job));
    } catch (error) {
      console.error("Failed to download original document", error);
      setDownloadError(copy.downloadError);
    } finally {
      setDownloadKey(null);
    }
  };

  const handleDownloadTranslated = async (job: HistoryJob) => {
    if (job.status !== "completed") return;
    const actionKey = "target:" + job.id;
    setDownloadKey(actionKey);
    setDownloadError("");

    try {
      const blob = await TranslationService.downloadTranslatedDocument(job.id);
      triggerBlobDownload(blob, getTranslatedFileName(getDocumentName(job), job.targetLanguage));
    } catch (error) {
      console.error("Failed to download translated document", error);
      setDownloadError(copy.downloadError);
    } finally {
      setDownloadKey(null);
    }
  };

  const handleCancelTranslation = async (job: HistoryJob) => {
    if (job.status !== "pending" && job.status !== "translating") return;

    setCancelJobId(job.id);
    setDownloadError("");

    try {
      await TranslationService.cancelTranslation(job.id);
      setJobs((currentJobs) => currentJobs.map((item) => (
        item.id === job.id ? {...item, status: "cancelled" as const} : item
      )));
      setSelectedJob((currentJob) => (
        currentJob?.id === job.id ? {...currentJob, status: "cancelled" as const} : currentJob
      ));
      await fetchHistory(true);
    } catch (error) {
      console.error("Failed to cancel translation", error);
      setDownloadError(copy.cancelError);
    } finally {
      setCancelJobId(null);
    }
  };

  const setDateFilter = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  };

  return (
    <div className="login-shell relative isolate flex min-h-dvh flex-col overflow-x-hidden text-[#1f2537]">
      <FileFormatBadgeBackground />
      <DashboardHeader activeNav="history" localePath="dashboard/history" />

      <main
        className="dashboard-page-body relative z-10 mx-auto w-full max-w-[1540px] flex-1 px-4 pb-12 pt-8 sm:px-8 lg:px-10 lg:pt-10"
        data-dashboard-page="history"
      >
        <section aria-labelledby="history-title">
          <div className="flex items-start gap-5">
            <div>
              <h1 id="history-title" className="text-[30px] font-bold leading-tight text-[#21175c]">
                {copy.title}
              </h1>
              <p className="mt-1.5 max-w-[720px] text-[13px] leading-5 text-[#676170]">{copy.description}</p>
            </div>
          </div>

          <div className="mt-9 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block w-full lg:max-w-[470px]">
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-[#77717f]" />
              <input
                className="h-10 w-full rounded-[7px] border border-[#d8d2e1] bg-white/82 pl-10 pr-9 text-[13px] text-[#21175c] outline-none transition focus:border-[#6750a4] focus:ring-2 focus:ring-[#6750a4]/15"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                type="search"
                value={search}
              />
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex h-10 min-w-0 items-center justify-between gap-3 rounded-[7px] border border-[#d8d2e1] bg-white/82 px-3.5 text-[12px] font-semibold text-[#302a3a] transition-colors hover:border-[#6750a4] sm:min-w-[230px]"
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <CalendarDays aria-hidden="true" className="size-[17px] shrink-0 text-[#5e5870]" />
                    <span className="truncate">{dateRangeLabel}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-[#77717f]" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[310px] rounded-[7px] border-[#d8d2e1] bg-white p-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[11px] font-semibold text-[#4e4858]">
                    {copy.dateFrom}
                    <input
                      className="mt-1.5 h-9 w-full rounded-[6px] border border-[#d8d2e1] px-2 text-[11px] outline-none focus:border-[#6750a4]"
                      max={dateTo || undefined}
                      onChange={(event) => setDateFilter(setDateFrom, event.target.value)}
                      type="date"
                      value={dateFrom}
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-[#4e4858]">
                    {copy.dateTo}
                    <input
                      className="mt-1.5 h-9 w-full rounded-[6px] border border-[#d8d2e1] px-2 text-[11px] outline-none focus:border-[#6750a4]"
                      min={dateFrom || undefined}
                      onChange={(event) => setDateFilter(setDateTo, event.target.value)}
                      type="date"
                      value={dateTo}
                    />
                  </label>
                </div>
                {dateFrom || dateTo ? (
                  <button
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#d5530d] hover:text-[#21175c]"
                    onClick={() => {
                      setPage(1);
                      setDateFrom("");
                      setDateTo("");
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                    {copy.clearDate}
                  </button>
                ) : null}
              </PopoverContent>
            </Popover>

            <Select
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as HistoryStatusFilter);
              }}
              value={statusFilter}
            >
              <SelectTrigger className="h-10 w-full rounded-[7px] border-[#d8d2e1] bg-white/82 px-3.5 text-[12px] font-semibold text-[#302a3a] shadow-none sm:w-[190px]">
                <span className="flex items-center gap-2">
                  <Filter aria-hidden="true" className="size-[16px] text-[#5e5870]" />
                  <span>{statusFilterLabel}</span>
                </span>
              </SelectTrigger>
              <SelectContent className="border-[#d8d2e1] bg-white">
                <SelectItem value="all">{copy.allStatuses}</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "processing" ? copy.statuses.translating : copy.statuses[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              aria-label={copy.refresh}
              className="flex size-10 shrink-0 items-center justify-center rounded-[7px] border border-[#d8d2e1] bg-white/80 text-[#21175c] shadow-sm transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-wait disabled:opacity-55"
              disabled={isLoading}
              onClick={() => setRefreshVersion((value) => value + 1)}
              title={copy.refresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" className={"size-[18px] " + (isLoading ? "animate-spin" : "")} />
            </button>

            <p className="text-[12px] font-medium text-[#676170] lg:ml-auto">{documentCountLabel(total, locale)}</p>
          </div>

          {loadError || downloadError ? (
            <div className="mt-4 rounded-[6px] border border-[#ffc9c2] bg-[#fff3f1] px-4 py-3 text-[11px] font-medium text-[#b42318]" role="alert">
              {downloadError || loadError}
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-[8px] border border-[#ddd7e7] bg-white/78 shadow-[0_16px_45px_rgba(33,23,92,0.07)] backdrop-blur-xl">
            <div className="list-table-viewport">
              <table className="w-full min-w-[1130px] table-fixed border-collapse">
                <thead className="bg-[#f7f5f9]">
                  <tr className="h-12 bg-[#f7f5f9] text-[11px] font-bold uppercase text-[#6d6674]">
                    <th className="w-[270px] px-8 text-left">{copy.document}</th>
                    <th className="w-[110px] px-2 text-center">{copy.status}</th>
                    <th className="w-[125px] px-2 text-center">{copy.sourceLanguage}</th>
                    <th className="w-[125px] px-2 text-center">{copy.targetLanguage}</th>
                    <th className="w-[120px] px-2 text-center">{copy.date}</th>
                    <th className="w-[300px] px-0 text-center">{copy.actions}</th>
                    <th className="sticky right-0 z-[2] w-[80px] bg-inherit px-1 text-center">
                      <span className="sr-only">{copy.cancel}</span>
                    </th>
                  </tr>
                </thead>
                <tbody aria-busy={isLoading}>
                  {isLoading ? (
                    Array.from({length: 5}, (_, index) => (
                      <tr aria-hidden="true" className="history-record-row bg-[#fffdfc]" key={index}>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3.5">
                            <Skeleton className="size-10 shrink-0 rounded-[6px]" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <Skeleton className="h-3 w-3/5" />
                              <Skeleton className="h-2.5 w-16" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4"><Skeleton className="mx-auto h-7 w-24 rounded-full" /></td>
                        <td className="px-4 py-4"><Skeleton className="mx-auto h-4 w-24" /></td>
                        <td className="px-4 py-4"><Skeleton className="mx-auto h-4 w-24" /></td>
                        <td className="px-4 py-4"><Skeleton className="mx-auto h-3 w-28" /></td>
                        <td className="px-0 py-4">
                          <div className="mx-auto grid w-[300px] grid-cols-[124px_124px_36px] gap-2">
                            <Skeleton className="h-9 w-[124px] rounded-[6px]" />
                            <Skeleton className="h-9 w-[124px] rounded-[6px]" />
                            <Skeleton className="size-9 rounded-[6px]" />
                          </div>
                        </td>
                        <td className="sticky right-0 z-[1] bg-inherit px-1 py-4">
                          <Skeleton className="mx-auto h-9 w-[72px] rounded-[6px] opacity-0" />
                        </td>
                      </tr>
                    ))
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td className="content-reveal h-[260px] text-center text-[12px] font-medium text-[#676170]" colSpan={7}>
                        <FileText aria-hidden="true" className="mx-auto mb-3 size-7 text-[#a49dab]" />
                        {copy.empty}
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => {
                      const documentName = getDocumentName(job);
                      const documentSize = getDocumentSize(job);
                      const sourceActionKey = "source:" + job.id;
                      const targetActionKey = "target:" + job.id;
                      const isTranslatedReady = job.status === "completed";
                      const canCancel = job.status === "translating";

                      return (
                        <tr
                          aria-label={copy.viewDetails + ": " + documentName}
                          className="history-record-row group content-reveal cursor-pointer bg-[#fffdfc] transition-colors hover:bg-[#fff7f2] focus-visible:bg-[#fff7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f06317]/60"
                          key={job.id}
                          onClick={() => {
                            setDownloadError("");
                            setSelectedJob(job);
                          }}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                            event.preventDefault();
                            setDownloadError("");
                            setSelectedJob(job);
                          }}
                          tabIndex={0}
                        >
                          <td className="px-8 py-4">
                            <div className="flex min-w-0 items-center gap-3.5">
                              <FileTypeTile className="size-10 rounded-[6px]" fileName={documentName} />
                              <div className="min-w-0">
                                <p className="max-w-[410px] truncate text-[14px] font-bold text-[#21175c]" title={documentName}>
                                  {documentName}
                                </p>
                                {documentSize ? <p className="mt-1 text-[12px] text-[#77717f]">{documentSize}</p> : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={"inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold " + getStatusClassName(job.status)}>
                              {getStatusLabel(job, copy)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center text-[13px]">
                            <LanguageDisplay className="justify-center" language={job.sourceLanguage} locale={locale} nameClassName="font-semibold text-[#302a3a]" />
                          </td>
                          <td className="px-4 py-4 text-center text-[13px]">
                            <LanguageDisplay className="justify-center" language={job.targetLanguage} locale={locale} nameClassName="font-semibold text-[#302a3a]" />
                          </td>
                          <td className="px-4 py-4 text-center text-[12px] font-medium text-[#686270]">
                            {formatDateTime(job.startedAt, locale, copy.unknown)}
                          </td>
                          <td className="px-0 py-4">
                            <div className="mx-auto grid w-[300px] grid-cols-[124px_124px_36px] items-center gap-2" onClick={(event) => event.stopPropagation()}>
                              <button
                                className="inline-flex h-9 w-[124px] items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border border-[#d7d0e0] bg-white px-2 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#6750a4] hover:bg-[#f8f5ff] disabled:cursor-wait disabled:opacity-55"
                                disabled={downloadKey !== null}
                                onClick={() => void handleDownloadOriginal(job)}
                                type="button"
                              >
                                {downloadKey === sourceActionKey ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
                                {copy.sourceFile}
                              </button>
                              <button
                                className="inline-flex h-9 w-[124px] items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border border-[#d7d0e0] bg-white px-2 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#6750a4] hover:bg-[#f8f5ff] disabled:cursor-not-allowed disabled:bg-[#f5f3f7] disabled:text-[#a29ca8]"
                                disabled={!isTranslatedReady || downloadKey !== null}
                                onClick={() => void handleDownloadTranslated(job)}
                                title={isTranslatedReady ? copy.translatedFile : copy.notReady}
                                type="button"
                              >
                                {downloadKey === targetActionKey ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
                                {copy.translatedFile}
                              </button>
                              <button
                                aria-label={copy.viewDetails + ": " + documentName}
                                className="flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-[#d7d0e0] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                                onClick={() => {
                                  setDownloadError("");
                                  setSelectedJob(job);
                                }}
                                title={copy.viewDetails}
                                type="button"
                              >
                                <Info aria-hidden="true" className="size-[17px]" />
                              </button>
                            </div>
                          </td>
                          <td className="sticky right-0 z-[1] bg-inherit px-1 py-4 transition-colors">
                            <button
                              aria-hidden={!canCancel}
                              className={"mx-auto inline-flex h-9 w-[72px] items-center justify-center gap-1.5 rounded-[6px] border border-[#f4aaa2] bg-white px-2 text-[11px] font-bold text-[#b42318] transition-all hover:bg-[#fff1ef] " + (canCancel ? (cancelJobId !== null ? "cursor-wait opacity-55" : "opacity-100") : "pointer-events-none opacity-0")}
                              disabled={!canCancel || cancelJobId !== null}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCancelTranslation(job);
                              }}
                              tabIndex={canCancel ? 0 : -1}
                              type="button"
                            >
                              {cancelJobId === job.id ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <X aria-hidden="true" className="size-4" />}
                              {cancelJobId === job.id ? copy.cancelling : copy.cancel}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 ? (
            <nav aria-label={copy.page} className="mt-5 flex items-center justify-center gap-3">
              <button
                aria-label={copy.page + " " + Math.max(1, page - 1)}
                className="flex size-9 items-center justify-center rounded-[6px] border border-[#d7d0e0] bg-white/80 text-[#21175c] transition-colors hover:border-[#6750a4] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <span className="min-w-[86px] text-center text-[11px] font-semibold text-[#4e4858]">
                {copy.page} {page} / {totalPages}
              </span>
              <button
                aria-label={copy.page + " " + Math.min(totalPages, page + 1)}
                className="flex size-9 items-center justify-center rounded-[6px] border border-[#d7d0e0] bg-white/80 text-[#21175c] transition-colors hover:border-[#6750a4] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </nav>
          ) : null}
        </section>
      </main>
      <DashboardFooter />

      <TranslationDetailDialog
        job={selectedJob}
        locale={locale}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      />
    </div>
  );
}
