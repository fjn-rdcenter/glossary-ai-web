"use client";

import {Download, LoaderCircle} from "lucide-react";
import {useEffect, useState, type ReactNode} from "react";
import {GlossaryService, TranslationService} from "@/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Skeleton} from "@/components/ui/skeleton";
import {Switch} from "@/components/ui/switch";
import {getTranslatedFileName} from "@/lib/translation-file-name";
import type {TranslationHistoryResponse} from "@/lib/types";
import {LanguageDisplay, type DisplayLocale} from "./language-display";

export type TranslationDetailJob = TranslationHistoryResponse & {
  keepSource?: boolean;
};

const detailCopy = {
  vi: {
    title: "Chi tiết bản dịch",
    description: "Thông tin cấu hình và tiến trình của tác vụ dịch.",
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
    unknown: "Chưa có dữ liệu",
    close: "Đóng",
    sourceFile: "Tệp gốc",
    translatedFile: "Tệp dịch",
    downloadError: "Không thể tải tệp. Vui lòng thử lại.",
    statuses: {
      pending: "Chờ xử lý",
      translating: "Đang xử lý",
      completed: "Hoàn thành",
      failed: "Thất bại",
      cancelled: "Đã hủy",
    },
  },
  en: {
    title: "Translation details",
    description: "Configuration and progress information for this translation task.",
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
    unknown: "No data",
    close: "Close",
    sourceFile: "Source file",
    translatedFile: "Translated file",
    downloadError: "The file could not be downloaded. Please try again.",
    statuses: {
      pending: "Pending",
      translating: "Processing",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled",
    },
  },
  ja: {
    title: "翻訳の詳細",
    description: "翻訳タスクの設定と進捗情報です。",
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
    unknown: "データなし",
    close: "閉じる",
    sourceFile: "原文ファイル",
    translatedFile: "翻訳ファイル",
    downloadError: "ファイルをダウンロードできませんでした。もう一度お試しください。",
    statuses: {
      pending: "待機中",
      translating: "処理中",
      completed: "完了",
      failed: "失敗",
      cancelled: "キャンセル済み",
    },
  },
} as const;

function getDocumentName(job: TranslationDetailJob) {
  return job.sourceDocumentName || job.sourceDocument || job.id;
}

function clampProgress(progress: number | undefined) {
  if (!Number.isFinite(progress)) return 0;

  return Math.min(100, Math.max(0, Math.round(progress ?? 0)));
}

function getStatusLabel(job: TranslationDetailJob, locale: DisplayLocale) {
  const copy = detailCopy[locale];

  if (job.status === "pending" || job.status === "translating") {
    return copy.statuses[job.status] + " (" + clampProgress(job.progress) + "%)";
  }

  return copy.statuses[job.status];
}

function getStatusClassName(status: TranslationDetailJob["status"]) {
  if (status === "completed") return "bg-[#e8f8ef] text-[#087443]";
  if (status === "translating") return "bg-[#fff5df] text-[#b54708]";
  if (status === "pending") return "bg-[#eef4ff] text-[#3538cd]";
  if (status === "failed") return "bg-[#fff0ee] text-[#b42318]";

  return "bg-[#f0eff3] text-[#5d5967]";
}

function localeTag(locale: DisplayLocale) {
  if (locale === "vi") return "vi-VN";
  if (locale === "ja") return "ja-JP";

  return "en-GB";
}

function formatDateTime(value: string | undefined, locale: DisplayLocale, fallback: string) {
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

function DetailValue({
  children,
  label,
  wide = false,
}: {
  children: ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <div className={"min-w-0 border-b border-[#ebe7f0] py-4 " + (wide ? "sm:col-span-2" : "")}>
      <dt className="text-[12px] font-semibold uppercase text-[#77717f]">{label}</dt>
      <dd className="mt-1.5 break-words text-[14px] font-semibold text-[#21175c]">{children}</dd>
    </div>
  );
}

function OptionSummary({label, value}: {label: string; value: boolean | undefined}) {
  return (
    <div className="flex min-w-0 items-center gap-3 py-3.5">
      <span className="min-w-0 flex-1 text-[14px] font-semibold text-[#21175c]">{label}</span>
      <Switch
        aria-label={label}
        checked={value === true}
        className="disabled:opacity-100 data-[state=checked]:bg-[#21175c] data-[state=unchecked]:bg-[#d8d3df]"
        disabled
      />
    </div>
  );
}

export function TranslationDetailDialog({
  job,
  locale,
  onOpenChange,
}: {
  job: TranslationDetailJob | null;
  locale: DisplayLocale;
  onOpenChange: (open: boolean) => void;
}) {
  const copy = detailCopy[locale];
  const [glossaryNames, setGlossaryNames] = useState<string[]>([]);
  const [isLoadingGlossaries, setIsLoadingGlossaries] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloadKey, setDownloadKey] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const glossaryIds = job?.glossaries || [];

    setGlossaryNames([]);
    setDownloadError("");
    if (glossaryIds.length === 0) {
      setIsLoadingGlossaries(false);
      return;
    }

    setIsLoadingGlossaries(true);
    void Promise.allSettled(glossaryIds.map((id) => GlossaryService.getGlossaryById(id))).then((results) => {
      if (!isCurrent) return;
      setGlossaryNames(
        results.map((result, index) => (result.status === "fulfilled" ? result.value.name : glossaryIds[index])),
      );
      setIsLoadingGlossaries(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [job]);

  const handleDownloadOriginal = async () => {
    if (!job) return;
    setDownloadKey("source");
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

  const handleDownloadTranslated = async () => {
    if (!job || job.status !== "completed") return;
    setDownloadKey("target");
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

  return (
    <Dialog onOpenChange={onOpenChange} open={job !== null}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[8px] border-[#d8d2e1] bg-white p-0 shadow-[0_28px_90px_rgba(33,23,92,0.22)] sm:max-w-[820px]"
        showCloseButton={false}
      >
        {job ? (
          <>
            <DialogHeader className="border-b border-[#e7e2eb] px-6 py-5 text-left">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <DialogTitle className="text-[22px] font-bold text-[#21175c]">{copy.title}</DialogTitle>
                  <DialogDescription className="mt-1 text-[12px] leading-5 text-[#716b79]">
                    {copy.description}
                  </DialogDescription>
                </div>
                <span className={"shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold " + getStatusClassName(job.status)}>
                  {getStatusLabel(job, locale)}
                </span>
              </div>
            </DialogHeader>

            <div className="px-6">
              <dl className="grid gap-x-8 sm:grid-cols-2">
                <DetailValue label={copy.name} wide>{getDocumentName(job)}</DetailValue>
                <DetailValue label={copy.sourceLanguage}>
                  <LanguageDisplay language={job.sourceLanguage} locale={locale} nameClassName="font-semibold" />
                </DetailValue>
                <DetailValue label={copy.targetLanguage}>
                  <LanguageDisplay language={job.targetLanguage} locale={locale} nameClassName="font-semibold" />
                </DetailValue>
                <DetailValue label={copy.startedAt}>{formatDateTime(job.startedAt, locale, copy.unknown)}</DetailValue>
                <DetailValue label={copy.completedAt}>{formatDateTime(job.completedAt, locale, copy.unknown)}</DetailValue>
              </dl>

              <section className="border-b border-[#ebe7f0] py-4">
                <h2 className="text-[13px] font-bold text-[#21175c]">{copy.options}</h2>
                <div className="mt-1 grid gap-x-8 sm:grid-cols-2">
                  <OptionSummary label={copy.translateImages} value={job.isTranslateImage} />
                  <OptionSummary label={copy.keepSource} value={job.keepSource} />
                </div>
              </section>

              <section className="py-5">
                <h2 className="text-[13px] font-bold text-[#21175c]">{copy.glossaries}</h2>
                {isLoadingGlossaries ? (
                  <div aria-label={copy.loadingGlossaries} className="mt-3 flex gap-2" role="status">
                    <Skeleton className="h-7 w-28 rounded-[5px]" />
                    <Skeleton className="h-7 w-36 rounded-[5px]" />
                  </div>
                ) : glossaryNames.length > 0 ? (
                  <div className="content-reveal mt-3 flex flex-wrap gap-2">
                    {glossaryNames.map((name, index) => (
                      <span className="rounded-[5px] border border-[#d7cffa] bg-[#f7f4ff] px-2.5 py-1.5 text-[11px] font-semibold text-[#4a378a]" key={name + index}>
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="content-reveal mt-3 text-[12px] text-[#716b79]">{copy.noGlossaries}</p>
                )}
              </section>
            </div>

            {downloadError ? (
              <p className="mx-6 rounded-[6px] border border-[#ffc9c2] bg-[#fff3f1] px-3 py-2.5 text-[12px] font-medium text-[#b42318]" role="alert">
                {downloadError}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#e7e2eb] bg-[#fbfafc] px-6 py-4">
              {job.status === "completed" ? (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-[#21175c] px-4 text-[12px] font-bold text-white transition-colors hover:bg-[#f06317] disabled:cursor-wait disabled:opacity-55"
                  disabled={downloadKey !== null}
                  onClick={() => void handleDownloadTranslated()}
                  type="button"
                >
                  {downloadKey === "target" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
                  {copy.translatedFile}
                </button>
              ) : null}
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#6750a4] bg-white px-4 text-[12px] font-bold text-[#30206f] transition-colors hover:bg-[#f7f4ff] disabled:cursor-wait disabled:opacity-55"
                disabled={downloadKey !== null}
                onClick={() => void handleDownloadOriginal()}
                type="button"
              >
                {downloadKey === "source" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Download aria-hidden="true" className="size-4" />}
                {copy.sourceFile}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-[6px] border border-[#d7d0e0] bg-white px-4 text-[12px] font-bold text-[#4e4858] transition-colors hover:border-[#6750a4]"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                {copy.close}
              </button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
