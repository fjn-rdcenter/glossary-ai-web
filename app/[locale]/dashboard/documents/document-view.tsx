"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {useLocale} from "next-intl";
import {useCallback, useEffect, useMemo, useState} from "react";
import {DocumentService} from "@/api";
import {FileTypeTile} from "@/components/file-type-tile";
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
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Skeleton} from "@/components/ui/skeleton";
import type {SourceDocumentResponse} from "@/lib/types";
import {DashboardFooter, DashboardHeader, FileFormatBadgeBackground} from "../dashboard-shell";

type DocumentLocale = "en" | "vi" | "ja";

const PAGE_SIZE = 10;

const documentCopy = {
  vi: {
    title: "Tài liệu",
    description: "Quản lý các tệp nguồn đã tải lên và theo dõi mức độ sử dụng của từng tài liệu.",
    refresh: "Làm mới",
    searchPlaceholder: "Tìm theo tên tài liệu",
    dateRange: "Ngày tải lên",
    dateFrom: "Từ ngày",
    dateTo: "Đến ngày",
    clearDate: "Xóa bộ lọc ngày",
    name: "Tên",
    uploadedAt: "Ngày tải lên",
    size: "Kích thước",
    usageCount: "Số lần sử dụng",
    actions: "Thao tác",
    download: "Tải tệp",
    delete: "Xóa tệp",
    loading: "Đang tải danh sách tài liệu...",
    empty: "Không tìm thấy tài liệu phù hợp.",
    loadError: "Không thể tải danh sách tài liệu. Vui lòng thử lại.",
    downloadError: "Không thể tải tệp. Vui lòng thử lại.",
    deleteError: "Không thể xóa tài liệu. Vui lòng thử lại.",
    deleteTitle: "Xóa tài liệu?",
    deleteDescription: "Thao tác này không thể hoàn tác. Tệp nguồn sẽ bị xóa khỏi hệ thống.",
    deleteConfirm: "Xóa tài liệu",
    deleting: "Đang xóa",
    cancel: "Hủy",
    page: "Trang",
    unknown: "Chưa có dữ liệu",
  },
  en: {
    title: "Documents",
    description: "Manage uploaded source files and track how often each document is used.",
    refresh: "Refresh",
    searchPlaceholder: "Search by document name",
    dateRange: "Upload date",
    dateFrom: "From",
    dateTo: "To",
    clearDate: "Clear date filter",
    name: "Name",
    uploadedAt: "Uploaded date",
    size: "Size",
    usageCount: "Usage count",
    actions: "Actions",
    download: "Download",
    delete: "Delete",
    loading: "Loading documents...",
    empty: "No matching documents found.",
    loadError: "Documents could not be loaded. Please try again.",
    downloadError: "The file could not be downloaded. Please try again.",
    deleteError: "The document could not be deleted. Please try again.",
    deleteTitle: "Delete document?",
    deleteDescription: "This action cannot be undone. The source file will be removed from the system.",
    deleteConfirm: "Delete document",
    deleting: "Deleting",
    cancel: "Cancel",
    page: "Page",
    unknown: "No data",
  },
  ja: {
    title: "ドキュメント",
    description: "アップロード済みのソースファイルと各ドキュメントの利用状況を管理します。",
    refresh: "更新",
    searchPlaceholder: "ファイル名で検索",
    dateRange: "アップロード期間",
    dateFrom: "開始日",
    dateTo: "終了日",
    clearDate: "日付フィルターを解除",
    name: "名前",
    uploadedAt: "アップロード日時",
    size: "サイズ",
    usageCount: "利用回数",
    actions: "操作",
    download: "ダウンロード",
    delete: "削除",
    loading: "ドキュメントを読み込んでいます...",
    empty: "該当するドキュメントはありません。",
    loadError: "ドキュメントを読み込めませんでした。もう一度お試しください。",
    downloadError: "ファイルをダウンロードできませんでした。もう一度お試しください。",
    deleteError: "ドキュメントを削除できませんでした。もう一度お試しください。",
    deleteTitle: "ドキュメントを削除しますか？",
    deleteDescription: "この操作は取り消せません。ソースファイルはシステムから削除されます。",
    deleteConfirm: "ドキュメントを削除",
    deleting: "削除中",
    cancel: "キャンセル",
    page: "ページ",
    unknown: "データなし",
  },
} as const;

function isDocumentLocale(locale: string): locale is DocumentLocale {
  return locale === "en" || locale === "vi" || locale === "ja";
}

function localeTag(locale: DocumentLocale) {
  if (locale === "vi") return "vi-VN";
  if (locale === "ja") return "ja-JP";

  return "en-GB";
}

function formatDateTime(value: string, locale: DocumentLocale, fallback: string) {
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

function formatDateInput(value: string, locale: DocumentLocale) {
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatFileSize(size: number, locale: DocumentLocale) {
  if (!Number.isFinite(size) || size < 0) return "-";
  if (size < 1024) return new Intl.NumberFormat(localeTag(locale)).format(size) + " B";

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return new Intl.NumberFormat(localeTag(locale), {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value) + " " + units[unitIndex];
}

function documentCountLabel(count: number, locale: DocumentLocale) {
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

export function DocumentView() {
  const rawLocale = useLocale();
  const locale = isDocumentLocale(rawLocale) ? rawLocale : "en";
  const copy = documentCopy[locale];
  const [items, setItems] = useState<SourceDocumentResponse[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SourceDocumentResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await DocumentService.getSourceDocuments(
        page,
        PAGE_SIZE,
        "uploadedAt",
        "desc",
        debouncedSearch || undefined,
        dateFrom ? new Date(dateFrom + "T00:00:00").toISOString() : undefined,
        dateTo ? new Date(dateTo + "T23:59:59.999").toISOString() : undefined,
      );
      const pages = Math.max(1, response.pages || 1);

      if (page > pages) {
        setPage(pages);
        return;
      }

      setItems(response.items || []);
      setTotal(response.total || 0);
      setTotalPages(pages);
    } catch (error) {
      console.error("Failed to load source documents", error);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setLoadError(copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, dateFrom, dateTo, debouncedSearch, page, refreshVersion]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const dateRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return copy.dateRange;
    const fromLabel = dateFrom ? formatDateInput(dateFrom, locale) : "...";
    const toLabel = dateTo ? formatDateInput(dateTo, locale) : "...";

    return fromLabel + " - " + toLabel;
  }, [copy.dateRange, dateFrom, dateTo, locale]);

  const handleDownload = async (item: SourceDocumentResponse) => {
    setDownloadId(item.id);
    setActionError("");

    try {
      const blob = await DocumentService.downloadDocument(item.id);
      triggerBlobDownload(blob, item.name);
    } catch (error) {
      console.error("Failed to download source document", error);
      setActionError(copy.downloadError);
    } finally {
      setDownloadId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deletingId) return;

    setDeletingId(deleteTarget.id);
    setActionError("");

    try {
      await DocumentService.deleteDocument(deleteTarget.id);
      setDeleteTarget(null);

      if (items.length === 1 && page > 1) {
        setPage((value) => Math.max(1, value - 1));
      } else {
        setRefreshVersion((value) => value + 1);
      }
    } catch (error) {
      console.error("Failed to delete source document", error);
      setActionError(copy.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  const setDateFilter = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  };

  return (
    <div className="login-shell relative isolate flex min-h-dvh flex-col overflow-x-hidden text-[#1f2537]">
      <FileFormatBadgeBackground />
      <DashboardHeader localePath="dashboard/documents" />

      <main
        className="dashboard-page-body relative z-10 mx-auto w-full max-w-[1540px] flex-1 px-4 pb-12 pt-8 sm:px-8 lg:px-10 lg:pt-10"
        data-dashboard-page="documents"
      >
        <section aria-labelledby="documents-title">
          <div>
            <h1 id="documents-title" className="text-[30px] font-bold leading-tight text-[#21175c]">
              {copy.title}
            </h1>
            <p className="mt-1.5 max-w-[720px] text-[13px] leading-5 text-[#676170]">{copy.description}</p>
          </div>

          <div className="mt-9 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block w-full lg:max-w-[520px]">
              <span className="sr-only">{copy.searchPlaceholder}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-[#77717f]" />
              <input
                className="h-10 w-full rounded-[7px] border border-[#d8d2e1] bg-white/82 pl-10 pr-4 text-[13px] text-[#21175c] outline-none transition focus:border-[#6750a4] focus:ring-2 focus:ring-[#6750a4]/15"
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

          {loadError || actionError ? (
            <div className="mt-4 rounded-[6px] border border-[#ffc9c2] bg-[#fff3f1] px-4 py-3 text-[11px] font-medium text-[#b42318]" role="alert">
              {actionError || loadError}
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-[8px] border border-[#ddd7e7] bg-white/78 shadow-[0_16px_45px_rgba(33,23,92,0.07)] backdrop-blur-xl">
            <div className="list-table-viewport">
              <table className="w-full min-w-[1050px] table-fixed border-collapse">
                <thead className="bg-[#f7f5f9]">
                  <tr className="h-12 bg-[#f7f5f9] text-[11px] font-bold uppercase text-[#6d6674]">
                    <th className="w-[360px] px-8 text-left">{copy.name}</th>
                    <th className="w-[210px] px-4 text-center">{copy.uploadedAt}</th>
                    <th className="w-[140px] px-4 text-center">{copy.size}</th>
                    <th className="w-[150px] px-4 text-center">{copy.usageCount}</th>
                    <th className="w-[250px] px-4 text-center">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody aria-busy={isLoading}>
                  {isLoading ? (
                    Array.from({length: 6}, (_, index) => (
                      <tr aria-hidden="true" className="document-record-row bg-[#fffdfc]" key={index}>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3.5">
                            <Skeleton className="size-10 shrink-0 rounded-[6px]" />
                            <Skeleton className="h-3 w-3/5" />
                          </div>
                        </td>
                        <td className="px-4 py-4"><Skeleton className="mx-auto h-3 w-32" /></td>
                        <td className="px-4 py-4"><Skeleton className="mx-auto h-3 w-20" /></td>
                        <td className="px-4 py-4"><Skeleton className="mx-auto h-7 w-16 rounded-full" /></td>
                        <td className="px-4 py-4">
                          <div className="mx-auto grid w-[232px] grid-cols-2 gap-2">
                            <Skeleton className="h-9 rounded-[6px]" />
                            <Skeleton className="h-9 rounded-[6px]" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="content-reveal h-[300px] text-center text-[12px] font-medium text-[#676170]" colSpan={5}>
                        <FileText aria-hidden="true" className="mx-auto mb-3 size-7 text-[#a49dab]" />
                        {copy.empty}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr
                        className="document-record-row content-reveal bg-[#fffdfc] transition-colors hover:bg-[#fff7f2]"
                        key={item.id}
                      >
                        <td className="px-8 py-4">
                          <div className="flex min-w-0 items-center gap-3.5">
                            <FileTypeTile className="size-10 rounded-[6px]" fileName={item.name} />
                            <p className="max-w-[410px] truncate text-[14px] font-bold text-[#21175c]" title={item.name}>
                              {item.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-[12px] font-medium text-[#686270]">
                          {formatDateTime(item.uploadedAt, locale, copy.unknown)}
                        </td>
                        <td className="px-4 py-4 text-center text-[12px] font-semibold text-[#302a3a]">
                          {formatFileSize(item.size, locale)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-[#eef4ff] px-3 py-1.5 text-[11px] font-bold text-[#3538cd]">
                            {new Intl.NumberFormat(localeTag(locale)).format(item.usageCount)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="mx-auto grid w-[232px] grid-cols-2 gap-2">
                            <button
                              className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border border-[#d7d0e0] bg-white px-3 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#6750a4] hover:bg-[#f8f5ff] disabled:cursor-wait disabled:opacity-55"
                              disabled={downloadId !== null || deletingId !== null}
                              onClick={() => void handleDownload(item)}
                              type="button"
                            >
                              {downloadId === item.id ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
                              {copy.download}
                            </button>
                            <button
                              className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] border border-[#f4aaa2] bg-white px-3 text-[12px] font-bold text-[#b42318] transition-colors hover:bg-[#fff1ef] disabled:cursor-wait disabled:opacity-55"
                              disabled={downloadId !== null || deletingId !== null}
                              onClick={() => {
                                setActionError("");
                                setDeleteTarget(item);
                              }}
                              type="button"
                            >
                              <Trash2 aria-hidden="true" className="size-4" />
                              {copy.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
      >
        <AlertDialogContent className="rounded-[8px] border-[#d8d2e1] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#21175c]">{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteDescription}
              {deleteTarget ? (
                <strong className="mt-2 block break-all text-[#302a3a]">{deleteTarget.name}</strong>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#d92d20] text-white hover:bg-[#b42318]"
              disabled={Boolean(deletingId)}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deletingId ? <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="mr-2 size-4" />}
              {deletingId ? copy.deleting : copy.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
