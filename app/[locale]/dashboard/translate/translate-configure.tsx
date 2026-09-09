"use client";

import {AnimatePresence, motion} from "framer-motion";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Construction,
  Download,
  Eye,
  FolderOpen,
  Info,
  Lightbulb,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import {useLocale} from "next-intl";
import {Fragment, type ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {useDropzone} from "react-dropzone";
import {DocumentService, GlossaryService, TranslationService} from "@/api";
import {FileTypeTile} from "@/components/file-type-tile";
import {Checkbox} from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Skeleton} from "@/components/ui/skeleton";
import {Switch} from "@/components/ui/switch";
import {SUPPORTED_LANGUAGES, type SupportedLanguageCode} from "@/lib/constants";
import {usePendingUploadStore} from "@/lib/pending-upload-store";
import {getTranslatedFileName} from "@/lib/translation-file-name";
import type {GlossaryResponse, SourceDocumentResponse, StatusEnum} from "@/lib/types";
import {formatBytes} from "@/lib/utils";
import {DashboardFooter, DashboardHeader, FileFormatBadgeBackground} from "../dashboard-shell";
import {
  GlossaryFormView,
  type GlossaryFormInitialValues,
} from "../glossaries/glossary-form-view";

const MAX_FILES = 5;
const GLOSSARIES_PER_PAGE = 4;
const UPLOADED_FILES_PER_PAGE = 8;

type TranslateLocale = "en" | "vi" | "ja";
type FileTranslationConfig = {
  keepSourceText: boolean;
  selectedGlossaryIds: Set<string>;
  sourceLanguage: SupportedLanguageCode;
  targetLanguage: SupportedLanguageCode;
  translateImages: boolean;
};

type WorkflowStep = "configure" | "processing" | "complete";
type TranslationRunStatus = StatusEnum | "uploading";
type TranslationRunState = {
  documentId?: string;
  errorMessage?: string;
  fileId: string;
  jobId?: string;
  progress: number;
  status: TranslationRunStatus;
  targetDocument?: string;
};

const createDefaultFileConfig = (): FileTranslationConfig => ({
  keepSourceText: false,
  selectedGlossaryIds: new Set(),
  sourceLanguage: "jp",
  targetLanguage: "vn",
  translateImages: false,
});


type TranslateCopy = {
  pageTitle: string;
  pageSubtitle: string;
  configure: string;
  process: string;
  inProgress: string;
  waiting: string;
  sourceFiles: string;
  addedFiles: string;
  dropTitle: string;
  dropActive: string;
  dropDescription: string;
  formats: string;
  addMoreFiles: string;
  uploadedFilesTitle: string;
  uploadedFilesDescription: string;
  searchUploadedFiles: string;
  loadingUploadedFiles: string;
  uploadedFilesEmpty: string;
  uploadedFilesError: string;
  alreadyAdded: string;
  addSelectedFiles: string;
  uploadedSelectionSummary: string;
  uploadedAt: string;
  usageCount: string;
  fileCountUnit: string;
  fileHint: string;
  fileLimit: string;
  removeFile: string;
  ready: string;
  configuration: string;
  configurationDescription: string;
  configureEachFile: string;
  configuringFile: string;
  selectFileToConfigure: string;
  source: string;
  target: string;
  swapLanguages: string;
  options: string;
  translateImages: string;
  translateImagesDescription: string;
  keepSource: string;
  keepSourceDescription: string;
  keepSourceDisabled: string;
  keepSourceHelp: string;
  infoHint: string;
  glossaries: string;
  selected: string;
  searchGlossary: string;
  loadingGlossaries: string;
  emptyGlossaries: string;
  glossaryError: string;
  terms: string;
  createGlossary: string;
  suggestGlossary: string;
  suggesting: string;
  startTranslation: string;
  previousPage: string;
  nextPage: string;
  page: string;
  of: string;
  noSuggestion: string;
  createTitle: string;
  createDescription: string;
  glossaryName: string;
  glossaryNamePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  cancel: string;
  create: string;
  creating: string;
  nameRequired: string;
  createError: string;
  leaveTitle: string;
  leaveDescription: string;
  stayOnPage: string;
  leavePage: string;
};

const translateCopy: Record<TranslateLocale, TranslateCopy> = {
  vi: {
    pageTitle: "Tạo bản dịch mới",
    pageSubtitle: "Thiết lập tài liệu, ngôn ngữ và bộ thuật ngữ cho bản dịch.",
    configure: "Cấu hình",
    process: "Xử lý",
    inProgress: "Đang thực hiện",
    waiting: "Chưa bắt đầu",
    sourceFiles: "Tệp nguồn",
    addedFiles: "Tệp đã thêm",
    dropTitle: "Thả tệp vào đây",
    dropActive: "Thả tệp để thêm vào bản dịch",
    dropDescription: "hoặc nhấn để chọn tệp",
    formats: "PDF, DOCX, PPTX, XLSX, HTML, MD, TXT, IMAGE",
    addMoreFiles: "Thêm tệp đã tải lên",
    uploadedFilesTitle: "Chọn tệp đã tải lên",
    uploadedFilesDescription: "Chọn lại tài liệu nguồn đã có trên hệ thống.",
    searchUploadedFiles: "Tìm kiếm tệp...",
    loadingUploadedFiles: "Đang tải danh sách tệp...",
    uploadedFilesEmpty: "Không tìm thấy tệp đã tải lên.",
    uploadedFilesError: "Không thể tải danh sách tệp.",
    alreadyAdded: "Đã thêm",
    addSelectedFiles: "Thêm tệp đã chọn",
    uploadedSelectionSummary: "{selected} / {available} tệp đã chọn",
    uploadedAt: "Đã tải lên",
    usageCount: "lần sử dụng",
    fileCountUnit: "tệp",
    fileHint: "Có thể thêm tối đa 5 tệp cho mỗi lần dịch.",
    fileLimit: "Đã đạt giới hạn 5 tệp.",
    removeFile: "Xóa tệp",
    ready: "Sẵn sàng",
    configuration: "Cấu hình bản dịch",
    configurationDescription: "Chọn cặp ngôn ngữ, tùy chọn xử lý và glossary phù hợp.",
    configureEachFile: "Mỗi tệp có một cấu hình dịch riêng.",
    configuringFile: "Đang cấu hình",
    selectFileToConfigure: "Chọn tệp cần cấu hình",
    source: "Gốc",
    target: "Dịch sang",
    swapLanguages: "Đảo ngôn ngữ gốc và ngôn ngữ dịch",
    options: "Tùy chọn nâng cao",
    translateImages: "Dịch hình ảnh",
    translateImagesDescription: "Nhận diện và dịch nội dung chữ trong hình ảnh.",
    keepSource: "Giữ văn bản gốc",
    keepSourceDescription: "Giữ nguyên văn bản gốc cạnh nội dung đã dịch.",
    keepSourceDisabled: "Chọn ít nhất một glossary để bật tùy chọn này.",
    keepSourceHelp: "Giữ nội dung nguồn bên cạnh phần đã dịch. Tùy chọn này khả dụng khi đã chọn ít nhất một bộ thuật ngữ.",
    infoHint: "Nhấn i để xem hướng dẫn và ví dụ.",
    glossaries: "Chọn bộ thuật ngữ",
    selected: "đã chọn",
    searchGlossary: "Tìm theo tên glossary...",
    loadingGlossaries: "Đang tải glossary...",
    emptyGlossaries: "Không tìm thấy glossary phù hợp.",
    glossaryError: "Không thể tải danh sách glossary.",
    terms: "thuật ngữ",
    createGlossary: "Tạo mới glossary",
    suggestGlossary: "Gợi ý Glossary",
    suggesting: "Đang gợi ý...",
    startTranslation: "Bắt đầu dịch",
    previousPage: "Trang trước",
    nextPage: "Trang sau",
    page: "Trang",
    of: "/",
    noSuggestion: "Không tìm thấy thuật ngữ gợi ý cho tệp này.",
    createTitle: "Tạo glossary mới",
    createDescription: "Glossary mới sẽ dùng cặp ngôn ngữ đang chọn.",
    glossaryName: "Tên glossary",
    glossaryNamePlaceholder: "Ví dụ: Thuật ngữ dự án",
    description: "Mô tả",
    descriptionPlaceholder: "Mô tả ngắn về phạm vi thuật ngữ",
    cancel: "Hủy",
    create: "Tạo glossary",
    creating: "Đang tạo...",
    nameRequired: "Vui lòng nhập tên glossary.",
    createError: "Không thể tạo glossary. Vui lòng thử lại.",
    leaveTitle: "Rời khỏi trang dịch?",
    leaveDescription: "Nếu rời trang, toàn bộ nội dung cấu hình hiện tại sẽ bị mất.",
    stayOnPage: "Ở lại",
    leavePage: "Rời trang",
  },
  en: {
    pageTitle: "Create a new translation",
    pageSubtitle: "Configure documents, languages, and glossaries for this translation.",
    configure: "Configure",
    process: "Process",
    inProgress: "In progress",
    waiting: "Not started",
    sourceFiles: "Source files",
    addedFiles: "Added files",
    dropTitle: "Drop files here",
    dropActive: "Drop files to add them",
    dropDescription: "or click to browse",
    formats: "PDF, DOCX, PPTX, XLSX, HTML, MD, TXT, IMAGE",
    addMoreFiles: "Add uploaded files",
    uploadedFilesTitle: "Select uploaded files",
    uploadedFilesDescription: "Reuse source documents already available in the system.",
    searchUploadedFiles: "Search files...",
    loadingUploadedFiles: "Loading uploaded files...",
    uploadedFilesEmpty: "No uploaded files found.",
    uploadedFilesError: "Unable to load uploaded files.",
    alreadyAdded: "Added",
    addSelectedFiles: "Add selected files",
    uploadedSelectionSummary: "{selected} / {available} files selected",
    uploadedAt: "Uploaded",
    usageCount: "uses",
    fileCountUnit: "files",
    fileHint: "You can add up to 5 files per translation.",
    fileLimit: "The 5-file limit has been reached.",
    removeFile: "Remove file",
    ready: "Ready",
    configuration: "Translation configuration",
    configurationDescription: "Choose languages, processing options, and relevant glossaries.",
    configureEachFile: "Each file has its own translation settings.",
    configuringFile: "Configuring",
    selectFileToConfigure: "Select a file to configure",
    source: "Source",
    target: "Translate to",
    swapLanguages: "Swap source and target languages",
    options: "Advanced options",
    translateImages: "Translate images",
    translateImagesDescription: "Detect and translate text contained in images.",
    keepSource: "Keep source text",
    keepSourceDescription: "Keep the source text alongside translated content.",
    keepSourceDisabled: "Select at least one glossary to enable this option.",
    keepSourceHelp: "Keep source content beside the translation. This option is available after selecting at least one glossary.",
    infoHint: "Select i to view guidance and examples.",
    glossaries: "Select glossaries",
    selected: "selected",
    searchGlossary: "Search glossaries...",
    loadingGlossaries: "Loading glossaries...",
    emptyGlossaries: "No matching glossaries found.",
    glossaryError: "Unable to load glossaries.",
    terms: "terms",
    createGlossary: "Create glossary",
    suggestGlossary: "Suggest Glossary",
    suggesting: "Suggesting...",
    startTranslation: "Start translation",
    previousPage: "Previous page",
    nextPage: "Next page",
    page: "Page",
    of: "/",
    noSuggestion: "No suggested terms were found for this file.",
    createTitle: "Create a new glossary",
    createDescription: "The new glossary will use the selected language pair.",
    glossaryName: "Glossary name",
    glossaryNamePlaceholder: "For example: Project terminology",
    description: "Description",
    descriptionPlaceholder: "Briefly describe the terminology scope",
    cancel: "Cancel",
    create: "Create glossary",
    creating: "Creating...",
    nameRequired: "Enter a glossary name.",
    createError: "Unable to create the glossary. Please try again.",
    leaveTitle: "Leave this translation?",
    leaveDescription: "Leaving this page will discard the current configuration.",
    stayOnPage: "Stay",
    leavePage: "Leave page",
  },
  ja: {
    pageTitle: "新しい翻訳を作成",
    pageSubtitle: "翻訳する文書、言語、用語集を設定します。",
    configure: "設定",
    process: "処理",
    inProgress: "実行中",
    waiting: "未開始",
    sourceFiles: "元ファイル",
    addedFiles: "追加済みファイル",
    dropTitle: "ファイルをドロップ",
    dropActive: "ドロップして追加",
    dropDescription: "またはクリックして選択",
    formats: "PDF、DOCX、PPTX、XLSX、HTML、MD、TXT、IMAGE",
    addMoreFiles: "アップロード済みファイルを追加",
    uploadedFilesTitle: "アップロード済みファイルを選択",
    uploadedFilesDescription: "システムに保存済みの原文ファイルを再利用できます。",
    searchUploadedFiles: "ファイルを検索...",
    loadingUploadedFiles: "ファイルを読み込んでいます...",
    uploadedFilesEmpty: "アップロード済みファイルが見つかりません。",
    uploadedFilesError: "ファイル一覧を読み込めませんでした。",
    alreadyAdded: "追加済み",
    addSelectedFiles: "選択したファイルを追加",
    uploadedSelectionSummary: "{selected} / {available} 件を選択",
    uploadedAt: "アップロード日",
    usageCount: "回使用",
    fileCountUnit: "ファイル",
    fileHint: "1回の翻訳につき最大5ファイルまで追加できます。",
    fileLimit: "5ファイルの上限に達しました。",
    removeFile: "ファイルを削除",
    ready: "準備完了",
    configuration: "翻訳設定",
    configurationDescription: "言語、処理オプション、用語集を選択します。",
    configureEachFile: "ファイルごとに個別の翻訳設定があります。",
    configuringFile: "設定中",
    selectFileToConfigure: "設定するファイルを選択",
    source: "原文",
    target: "翻訳先",
    swapLanguages: "原文と翻訳先の言語を入れ替える",
    options: "詳細オプション",
    translateImages: "画像を翻訳",
    translateImagesDescription: "画像内の文字を検出して翻訳します。",
    keepSource: "原文を保持",
    keepSourceDescription: "翻訳結果と一緒に原文を保持します。",
    keepSourceDisabled: "このオプションには用語集を1つ以上選択してください。",
    keepSourceHelp: "原文を翻訳結果の横に残します。用語集を1つ以上選択すると利用できます。",
    infoHint: "i を選択するとガイドと例を表示します。",
    glossaries: "用語集を選択",
    selected: "選択済み",
    searchGlossary: "用語集を検索...",
    loadingGlossaries: "用語集を読み込み中...",
    emptyGlossaries: "該当する用語集がありません。",
    glossaryError: "用語集を読み込めません。",
    terms: "用語",
    createGlossary: "用語集を新規作成",
    suggestGlossary: "用語集を提案",
    suggesting: "提案中...",
    startTranslation: "翻訳を開始",
    previousPage: "前のページ",
    nextPage: "次のページ",
    page: "ページ",
    of: "/",
    noSuggestion: "このファイルの推奨用語が見つかりませんでした。",
    createTitle: "用語集を新規作成",
    createDescription: "選択中の言語ペアで用語集を作成します。",
    glossaryName: "用語集名",
    glossaryNamePlaceholder: "例：プロジェクト用語",
    description: "説明",
    descriptionPlaceholder: "用語集の対象を簡潔に入力",
    cancel: "キャンセル",
    create: "用語集を作成",
    creating: "作成中...",
    nameRequired: "用語集名を入力してください。",
    createError: "用語集を作成できません。もう一度お試しください。",
    leaveTitle: "翻訳ページを離れますか？",
    leaveDescription: "このページを離れると、現在の設定内容は失われます。",
    stayOnPage: "このページに残る",
    leavePage: "ページを離れる",
  },
};

type WorkflowCopy = {
  complete: string;
  done: string;
  processingTitle: string;
  fileProgress: string;
  uploading: string;
  queued: string;
  translating: string;
  completed: string;
  failed: string;
  cancelled: string;
  uploadDescription: string;
  queueDescription: string;
  translatingDescription: string;
  completedDescription: string;
  failedDescription: string;
  cancelledDescription: string;
  processingNote: string;
  cancelTranslation: string;
  cancelFile: string;
  cancelFileError: string;
  viewDetails: string;
  retry: string;
  preview: string;
  previewDevelopmentTitle: string;
  previewDevelopmentDescription: string;
  download: string;
  completionSummary: string;
  translatedFiles: string;
  retryAll: string;
  newTranslation: string;
  detailsTitle: string;
  errorDetails: string;
  close: string;
  genericError: string;
  actionError: string;
  cancelTitle: string;
  cancelDescription: string;
  keepProcessing: string;
  confirmCancel: string;
  reconfigure: string;
  reconfigureDescription: string;
  selectFileForReconfigure: string;
  proceedReconfigure: string;
};

const workflowCopy: Record<TranslateLocale, WorkflowCopy> = {
  vi: {
    complete: "Hoàn thành",
    done: "Hoàn tất",
    processingTitle: "Đang xử lý bản dịch",
    fileProgress: "Tiến trình từng tệp",
    uploading: "Đang tải lên",
    queued: "Đang chờ",
    translating: "Đang dịch",
    completed: "Hoàn thành",
    failed: "Thất bại",
    cancelled: "Đã hủy",
    uploadDescription: "Đang tải tệp nguồn lên hệ thống",
    queueDescription: "Tệp đã tải lên và đang chờ xử lý",
    translatingDescription: "Đang dịch nội dung và áp dụng cấu hình",
    completedDescription: "Đã dịch xong và sẵn sàng tải về",
    failedDescription: "Không thể dịch tệp này",
    cancelledDescription: "Quá trình dịch tệp đã bị hủy",
    processingNote: "Bạn có thể rời trang. Hệ thống sẽ gửi thông báo khi toàn bộ tài liệu hoàn tất.",
    cancelTranslation: "Hủy bản dịch",
    cancelFile: "Hủy tệp",
    cancelFileError: "Không thể hủy tệp này. Vui lòng thử lại.",
    viewDetails: "Xem chi tiết",
    retry: "Thử lại",
    preview: "Xem trước",
    previewDevelopmentTitle: "Chức năng đang phát triển",
    previewDevelopmentDescription: "Tính năng xem trước bản dịch đang được hoàn thiện và sẽ sớm khả dụng.",
    download: "Tải về",
    completionSummary: "{completed} / {total} tài liệu đã dịch thành công",
    translatedFiles: "Tài liệu đã dịch",
    retryAll: "Thử lại tất cả",
    newTranslation: "Tạo bản dịch mới",
    detailsTitle: "Chi tiết xử lý",
    errorDetails: "Nội dung lỗi",
    close: "Đóng",
    genericError: "Đã xảy ra lỗi khi xử lý tệp. Vui lòng thử lại.",
    actionError: "Không thể mở tài liệu lúc này. Vui lòng thử lại.",
    cancelTitle: "Bạn có muốn hủy bản dịch không?",
    cancelDescription: "Các tệp đang xử lý sẽ được dừng. Bạn vẫn có thể thử lại từng tệp sau đó.",
    keepProcessing: "Tiếp tục xử lý",
    confirmCancel: "Hủy bản dịch",
    reconfigure: "Cấu hình lại",
    reconfigureDescription: "Chọn các tệp cần cấu hình và dịch lại.",
    selectFileForReconfigure: "Chọn tệp để cấu hình lại",
    proceedReconfigure: "Tiến hành",
  },
  en: {
    complete: "Complete",
    done: "Completed",
    processingTitle: "Processing translations",
    fileProgress: "Progress by file",
    uploading: "Uploading",
    queued: "Queued",
    translating: "Translating",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    uploadDescription: "Uploading the source file",
    queueDescription: "The file is uploaded and waiting to be processed",
    translatingDescription: "Translating content and applying its configuration",
    completedDescription: "Translation is ready to preview or download",
    failedDescription: "This file could not be translated",
    cancelledDescription: "Translation for this file was cancelled",
    processingNote: "You may leave this page. The system will notify you when all documents are finished.",
    cancelTranslation: "Cancel translation",
    cancelFile: "Cancel file",
    cancelFileError: "This file could not be cancelled. Please try again.",
    viewDetails: "View details",
    retry: "Retry",
    preview: "Preview",
    previewDevelopmentTitle: "Feature in development",
    previewDevelopmentDescription: "Translation preview is currently being completed and will be available soon.",
    download: "Download",
    completionSummary: "{completed} / {total} documents translated successfully",
    translatedFiles: "Translated documents",
    retryAll: "Retry all",
    newTranslation: "New translation",
    detailsTitle: "Processing details",
    errorDetails: "Error details",
    close: "Close",
    genericError: "The file could not be processed. Please try again.",
    actionError: "The document cannot be opened right now. Please try again.",
    cancelTitle: "Cancel this translation?",
    cancelDescription: "Files currently in progress will be stopped. You can retry them individually afterward.",
    keepProcessing: "Keep processing",
    confirmCancel: "Cancel translation",
    reconfigure: "Reconfigure",
    reconfigureDescription: "Select files to configure and translate again.",
    selectFileForReconfigure: "Select file to reconfigure",
    proceedReconfigure: "Proceed",
  },
  ja: {
    complete: "完了",
    done: "完了",
    processingTitle: "翻訳を処理中",
    fileProgress: "ファイルごとの進捗",
    uploading: "アップロード中",
    queued: "待機中",
    translating: "翻訳中",
    completed: "完了",
    failed: "失敗",
    cancelled: "キャンセル済み",
    uploadDescription: "原文ファイルをアップロードしています",
    queueDescription: "アップロードが完了し、処理を待っています",
    translatingDescription: "設定を適用して内容を翻訳しています",
    completedDescription: "翻訳が完了し、確認またはダウンロードできます",
    failedDescription: "このファイルを翻訳できませんでした",
    cancelledDescription: "このファイルの翻訳はキャンセルされました",
    processingNote: "このページを離れても、すべての文書が完了すると通知されます。",
    cancelTranslation: "翻訳をキャンセル",
    cancelFile: "ファイルをキャンセル",
    cancelFileError: "このファイルをキャンセルできませんでした。もう一度お試しください。",
    viewDetails: "詳細を見る",
    retry: "再試行",
    preview: "プレビュー",
    previewDevelopmentTitle: "機能を開発中です",
    previewDevelopmentDescription: "翻訳プレビュー機能は現在開発中で、近日中にご利用いただけるようになります。",
    download: "ダウンロード",
    completionSummary: "{completed} / {total} 件の文書を翻訳しました",
    translatedFiles: "翻訳済み文書",
    retryAll: "すべて再試行",
    newTranslation: "新しい翻訳",
    detailsTitle: "処理の詳細",
    errorDetails: "エラー内容",
    close: "閉じる",
    genericError: "ファイルを処理できませんでした。もう一度お試しください。",
    actionError: "現在この文書を開けません。もう一度お試しください。",
    cancelTitle: "翻訳をキャンセルしますか？",
    cancelDescription: "処理中のファイルは停止します。後で個別に再試行できます。",
    keepProcessing: "処理を続ける",
    confirmCancel: "翻訳をキャンセル",
    reconfigure: "再設定",
    reconfigureDescription: "再設定して翻訳するファイルを選択してください。",
    selectFileForReconfigure: "再設定するファイルを選択",
    proceedReconfigure: "続行",
  },
};

const TERMINAL_TRANSLATION_STATUSES = new Set<TranslationRunStatus>(["completed", "failed", "cancelled"]);

function clampProgress(progress: number | undefined) {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress ?? 0)));
}

const languageLabels: Record<SupportedLanguageCode, Record<TranslateLocale, string>> = {
  vn: {vi: "Tiếng Việt", en: "Vietnamese", ja: "ベトナム語"},
  en: {vi: "Tiếng Anh", en: "English", ja: "英語"},
  jp: {vi: "Tiếng Nhật", en: "Japanese", ja: "日本語"},
};

const languageFlags: Record<SupportedLanguageCode, string> = {
  vn: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1fb-1f1f3.svg",
  en: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg",
  jp: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ef-1f1f5.svg",
};

function getFileExtension(name: string) {
  const extension = name.split(".").pop()?.toUpperCase();
  return extension && extension !== name.toUpperCase() ? extension : "FILE";
}

const fileTypeStyles: Record<string, {backgroundColor: string; borderColor: string; color: string}> = {
  DOCX: {backgroundColor: "#eff6ff", borderColor: "#8bb8f5", color: "#1d64d6"},
  HTML: {backgroundColor: "#fff4eb", borderColor: "#f4ad72", color: "#c65317"},
  JPEG: {backgroundColor: "#ecfeff", borderColor: "#82d9df", color: "#087f8c"},
  JPG: {backgroundColor: "#ecfeff", borderColor: "#82d9df", color: "#087f8c"},
  MD: {backgroundColor: "#f5f1ff", borderColor: "#b8a1f4", color: "#7048c6"},
  PDF: {backgroundColor: "#fff1f1", borderColor: "#ef9a9a", color: "#c93636"},
  PNG: {backgroundColor: "#ecfeff", borderColor: "#82d9df", color: "#087f8c"},
  PPTX: {backgroundColor: "#fff3ed", borderColor: "#efaa84", color: "#c94f16"},
  TXT: {backgroundColor: "#f4f6f8", borderColor: "#aeb8c5", color: "#526174"},
  XLSX: {backgroundColor: "#edf9f1", borderColor: "#8ac8a1", color: "#177442"},
};

function getFileTypeStyle(extension: string) {
  return fileTypeStyles[extension] ?? {backgroundColor: "#f5f3f8", borderColor: "#c9c3d1", color: "#655f6d"};
}

function languageName(code: string, locale: TranslateLocale) {
  const normalizedCode = code === "vi" ? "vn" : code === "ja" ? "jp" : code;
  return languageLabels[normalizedCode as SupportedLanguageCode]?.[locale] ?? code.toUpperCase();
}

const keepSourceGuideCopy = {
  vi: {
    title: "Giữ văn bản gốc là gì?",
    description: "Tính năng Giữ văn bản gốc quyết định từ hoặc cụm từ gốc trong Glossary có được giữ lại trong bản dịch hay không.",
    glossaryTitle: "Ví dụ Glossary",
    languagePair: "Cặp ngôn ngữ minh họa",
    keepSource: "Giữ văn bản gốc",
    on: "BẬT",
    off: "TẮT",
    enabledDescription: "Giữ lại từ/cụm từ gốc trong bản dịch, bên cạnh nội dung tương ứng.",
    disabledDescription: "Chỉ hiển thị nội dung đã dịch và không giữ lại từ/cụm từ gốc.",
    sourceSentence: "Câu gốc",
    targetSentence: "Câu đích",
    enabledTip: "Phù hợp khi cần giữ thuật ngữ gốc để đối chiếu.",
    disabledTip: "Phù hợp khi muốn bản dịch gọn và tự nhiên hơn.",
    understood: "Tôi đã hiểu",
  },
  en: {
    title: "What is Keep source text?",
    description: "Keep source text determines whether source words or phrases defined in a Glossary remain visible in the translation.",
    glossaryTitle: "Glossary example",
    languagePair: "Example language pair",
    keepSource: "Keep source text",
    on: "ON",
    off: "OFF",
    enabledDescription: "Keeps the original word or phrase beside its translated content.",
    disabledDescription: "Shows only translated content without retaining the original word or phrase.",
    sourceSentence: "Source sentence",
    targetSentence: "Target sentence",
    enabledTip: "Useful when the original terminology should remain available for comparison.",
    disabledTip: "Useful when a shorter, more natural translation is preferred.",
    understood: "Got it",
  },
  ja: {
    title: "「原文を保持」とは？",
    description: "Glossaryで定義した原文の単語やフレーズを、翻訳結果にも残すかどうかを決める機能です。",
    glossaryTitle: "Glossaryの例",
    languagePair: "例の言語ペア",
    keepSource: "原文を保持",
    on: "オン",
    off: "オフ",
    enabledDescription: "翻訳された内容の横に、元の単語やフレーズを残します。",
    disabledDescription: "元の単語やフレーズを残さず、翻訳された内容のみを表示します。",
    sourceSentence: "原文",
    targetSentence: "翻訳文",
    enabledTip: "原文の用語を比較・確認したい場合に適しています。",
    disabledTip: "簡潔で自然な翻訳を優先する場合に適しています。",
    understood: "理解しました",
  },
} as const;

type KeepSourceGuideText = (typeof keepSourceGuideCopy)[TranslateLocale];
type KeepSourceMarkTone = "glossary" | "file";

function KeepSourceMark({children, tone}: {children: ReactNode; tone: KeepSourceMarkTone}) {
  const toneClassNames: Record<KeepSourceMarkTone, string> = {
    glossary: "border-[#aebfe9] bg-[#dfe8ff] text-[#173c76]",
    file: "border-[#ffc39b] bg-[#fff0e6] text-[#c84b08]",
  };

  return (
    <mark className={"inline rounded-[4px] border px-1 py-0.5 font-semibold " + toneClassNames[tone]}>
      {children}
    </mark>
  );
}

function KeepSourceSourceSentence({isJapanese}: {isJapanese: boolean}) {
  if (isJapanese) {
    return (
      <>
        GlossaryAIは、<KeepSourceMark tone="glossary">用語集</KeepSourceMark>で定義された用語を保持しながら
        <KeepSourceMark tone="file">ファイル</KeepSourceMark>翻訳を支援するアプリケーションです。
      </>
    );
  }

  return (
    <>
      GlossaryAI is an application that supports <KeepSourceMark tone="file">file</KeepSourceMark> translation while
      preserving terms defined in the <KeepSourceMark tone="glossary">glossary</KeepSourceMark>.
    </>
  );
}

function KeepSourceTargetSentence({enabled, isJapanese}: {enabled: boolean; isJapanese: boolean}) {
  const sourceFileTerm = isJapanese ? "ファイル" : "file";
  const sourceGlossaryTerm = isJapanese ? "用語集" : "Glossary";
  const targetFileTerm = enabled ? "tệp" : sourceFileTerm;

  return (
    <>
      GlossaryAI là một ứng dụng hỗ trợ dịch{" "}
      <KeepSourceMark tone="file">{targetFileTerm}</KeepSourceMark>
      {enabled ? (
        <>
          {" "}
          <KeepSourceMark tone="file">({sourceFileTerm})</KeepSourceMark>
        </>
      ) : null}{" "}
      và giữ lại các thuật ngữ được định nghĩa trong{" "}
      <KeepSourceMark tone="glossary">Bộ thuật ngữ</KeepSourceMark>
      {enabled ? (
        <>
          {" "}
          <KeepSourceMark tone="glossary">({sourceGlossaryTerm})</KeepSourceMark>
        </>
      ) : null}
      .
    </>
  );
}

function KeepSourceComparison({
  copy,
  enabled,
  isJapanese,
}: {
  copy: KeepSourceGuideText;
  enabled: boolean;
  isJapanese: boolean;
}) {
  return (
    <section
      className={
        "flex min-w-0 flex-col rounded-[8px] border p-5 " +
        (enabled ? "border-[#f1b58e] bg-[#fff9f5]" : "border-[#8ea4df] bg-[#f7f9ff]")
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[20px] font-bold text-[#172d5b]">{copy.keepSource}</h3>
          <p className="mt-1.5 text-[14px] leading-5 text-[#687184]">
            {enabled ? copy.enabledDescription : copy.disabledDescription}
          </p>
        </div>
        <Switch
          aria-label={copy.keepSource + ": " + (enabled ? copy.on : copy.off)}
          checked={enabled}
          className="pointer-events-none shrink-0 scale-110 opacity-100 disabled:opacity-100 data-[state=checked]:bg-[#f06317] data-[state=unchecked]:bg-[#a9afbb]"
          disabled
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[14px] font-bold text-[#26375f]">{copy.sourceSentence}</p>
        <div className="min-h-[110px] rounded-[7px] border border-[#d7deec] bg-white px-4 py-3 text-[15px] leading-7 text-[#35415c]">
          <KeepSourceSourceSentence isJapanese={isJapanese} />
        </div>
      </div>

      <ArrowDown
        aria-hidden="true"
        className={"mx-auto my-2.5 size-7 " + (enabled ? "text-[#f06317]" : "text-[#21175c]")}
        strokeWidth={2.2}
      />

      <div>
        <p className="mb-2 text-[14px] font-bold text-[#26375f]">{copy.targetSentence}</p>
        <div
          className={
            "min-h-[138px] rounded-[7px] border px-4 py-3 text-[15px] leading-7 text-[#35415c] " +
            (enabled ? "border-[#ffc6a1] bg-[#fff4ed]" : "border-[#b8c7ed] bg-[#f2f6ff]")
          }
        >
          <KeepSourceTargetSentence enabled={enabled} isJapanese={isJapanese} />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5 border-t border-[#dfe3eb] pt-4 text-[14px] leading-5 text-[#576177]">
        <Lightbulb
          aria-hidden="true"
          className={"mt-0.5 size-5 shrink-0 " + (enabled ? "text-[#f06317]" : "text-[#21175c]")}
        />
        <p>{enabled ? copy.enabledTip : copy.disabledTip}</p>
      </div>
    </section>
  );
}

function KeepSourceGuideDialog({
  locale,
  onOpenChange,
  open,
  sourceLanguage,
}: {
  locale: TranslateLocale;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sourceLanguage: SupportedLanguageCode;
}) {
  const copy = keepSourceGuideCopy[locale];
  const isJapanese = sourceLanguage === "jp";
  const exampleSourceLanguage: SupportedLanguageCode = isJapanese ? "jp" : "en";
  const glossaryTerms = isJapanese
    ? [
        {source: "用語集", target: "Bộ thuật ngữ"},
        {source: "ファイル", target: "ファイル"},
      ]
    : [
        {source: "glossary", target: "Bộ thuật ngữ"},
        {source: "file", target: "file"},
      ];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="keep-source-guide-dialog flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-[8px] border-[#cfd7e6] bg-white p-0 shadow-[0_28px_80px_rgba(23,45,91,0.24)] sm:max-w-[980px]">
        <DialogHeader className="border-b border-[#e2e7f0] bg-[#fbfcff] px-5 py-4 pr-14 text-left sm:px-6 sm:py-5">
          <DialogTitle className="text-[26px] font-bold text-[#172d5b]">{copy.title}</DialogTitle>
          <DialogDescription className="max-w-[800px] text-[15px] leading-6 text-[#667085]">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="keep-source-guide-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <section className="rounded-[8px] border border-[#d9e0ec] bg-[#fcfdff] p-5">
            <h3 className="text-[19px] font-bold text-[#172d5b]">{copy.glossaryTitle}</h3>
            <p className="mt-2.5 text-[13px] font-bold uppercase text-[#737d91]">{copy.languagePair}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[15px] font-semibold text-[#26375f]">
              <span className="inline-flex items-center gap-2 rounded-[6px] border border-[#d8deea] bg-white px-3 py-2">
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-6 rounded-[1px] border-[0.5px] border-black/60 object-cover"
                  src={languageFlags[exampleSourceLanguage]}
                />
                {languageName(exampleSourceLanguage, locale)}
              </span>
              <ArrowRight aria-hidden="true" className="size-5 text-[#7b8496]" />
              <span className="inline-flex items-center gap-2 rounded-[6px] border border-[#d8deea] bg-white px-3 py-2">
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-6 rounded-[1px] border-[0.5px] border-black/60 object-cover"
                  src={languageFlags.vn}
                />
                {languageName("vn", locale)}
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-[7px] border border-[#dfe4ed] bg-white">
              {glossaryTerms.map((term, index) => {
                const mappingColorClassName = index === 0
                  ? "border-[#aebfe9] bg-[#dfe8ff] text-[#173c76]"
                  : "border-[#ffc39b] bg-[#fff0e6] text-[#c84b08]";

                return (
                  <div
                    className={
                      "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-[15px] text-[#35415c] " +
                      (index > 0 ? "border-t border-[#e5e9f0]" : "")
                    }
                    key={term.source}
                  >
                    <span className={"w-fit rounded-[5px] border px-2 py-1 font-semibold " + mappingColorClassName}>
                      {term.source}
                    </span>
                    <ArrowRight aria-hidden="true" className="size-5 text-[#7b8496]" />
                    <span className={"w-fit rounded-[5px] border px-2 py-1 font-semibold " + mappingColorClassName}>
                      {term.target}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid items-stretch gap-4 md:grid-cols-2">
            <KeepSourceComparison copy={copy} enabled isJapanese={isJapanese} />
            <KeepSourceComparison copy={copy} enabled={false} isJapanese={isJapanese} />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-row justify-center border-t border-[#e2e7f0] bg-[#fbfcff] px-5 py-4 sm:justify-center">
          <DialogClose asChild>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-[#21175c] px-7 text-[15px] font-bold text-white shadow-[0_7px_18px_rgba(33,23,92,0.18)] transition-colors hover:bg-[#f06317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f06317] focus-visible:ring-offset-2"
              type="button"
            >
              <Check aria-hidden="true" className="size-5" strokeWidth={2.4} />
              {copy.understood}
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TranslateConfigure() {
  const locale = useLocale();
  const currentLocale: TranslateLocale = locale === "vi" || locale === "ja" ? locale : "en";
  const copy = translateCopy[currentLocale];
  const workflow = workflowCopy[currentLocale];
  const pendingFiles = usePendingUploadStore((state) => state.pendingFiles);
  const setPendingFiles = usePendingUploadStore((state) => state.setPendingFiles);
  const [fileConfigs, setFileConfigs] = useState<Record<string, FileTranslationConfig>>({});
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openLanguageSelect, setOpenLanguageSelect] = useState<"source" | "target" | null>(null);
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);
  const [glossarySearch, setGlossarySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [glossaryPage, setGlossaryPage] = useState(1);
  const [glossaryPages, setGlossaryPages] = useState(1);
  const [isLoadingGlossaries, setIsLoadingGlossaries] = useState(true);
  const [glossaryLoadError, setGlossaryLoadError] = useState(false);
  const [glossaryNotice, setGlossaryNotice] = useState("");
  const [reloadGlossaries, setReloadGlossaries] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isKeepSourceHelpOpen, setIsKeepSourceHelpOpen] = useState(false);
  const [glossaryFormInitialValues, setGlossaryFormInitialValues] =
    useState<GlossaryFormInitialValues | null>(null);
  const [glossaryFormVersion, setGlossaryFormVersion] = useState(0);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("configure");
  const [translationRuns, setTranslationRuns] = useState<Record<string, TranslationRunState>>({});
  const [workflowNotice, setWorkflowNotice] = useState("");
  const [detailsFileId, setDetailsFileId] = useState<string | null>(null);
  const [activeFileAction, setActiveFileAction] = useState<string | null>(null);
  const [isPreviewNoticeOpen, setIsPreviewNoticeOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellingFileId, setCancellingFileId] = useState<string | null>(null);
  const [isUploadedFilesOpen, setIsUploadedFilesOpen] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<SourceDocumentResponse[]>([]);
  const [uploadedFileSearch, setUploadedFileSearch] = useState("");
  const [debouncedUploadedFileSearch, setDebouncedUploadedFileSearch] = useState("");
  const [uploadedFilesPage, setUploadedFilesPage] = useState(1);
  const [uploadedFilesPages, setUploadedFilesPages] = useState(1);
  const [isLoadingUploadedFiles, setIsLoadingUploadedFiles] = useState(false);
  const [uploadedFilesError, setUploadedFilesError] = useState(false);
  const [selectedUploadedDocuments, setSelectedUploadedDocuments] = useState<Record<string, SourceDocumentResponse>>({});
  const [isReconfigureMode, setIsReconfigureMode] = useState(false);
  const [reconfigureFileIds, setReconfigureFileIds] = useState<Set<string>>(new Set());
  const navigationAllowedRef = useRef(false);
  const translationAttemptsRef = useRef<Record<string, number>>({});
  const translationRunsRef = useRef<Record<string, TranslationRunState>>({});
  const isWorkflowMountedRef = useRef(true);
  const isFileLimitReached = pendingFiles.length >= MAX_FILES;
  const uploadedFilesAvailableSlots = Math.max(0, MAX_FILES - pendingFiles.length);
  const selectedUploadedFilesCount = Object.keys(selectedUploadedDocuments).length;
  const selectedFileId = pendingFiles.some((file) => file.id === activeFileId) ? activeFileId : (pendingFiles[0]?.id ?? null);
  const activeFile = pendingFiles.find((file) => file.id === selectedFileId) ?? null;
  const activeConfig = selectedFileId && fileConfigs[selectedFileId] ? fileConfigs[selectedFileId] : createDefaultFileConfig();
  const {keepSourceText, selectedGlossaryIds, sourceLanguage, targetLanguage, translateImages} = activeConfig;
  const hasSelectedGlossary = selectedGlossaryIds.size > 0;
  const canStartTranslation =
    pendingFiles.length > 0 &&
    pendingFiles.every((file) => {
      const config = fileConfigs[file.id] ?? createDefaultFileConfig();
      return config.sourceLanguage !== config.targetLanguage;
    });
  const completedRunsCount = pendingFiles.filter((file) => translationRuns[file.id]?.status === "completed").length;
  const retryableFileIds = pendingFiles
    .filter((file) => {
      const status = translationRuns[file.id]?.status;
      return status === "failed" || status === "cancelled";
    })
    .map((file) => file.id);
  const detailsFile = pendingFiles.find((file) => file.id === detailsFileId) ?? null;
  const detailsRun = detailsFileId ? translationRuns[detailsFileId] : undefined;

  const updateActiveFileConfig = useCallback(
    (updater: (currentConfig: FileTranslationConfig) => FileTranslationConfig) => {
      if (!selectedFileId) return;

      setFileConfigs((currentConfigs) => {
        const currentConfig = currentConfigs[selectedFileId] ?? createDefaultFileConfig();
        return {...currentConfigs, [selectedFileId]: updater(currentConfig)};
      });
    },
    [selectedFileId],
  );

  useEffect(() => {
    if (pendingFiles.length > MAX_FILES) {
      setPendingFiles(pendingFiles.slice(0, MAX_FILES));
    }
  }, [pendingFiles, setPendingFiles]);

  useEffect(() => {
    setFileConfigs((currentConfigs) => {
      const nextConfigs = Object.fromEntries(
        pendingFiles.map((file) => [file.id, currentConfigs[file.id] ?? createDefaultFileConfig()]),
      );
      const currentIds = Object.keys(currentConfigs);

      if (
        currentIds.length === pendingFiles.length &&
        pendingFiles.every((file) => currentConfigs[file.id] === nextConfigs[file.id])
      ) {
        return currentConfigs;
      }

      return nextConfigs;
    });
    setActiveFileId((currentFileId) =>
      currentFileId && pendingFiles.some((file) => file.id === currentFileId)
        ? currentFileId
        : (pendingFiles[0]?.id ?? null),
    );
  }, [pendingFiles]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(glossarySearch.trim());
      setGlossaryPage(1);
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [glossarySearch]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedUploadedFileSearch(uploadedFileSearch.trim());
      setUploadedFilesPage(1);
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [uploadedFileSearch]);

  useEffect(() => {
    if (!isUploadedFilesOpen) return;

    let isMounted = true;

    const loadUploadedFiles = async () => {
      setIsLoadingUploadedFiles(true);
      setUploadedFilesError(false);

      try {
        const response = await DocumentService.getSourceDocuments(
          uploadedFilesPage,
          UPLOADED_FILES_PER_PAGE,
          "uploadedAt",
          "desc",
          debouncedUploadedFileSearch || undefined,
        );

        if (!isMounted) return;

        const pageCount = Math.max(1, response.pages || Math.ceil(response.total / UPLOADED_FILES_PER_PAGE));
        setUploadedDocuments(response.items ?? []);
        setUploadedFilesPages(pageCount);

        if (uploadedFilesPage > pageCount) setUploadedFilesPage(pageCount);
      } catch (error) {
        console.error("Failed to load uploaded files", error);

        if (isMounted) {
          setUploadedDocuments([]);
          setUploadedFilesPages(1);
          setUploadedFilesError(true);
        }
      } finally {
        if (isMounted) setIsLoadingUploadedFiles(false);
      }
    };

    void loadUploadedFiles();

    return () => {
      isMounted = false;
    };
  }, [debouncedUploadedFileSearch, isUploadedFilesOpen, uploadedFilesPage]);

  useEffect(() => {
    setSelectedUploadedDocuments((currentSelection) => {
      const entries = Object.entries(currentSelection).slice(0, uploadedFilesAvailableSlots);
      if (entries.length === Object.keys(currentSelection).length) return currentSelection;
      return Object.fromEntries(entries);
    });
  }, [uploadedFilesAvailableSlots]);

  useEffect(() => {
    setReconfigureFileIds((currentIds) => {
      const validIds = new Set(pendingFiles.map((file) => file.id));
      const nextIds = new Set([...currentIds].filter((fileId) => validIds.has(fileId)));
      if (nextIds.size === currentIds.size) return currentIds;
      return nextIds;
    });
  }, [pendingFiles]);

  useEffect(() => {
    let isMounted = true;

    const loadGlossaries = async () => {
      setIsLoadingGlossaries(true);
      setGlossaryLoadError(false);

      try {
        const response = await GlossaryService.getGlossaries({
          page: glossaryPage,
          search: debouncedSearch || undefined,
          size: GLOSSARIES_PER_PAGE,
        });

        if (!isMounted) return;

        const pageCount = Math.max(1, response.pages || Math.ceil(response.total / GLOSSARIES_PER_PAGE));
        setGlossaries(response.items ?? []);
        setGlossaryPages(pageCount);

        if (glossaryPage > pageCount) setGlossaryPage(pageCount);
      } catch (error) {
        console.error("Failed to load glossaries", error);

        if (isMounted) {
          setGlossaries([]);
          setGlossaryPages(1);
          setGlossaryLoadError(true);
        }
      } finally {
        if (isMounted) setIsLoadingGlossaries(false);
      }
    };

    loadGlossaries();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, glossaryPage, reloadGlossaries]);

  useEffect(() => {
    document.body.classList.toggle("translate-language-select-open", openLanguageSelect !== null);

    return () => document.body.classList.remove("translate-language-select-open");
  }, [openLanguageSelect]);

  useEffect(() => {
    isWorkflowMountedRef.current = true;

    return () => {
      isWorkflowMountedRef.current = false;
      Object.keys(translationAttemptsRef.current).forEach((fileId) => {
        translationAttemptsRef.current[fileId] += 1;
      });
    };
  }, []);

  useEffect(() => {
    if (workflowStep !== "processing" || pendingFiles.length === 0) return;

    const allRunsTerminal = pendingFiles.every((file) => {
      const status = translationRuns[file.id]?.status;
      return status !== undefined && TERMINAL_TRANSLATION_STATUSES.has(status);
    });

    if (!allRunsTerminal) return;

    const timeout = window.setTimeout(() => setWorkflowStep("complete"), 500);
    return () => window.clearTimeout(timeout);
  }, [pendingFiles, translationRuns, workflowStep]);

  useEffect(() => {
    if (pendingFiles.length === 0) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (navigationAllowedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const handleDocumentClick = (event: MouseEvent) => {
      if (navigationAllowedRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const clickedElement = event.target instanceof Element ? event.target : null;
      const anchor = clickedElement?.closest<HTMLAnchorElement>("a[href]");

      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingNavigation(destination.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [pendingFiles.length]);

  const openUploadedFilesDialog = () => {
    if (isFileLimitReached) return;

    setSelectedUploadedDocuments({});
    setUploadedFileSearch("");
    setDebouncedUploadedFileSearch("");
    setUploadedFilesPage(1);
    setIsUploadedFilesOpen(true);
  };

  const toggleUploadedDocument = (document: SourceDocumentResponse) => {
    if (pendingFiles.some((file) => file.documentId === document.id)) return;

    setSelectedUploadedDocuments((currentSelection) => {
      if (currentSelection[document.id]) {
        const nextSelection = {...currentSelection};
        delete nextSelection[document.id];
        return nextSelection;
      }

      if (Object.keys(currentSelection).length >= uploadedFilesAvailableSlots) return currentSelection;
      return {...currentSelection, [document.id]: document};
    });
  };

  const addSelectedUploadedFiles = () => {
    const existingDocumentIds = new Set(
      pendingFiles.map((file) => file.documentId).filter((documentId): documentId is string => Boolean(documentId)),
    );
    const documentsToAdd = Object.values(selectedUploadedDocuments)
      .filter((document) => !existingDocumentIds.has(document.id))
      .slice(0, Math.max(0, MAX_FILES - pendingFiles.length));

    if (documentsToAdd.length > 0) {
      const nextFiles = documentsToAdd.map((document) => ({
        id: `uploaded-${document.id}`,
        file: new File([], document.name, {
          lastModified: Number.isNaN(Date.parse(document.uploadedAt)) ? Date.now() : Date.parse(document.uploadedAt),
          type: document.type || "application/octet-stream",
        }),
        documentId: document.id,
        metadata: {
          name: document.name,
          size: document.size,
          type: document.type,
        },
      }));

      setPendingFiles([...pendingFiles, ...nextFiles]);
    }

    setSelectedUploadedDocuments({});
    setIsUploadedFilesOpen(false);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const availableSlots = Math.max(0, MAX_FILES - pendingFiles.length);
      if (!acceptedFiles.length || !availableSlots) return;

      const knownFiles = new Set(
        pendingFiles.map((item) => `${item.metadata.name}-${item.metadata.size}-${item.file.lastModified}`),
      );
      const createdAt = Date.now();
      const newFiles = acceptedFiles
        .filter((file) => !knownFiles.has(`${file.name}-${file.size}-${file.lastModified}`))
        .slice(0, availableSlots)
        .map((file, index) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${createdAt}-${index}`,
          file,
          documentId: "",
          metadata: {name: file.name, size: file.size, type: file.type},
        }));

      setPendingFiles([...pendingFiles, ...newFiles]);
    },
    [pendingFiles, setPendingFiles],
  );

  const {getInputProps, getRootProps, isDragActive, isDragReject, open} = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".png", ".jpeg", ".jpg"],
      "text/html": [".html", ".htm"],
      "text/markdown": [".md"],
      "text/plain": [".txt"],
    },
    disabled: isFileLimitReached || workflowStep !== "configure",
    multiple: true,
    noClick: true,
    onDrop,
  });

  const changeSourceLanguage = (nextLanguage: SupportedLanguageCode) => {
    setGlossaryNotice("");
    setGlossaryPage(1);
    updateActiveFileConfig((currentConfig) => ({
      ...currentConfig,
      sourceLanguage: nextLanguage,
      targetLanguage: nextLanguage === currentConfig.targetLanguage ? currentConfig.sourceLanguage : currentConfig.targetLanguage,
    }));
  };

  const changeTargetLanguage = (nextLanguage: SupportedLanguageCode) => {
    setGlossaryNotice("");
    setGlossaryPage(1);
    updateActiveFileConfig((currentConfig) => ({
      ...currentConfig,
      sourceLanguage: nextLanguage === currentConfig.sourceLanguage ? currentConfig.targetLanguage : currentConfig.sourceLanguage,
      targetLanguage: nextLanguage,
    }));
  };

  const swapLanguages = () => {
    setGlossaryNotice("");
    setGlossaryPage(1);
    updateActiveFileConfig((currentConfig) => ({
      ...currentConfig,
      sourceLanguage: currentConfig.targetLanguage,
      targetLanguage: currentConfig.sourceLanguage,
    }));
  };

  const toggleGlossary = (glossaryId: string) => {
    setGlossaryNotice("");
    updateActiveFileConfig((currentConfig) => {
      const nextSelection = new Set(currentConfig.selectedGlossaryIds);
      if (nextSelection.has(glossaryId)) nextSelection.delete(glossaryId);
      else nextSelection.add(glossaryId);

      return {
        ...currentConfig,
        keepSourceText: nextSelection.size > 0 ? currentConfig.keepSourceText : false,
        selectedGlossaryIds: nextSelection,
      };
    });
  };

  const openGlossaryForm = (initialValues: GlossaryFormInitialValues) => {
    setGlossaryFormInitialValues(initialValues);
    setGlossaryFormVersion((currentVersion) => currentVersion + 1);
    setIsCreateOpen(true);
  };

  const openCreateGlossary = () => {
    setGlossaryNotice("");
    openGlossaryForm({
      sourceLanguage,
      targetLanguage,
      terms: [],
    });
  };

  const handleGlossarySaved = (createdGlossary: GlossaryResponse) => {
    updateActiveFileConfig((currentConfig) => ({
      ...currentConfig,
      selectedGlossaryIds: new Set([...currentConfig.selectedGlossaryIds, createdGlossary.id]),
    }));
    setGlossarySearch("");
    setGlossaryPage(1);
    setReloadGlossaries((currentValue) => currentValue + 1);
    setIsCreateOpen(false);
    setGlossaryFormInitialValues(null);
  };

  const suggestGlossary = async () => {
    if (!activeFile) return;

    setIsSuggesting(true);
    setGlossaryNotice("");

    try {
      let recommendationFileId = activeFile.documentId;

      if (!recommendationFileId) {
        const uploadedDocument = await TranslationService.uploadDocument(
          activeFile.file,
          sourceLanguage,
          targetLanguage,
        );
        recommendationFileId = uploadedDocument.id;
        setPendingFiles(
          pendingFiles.map((file) =>
            file.id === activeFile.id ? {...file, documentId: uploadedDocument.id} : file,
          ),
        );
      }

      const response = await GlossaryService.recommendGlossary(recommendationFileId);
      const suggestedTerms = (response.terms ?? []).filter(
        (term) => term.source.trim() && term.target.trim(),
      );

      if (suggestedTerms.length === 0) {
        setGlossaryNotice(copy.noSuggestion);
        return;
      }

      const baseName = activeFile.metadata.name.replace(/\.[^.]+$/, "").trim();
      openGlossaryForm({
        name: baseName ? `${baseName} Glossary` : "",
        sourceLanguage,
        targetLanguage,
        terms: suggestedTerms,
      });
    } catch (error) {
      console.error("Failed to recommend glossary terms", error);
      setGlossaryNotice(copy.glossaryError);
    } finally {
      setIsSuggesting(false);
    }
  };

  const patchTranslationRun = (fileId: string, patch: Partial<TranslationRunState>) => {
    const currentRun = translationRunsRef.current[fileId] ?? {
      fileId,
      progress: 0,
      status: "uploading" as const,
    };
    const nextRuns = {
      ...translationRunsRef.current,
      [fileId]: {...currentRun, ...patch, fileId},
    };

    translationRunsRef.current = nextRuns;
    setTranslationRuns(nextRuns);
  };

  const runFileTranslation = async (fileId: string) => {
    const pendingFile = pendingFiles.find((file) => file.id === fileId);
    if (!pendingFile) return;

    const config = fileConfigs[fileId] ?? createDefaultFileConfig();
    const attempt = (translationAttemptsRef.current[fileId] ?? 0) + 1;
    translationAttemptsRef.current[fileId] = attempt;
    const isCurrentAttempt = () =>
      isWorkflowMountedRef.current && translationAttemptsRef.current[fileId] === attempt;

    const existingRun = translationRunsRef.current[fileId];
    let documentId = existingRun?.documentId || pendingFile.documentId || undefined;

    patchTranslationRun(fileId, {
      documentId,
      errorMessage: undefined,
      jobId: undefined,
      progress: documentId ? 10 : 2,
      status: "uploading",
      targetDocument: undefined,
    });

    try {
      if (!documentId) {
        const uploadedDocument = await TranslationService.uploadDocument(
          pendingFile.file,
          config.sourceLanguage,
          config.targetLanguage,
        );
        if (!isCurrentAttempt()) return;

        documentId = uploadedDocument.id;
        patchTranslationRun(fileId, {documentId, progress: 12});
      }

      const translation = await TranslationService.startTranslation({
        documentId,
        glossaries: Array.from(config.selectedGlossaryIds),
        isTranslateImage: config.translateImages,
        keepSource: config.keepSourceText,
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
      });
      if (!isCurrentAttempt()) return;

      let status = translation.status;
      patchTranslationRun(fileId, {
        documentId,
        errorMessage: translation.errorMessage,
        jobId: translation.id,
        progress: clampProgress(translation.progress),
        status,
        targetDocument: translation.targetDocument,
      });

      while (isCurrentAttempt() && !TERMINAL_TRANSLATION_STATUSES.has(status)) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
        if (!isCurrentAttempt()) return;

        const latestTranslation = await TranslationService.getTranslationStatus(translation.id);
        if (!isCurrentAttempt()) return;

        status = latestTranslation.status;
        patchTranslationRun(fileId, {
          errorMessage: latestTranslation.errorMessage,
          progress: clampProgress(latestTranslation.progress),
          status,
          targetDocument: latestTranslation.targetDocument,
        });
      }
    } catch (error) {
      if (!isCurrentAttempt()) return;

      console.error("Failed to translate file", error);
      patchTranslationRun(fileId, {
        errorMessage: error instanceof Error && error.message ? error.message : workflow.genericError,
        status: "failed",
      });
    }
  };

  const startWorkflow = () => {
    if (!canStartTranslation) return;

    translationAttemptsRef.current = {};
    const initialRuns = Object.fromEntries(
      pendingFiles.map((file) => [
        file.id,
        {
          documentId: file.documentId || undefined,
          fileId: file.id,
          progress: file.documentId ? 10 : 2,
          status: "uploading" as const,
        },
      ]),
    );

    translationRunsRef.current = initialRuns;
    setTranslationRuns(initialRuns);
    setWorkflowNotice("");
    setWorkflowStep("processing");
    pendingFiles.forEach((file) => void runFileTranslation(file.id));
  };

  const retryTranslation = (fileId: string) => {
    setWorkflowNotice("");
    setWorkflowStep("processing");
    void runFileTranslation(fileId);
  };

  const retryAllTranslations = () => {
    if (retryableFileIds.length === 0) return;

    setWorkflowNotice("");
    setWorkflowStep("processing");
    retryableFileIds.forEach((fileId) => void runFileTranslation(fileId));
  };

  const cancelFileTranslation = async (fileId: string) => {
    const run = translationRunsRef.current[fileId];
    if (!run?.jobId || TERMINAL_TRANSLATION_STATUSES.has(run.status)) return;

    setCancellingFileId(fileId);
    setWorkflowNotice("");

    try {
      await TranslationService.cancelTranslation(run.jobId);
      if (!isWorkflowMountedRef.current) return;

      const currentRun = translationRunsRef.current[fileId];
      if (!currentRun || TERMINAL_TRANSLATION_STATUSES.has(currentRun.status)) return;

      translationAttemptsRef.current[fileId] = (translationAttemptsRef.current[fileId] ?? 0) + 1;
      patchTranslationRun(fileId, {status: "cancelled"});
    } catch (error) {
      console.error("Failed to cancel file translation", error);
      if (isWorkflowMountedRef.current) setWorkflowNotice(workflow.cancelFileError);
    } finally {
      if (isWorkflowMountedRef.current) setCancellingFileId(null);
    }
  };

  const cancelCurrentTranslations = async () => {
    setIsCancelling(true);

    const activeRuns = Object.values(translationRunsRef.current).filter(
      (run) => !TERMINAL_TRANSLATION_STATUSES.has(run.status),
    );
    activeRuns.forEach((run) => {
      translationAttemptsRef.current[run.fileId] = (translationAttemptsRef.current[run.fileId] ?? 0) + 1;
    });

    await Promise.allSettled(
      activeRuns.filter((run) => run.jobId).map((run) => TranslationService.cancelTranslation(run.jobId!)),
    );

    if (!isWorkflowMountedRef.current) return;

    const nextRuns = {...translationRunsRef.current};
    activeRuns.forEach((run) => {
      const currentRun = nextRuns[run.fileId];
      if (!currentRun || TERMINAL_TRANSLATION_STATUSES.has(currentRun.status)) return;
      nextRuns[run.fileId] = {...currentRun, status: "cancelled"};
    });

    translationRunsRef.current = nextRuns;
    setTranslationRuns(nextRuns);
    setIsCancelling(false);
    setIsCancelOpen(false);
  };

  const openTranslatedDocument = async (fileId: string, mode: "preview" | "download") => {
    const run = translationRunsRef.current[fileId];
    const pendingFile = pendingFiles.find((file) => file.id === fileId);
    if (!run?.jobId || !pendingFile) return;

    const actionKey = fileId + ":" + mode;
    setActiveFileAction(actionKey);
    setWorkflowNotice("");

    try {
      const blob = await TranslationService.downloadTranslatedDocument(run.jobId);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;

      if (mode === "download") {
        const config = fileConfigs[fileId] ?? createDefaultFileConfig();
        link.download = getTranslatedFileName(pendingFile.metadata.name, config.targetLanguage);
      } else {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), mode === "preview" ? 60000 : 1000);
    } catch (error) {
      console.error("Failed to open translated document", error);
      setWorkflowNotice(workflow.actionError);
    } finally {
      setActiveFileAction(null);
    }
  };

  const requestNewTranslation = () => {
    setPendingNavigation(window.location.href);
  };

  const startReconfigureMode = () => {
    setWorkflowNotice("");
    setReconfigureFileIds(new Set());
    setIsReconfigureMode(true);
  };

  const toggleReconfigureFile = (fileId: string) => {
    setReconfigureFileIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(fileId)) nextIds.delete(fileId);
      else nextIds.add(fileId);
      return nextIds;
    });
  };

  const cancelReconfigureMode = () => {
    setReconfigureFileIds(new Set());
    setIsReconfigureMode(false);
  };

  const proceedReconfigure = () => {
    if (reconfigureFileIds.size === 0) return;

    const selectedFiles = pendingFiles
      .filter((file) => reconfigureFileIds.has(file.id))
      .map((file) => ({
        ...file,
        documentId: translationRuns[file.id]?.documentId || file.documentId,
      }));
    const selectedConfigs = Object.fromEntries(
      selectedFiles.map((file) => [file.id, fileConfigs[file.id] ?? createDefaultFileConfig()]),
    );

    translationRunsRef.current = {};
    setTranslationRuns({});
    setPendingFiles(selectedFiles);
    setFileConfigs(selectedConfigs);
    setActiveFileId(selectedFiles[0]?.id ?? null);
    setGlossaryNotice("");
    setWorkflowNotice("");
    setReconfigureFileIds(new Set());
    setIsReconfigureMode(false);
    setWorkflowStep("configure");
  };

  const renderTranslationFile = (
    pendingFile: (typeof pendingFiles)[number],
    isCompletionView: boolean,
    showSelection = false,
  ) => {
    const run = translationRuns[pendingFile.id] ?? {
      fileId: pendingFile.id,
      progress: 0,
      status: "uploading" as const,
    };
    const config = fileConfigs[pendingFile.id] ?? createDefaultFileConfig();
    const status = run.status;
    const progress = status === "completed" ? 100 : clampProgress(run.progress);
    const isActive = status === "uploading" || status === "pending" || status === "translating";
    const displayName =
      isCompletionView && status === "completed"
        ? getTranslatedFileName(pendingFile.metadata.name, config.targetLanguage)
        : pendingFile.metadata.name;
    const extension = getFileExtension(displayName);
    const statusLabel: Record<TranslationRunStatus, string> = {
      uploading: workflow.uploading,
      pending: workflow.queued,
      translating: workflow.translating,
      completed: workflow.completed,
      failed: workflow.failed,
      cancelled: workflow.cancelled,
    };
    const statusDescription: Record<TranslationRunStatus, string> = {
      uploading: workflow.uploadDescription,
      pending: workflow.queueDescription,
      translating: workflow.translatingDescription,
      completed: workflow.completedDescription,
      failed: workflow.failedDescription,
      cancelled: workflow.cancelledDescription,
    };
    const rowTone =
      status === "completed"
        ? "bg-[#fcfffd]"
        : status === "failed" || status === "cancelled"
          ? "bg-[#fffdfd]"
          : "bg-white";
    const rowBorderColor =
      status === "completed"
        ? "#b9dfc5"
        : status === "failed" || status === "cancelled"
          ? "#f0b6b1"
          : "#d9d2e7";
    const badgeTone =
      status === "completed"
        ? "bg-[#eaf8ee] text-[#1b7a3c]"
        : status === "failed"
          ? "bg-[#fff0ef] text-[#c62d28]"
          : status === "cancelled"
            ? "bg-[#f0eef3] text-[#716b79]"
            : "bg-[#fff1e8] text-[#dc570e]";
    const downloadAction = pendingFile.id + ":download";

    return (
      <article
        className={"rounded-[8px] border p-3 sm:px-4 " + rowTone}
        key={pendingFile.id}
        style={{borderColor: rowBorderColor}}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showSelection ? (
              <Checkbox
                aria-label={`${workflow.selectFileForReconfigure}: ${pendingFile.metadata.name}`}
                checked={reconfigureFileIds.has(pendingFile.id)}
                className="size-5 shrink-0 rounded-[5px] border-[#8f84ad] data-[state=checked]:border-[#21175c] data-[state=checked]:bg-[#21175c]"
                onCheckedChange={() => toggleReconfigureFile(pendingFile.id)}
              />
            ) : null}
            <span
              className="grid size-11 shrink-0 place-items-center rounded-[8px] border text-[8px] font-extrabold tracking-[0.03em]"
              style={getFileTypeStyle(extension)}
            >
              {extension.slice(0, 5)}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[11px] font-bold text-[#30265c]" title={displayName}>
                {displayName}
              </strong>
              <span className="mt-1 block text-[9px] leading-4 text-[#827c89]">
                {formatBytes(pendingFile.metadata.size)}
                <span aria-hidden="true"> &middot; </span>
                {statusDescription[status]}
              </span>
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <span className={"rounded-full px-2.5 py-1 text-[8px] font-bold " + badgeTone}>
              {statusLabel[status]}
            </span>

            {!isCompletionView && isActive && run.jobId && !showSelection ? (
              <button
                aria-label={`${workflow.cancelFile}: ${pendingFile.metadata.name}`}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] border border-[#dc3b34] bg-white px-3 text-[9px] font-bold text-[#b42318] transition-colors hover:bg-[#fff4f3] disabled:cursor-wait disabled:opacity-50"
                disabled={cancellingFileId !== null || isCancelling}
                onClick={() => void cancelFileTranslation(pendingFile.id)}
                title={workflow.cancelFile}
                type="button"
              >
                {cancellingFileId === pendingFile.id ? (
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                ) : (
                  <X aria-hidden="true" className="size-3.5" />
                )}
                {workflow.cancelFile}
              </button>
            ) : null}

            {status === "completed" && !showSelection ? (
              <>
                <button
                  aria-haspopup="dialog"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] border border-[#5a459d] bg-white px-3 text-[9px] font-bold text-[#30206f] transition-colors hover:bg-[#f5f2ff] disabled:cursor-wait disabled:opacity-55"
                  disabled={activeFileAction !== null}
                  onClick={() => setIsPreviewNoticeOpen(true)}
                  type="button"
                >
                  <Eye aria-hidden="true" className="size-3.5" />
                  {workflow.preview}
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-[#21175c] px-3.5 text-[9px] font-bold text-white transition-colors hover:bg-[#f06317] disabled:cursor-wait disabled:opacity-55"
                  disabled={activeFileAction !== null}
                  onClick={() => void openTranslatedDocument(pendingFile.id, "download")}
                  type="button"
                >
                  {activeFileAction === downloadAction ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Download aria-hidden="true" className="size-3.5" />}
                  {workflow.download}
                </button>
              </>
            ) : null}

            {status === "failed" && !showSelection ? (
              <>
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] border border-[#dc3b34] bg-white px-3 text-[9px] font-bold text-[#b42318] transition-colors hover:bg-[#fff4f3]"
                  onClick={() => setDetailsFileId(pendingFile.id)}
                  type="button"
                >
                  <Info aria-hidden="true" className="size-3.5" />
                  {workflow.viewDetails}
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-[#21175c] px-3.5 text-[9px] font-bold text-white transition-colors hover:bg-[#f06317]"
                  onClick={() => retryTranslation(pendingFile.id)}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" className="size-3.5" />
                  {workflow.retry}
                </button>
              </>
            ) : null}

            {status === "cancelled" && !showSelection ? (
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] bg-[#21175c] px-3.5 text-[9px] font-bold text-white transition-colors hover:bg-[#f06317]"
                onClick={() => retryTranslation(pendingFile.id)}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="size-3.5" />
                {workflow.retry}
              </button>
            ) : null}
          </div>
        </div>

        {!isCompletionView && isActive ? (
          <div className="mt-2.5 flex items-center gap-3 pl-0 sm:pl-14">
            <div
              aria-label={statusLabel[status]}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#ebe7f1]"
              role="progressbar"
            >
              <span
                className="block h-full rounded-full bg-[#f06317] transition-[width] duration-500"
                style={{width: Math.max(progress, 2) + "%"}}
              />
            </div>
            <span className="grid h-8 min-w-[58px] place-items-center rounded-[6px] bg-[#f3f0f6] px-2 text-[9px] font-bold text-[#5d5665]">
              {progress}%
            </span>
          </div>
        ) : null}
      </article>
    );
  };

  const confirmNavigation = () => {
    if (!pendingNavigation) return;

    const destination = pendingNavigation;
    navigationAllowedRef.current = true;
    setPendingNavigation(null);
    window.location.assign(destination);
  };

  const workflowStepIndex = workflowStep === "configure" ? 0 : workflowStep === "processing" ? 1 : 2;
  const stepperItems = [
    {key: "configure", label: copy.configure},
    {key: "processing", label: copy.process},
    {key: "complete", label: workflow.complete},
  ] as const;

  return (
    <div {...getRootProps()} className="login-shell relative isolate flex min-h-dvh flex-col overflow-x-hidden text-[#21175c]">
      <FileFormatBadgeBackground />
      <DashboardHeader localePath="dashboard/translate" />

      {workflowStep === "configure" && isDragActive ? (
        <div
          aria-live="polite"
          className={`pointer-events-none fixed inset-0 z-[70] grid place-items-center border-[3px] border-dashed backdrop-blur-[2px] ${
            isDragReject
              ? "border-[#dc3b34] bg-[#fff1f0]/90 text-[#b42318]"
              : "border-[#f06317] bg-[#fff7f1]/90 text-[#21175c]"
          }`}
          role="status"
        >
          <div className="flex max-w-[420px] flex-col items-center px-6 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-white shadow-[0_12px_34px_rgba(33,23,92,0.14)]">
              <UploadCloud aria-hidden="true" className="size-8" />
            </span>
            <strong className="mt-4 text-[18px] font-bold">
              {isDragReject ? copy.formats : copy.dropActive}
            </strong>
            <span className="mt-2 text-[11px] font-medium text-[#77717f]">{copy.formats}</span>
          </div>
        </div>
      ) : null}

      <main
        className="dashboard-page-body relative z-10 mx-auto w-full max-w-[1600px] flex-1 px-4 pb-12 pt-5 sm:px-6 lg:px-8 xl:px-10"
        data-dashboard-page="translate"
      >
        <nav aria-label={copy.pageTitle} className="w-full rounded-[8px] border border-[#ddd8e6] bg-white/90 px-2 py-3 shadow-[0_6px_20px_rgba(33,23,92,0.04)] sm:px-8">
          <ol className="mx-auto grid w-full max-w-[860px] grid-cols-[minmax(0,1fr)_clamp(18px,5vw,72px)_minmax(0,1fr)_clamp(18px,5vw,72px)_minmax(0,1fr)] items-center">
            {stepperItems.map((step, index) => {
              const isCurrent = index === workflowStepIndex;
              const isCompleted = workflowStep === "complete" || index < workflowStepIndex;
              const isInProgress = isCurrent && workflowStep !== "complete";
              const statusText = isCompleted ? workflow.done : isInProgress ? copy.inProgress : copy.waiting;

              return (
                <Fragment key={step.key}>
                  {index > 0 ? (
                    <motion.li
                      animate={{backgroundColor: index <= workflowStepIndex ? "#a99adc" : "#ddd8e6"}}
                      aria-hidden="true"
                      className="h-px w-full"
                      transition={{duration: 0.35, ease: "easeOut"}}
                    />
                  ) : null}
                  <li
                    aria-current={isCurrent ? "step" : undefined}
                    className="flex min-w-0 flex-col items-center justify-self-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left"
                  >
                    <span className="grid size-7 shrink-0 place-items-center">
                      <AnimatePresence initial={false} mode="wait">
                        {isInProgress ? (
                        <motion.span
                          animate={{opacity: 1, scale: 1}}
                          aria-hidden="true"
                          className="translate-step-ring shrink-0"
                          exit={{opacity: 0, scale: 0.82}}
                          initial={{opacity: 0, scale: 0.72}}
                          key="in-progress"
                          transition={{duration: 0.2, ease: "easeOut"}}
                        >
                          <span>{index + 1}</span>
                        </motion.span>
                      ) : isCompleted ? (
                        <motion.span
                          animate={{opacity: 1, scale: 1}}
                          aria-hidden="true"
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-[#21175c] text-white"
                          exit={{opacity: 0, scale: 0.82}}
                          initial={{opacity: 0, scale: 0.72}}
                          key="completed"
                          transition={{duration: 0.2, ease: "easeOut"}}
                        >
                          <Check className="size-3.5" strokeWidth={3} />
                        </motion.span>
                      ) : (
                        <motion.span
                          animate={{opacity: 1, scale: 1}}
                          aria-hidden="true"
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-[#efedf2] text-[10px] font-bold text-[#8f8998]"
                          exit={{opacity: 0, scale: 0.82}}
                          initial={{opacity: 0, scale: 0.72}}
                          key="waiting"
                          transition={{duration: 0.2, ease: "easeOut"}}
                        >
                          {index + 1}
                        </motion.span>
                      )}
                      </AnimatePresence>
                    </span>
                    <span className="min-w-0">
                      <strong className={"block whitespace-nowrap text-[10px] font-bold transition-colors duration-300 sm:text-[12px] " + (isCompleted || isInProgress ? "text-[#21175c]" : "text-[#716b79]")}>
                        {step.label}
                      </strong>
                      <span className={"block whitespace-nowrap text-[8px] font-medium transition-colors duration-300 sm:text-[9px] " + (isInProgress ? "text-[#f06317]" : isCompleted ? "text-[#65508f]" : "text-[#9a95a1]")}>
                        {statusText}
                      </span>
                    </span>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -10}}
            initial={{opacity: 0, y: 14}}
            key={workflowStep}
            transition={{duration: 0.32, ease: [0.22, 1, 0.36, 1]}}
          >
            {workflowStep === "configure" ? (
        <div className="mt-5 grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(340px,470px)_minmax(0,1fr)]">
          <aside className="flex min-w-0 flex-col rounded-[8px] border border-[#d5d0dc] bg-white p-5 shadow-[0_10px_30px_rgba(33,23,92,0.06)] sm:p-6 lg:min-h-[690px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-bold leading-none text-[#21175c]">{copy.sourceFiles}</h2>
              <span className="rounded-full bg-[#f6f2fb] px-3 py-1.5 text-[11px] font-bold text-[#65508f]">
                {pendingFiles.length} / {MAX_FILES} {copy.fileCountUnit}
              </span>
            </div>

            <div
              className={`mt-5 flex min-h-[180px] flex-col items-center justify-center rounded-[8px] border-[1.5px] border-dashed px-5 py-6 text-center transition-colors ${
                isDragReject
                  ? "border-red-400 bg-red-50"
                  : isDragActive
                    ? "border-[#f06317] bg-[#fff5ef]"
                    : "border-[#9f96bd] bg-[#fcfaff]"
              } ${isFileLimitReached ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[#6250a5] hover:bg-[#f9f6ff]"}`}
              onClick={isFileLimitReached ? undefined : open}
            >
              <input {...getInputProps({"aria-label": copy.dropTitle})} />
              <span className="grid size-12 place-items-center rounded-full bg-[#f2edff] text-[#21175c]">
                <UploadCloud aria-hidden="true" className="size-6" strokeWidth={2} />
              </span>
              <strong className="mt-3 text-[13px] font-bold text-[#21175c]">
                {isDragActive ? copy.dropActive : `${copy.dropTitle} ${copy.dropDescription}`}
              </strong>
              <span className="mt-1.5 text-[10px] font-medium leading-4 text-[#8a8492]">{copy.formats}</span>
            </div>

            <p className="mt-4 text-[12px] font-bold text-[#30265c]">{copy.addedFiles}</p>

            <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-1">
              {pendingFiles.map((item) => {
                const extension = getFileExtension(item.metadata.name);
                const isActiveFile = item.id === selectedFileId;
                const itemConfig = fileConfigs[item.id] ?? createDefaultFileConfig();

                return (
                  <article
                    className={`relative isolate flex min-h-[68px] items-center gap-2 overflow-hidden rounded-[8px] border px-2.5 py-2 transition-colors ${
                      isActiveFile
                        ? "translate-source-file-active border-transparent"
                        : "border-[#e1dce9] bg-white hover:border-[#b8acd3]"
                    }`}
                    key={item.id}
                  >
                    <button
                      aria-pressed={isActiveFile}
                      className="relative z-[2] flex min-w-0 flex-1 items-center gap-3 rounded-[6px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c]"
                      onClick={() => {
                        setActiveFileId(item.id);
                        setGlossaryNotice("");
                      }}
                      title={`${copy.selectFileToConfigure}: ${item.metadata.name}`}
                      type="button"
                    >
                      <span
                        className="grid size-12 shrink-0 place-items-center rounded-[8px] border text-[9px] font-extrabold tracking-[0.03em]"
                        style={getFileTypeStyle(extension)}
                      >
                        {extension.slice(0, 5)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-[#30265c]">{item.metadata.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-[#8a8492]">
                          <span>{formatBytes(item.metadata.size)}</span>
                          <span aria-hidden="true">&middot;</span>
                          <img alt="" aria-hidden="true" className="h-3 w-[17px] rounded-[1px] border-[0.5px] border-black/70 object-cover" src={languageFlags[itemConfig.sourceLanguage]} />
                          <ArrowRight aria-hidden="true" className="size-2.5" />
                          <img alt="" aria-hidden="true" className="h-3 w-[17px] rounded-[1px] border-[0.5px] border-black/70 object-cover" src={languageFlags[itemConfig.targetLanguage]} />
                        </span>
                      </span>
                    </button>
                    <button
                      aria-label={`${copy.removeFile}: ${item.metadata.name}`}
                      className="relative z-[2] grid size-8 shrink-0 place-items-center rounded-full bg-[#f7f4fa] text-[#8f8998] transition-colors hover:bg-[#fff0e7] hover:text-[#d84f00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c]"
                      onClick={() => setPendingFiles(pendingFiles.filter((file) => file.id !== item.id))}
                      title={copy.removeFile}
                      type="button"
                    >
                      <X aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
                    </button>
                  </article>
                );
              })}
            </div>

            <div className={`mt-4 flex items-start gap-2.5 rounded-[8px] px-3 py-3 text-[10px] font-medium leading-4 ${
              isFileLimitReached ? "bg-[#fff0e7] text-[#a74410]" : "bg-[#fff5ef] text-[#96512d]"
            }`}>
              <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[#f06317]" strokeWidth={2.2} />
              <p>{isFileLimitReached ? copy.fileLimit : copy.fileHint}</p>
            </div>

            <button
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[7px] border border-[#3d2b83] bg-white px-4 text-[12px] font-bold text-[#30206f] transition-colors hover:border-[#f06317] hover:bg-[#fffaf7] hover:text-[#d84f00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isFileLimitReached}
              onClick={openUploadedFilesDialog}
              type="button"
            >
              <FolderOpen aria-hidden="true" className="size-4" strokeWidth={2.2} />
              {copy.addMoreFiles}
            </button>
          </aside>

          <section className="flex min-w-0 flex-col rounded-[8px] border border-[#d5d0dc] bg-white p-5 shadow-[0_10px_30px_rgba(33,23,92,0.06)] sm:p-6 lg:min-h-[690px]">
            <div className="flex min-h-12 min-w-0 items-center gap-3">
              {activeFile ? (
                <FileTypeTile className="size-12 rounded-[8px]" fileName={activeFile.metadata.name} />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-[8px] border border-[#c9c3d1] bg-[#f5f3f8] text-[#655f6d]">
                  <Settings2 aria-hidden="true" className="size-5" />
                </span>
              )}
              <h2 className="min-w-0 truncate text-[18px] font-bold leading-tight text-[#21175c]" title={activeFile?.metadata.name}>
                {activeFile?.metadata.name ?? copy.configuration}
              </h2>
            </div>

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)] items-end gap-2 sm:gap-3">
              <div className="min-w-0">
                <Label className="mb-2 block text-[12px] font-bold text-[#4c4655]">{copy.source}</Label>
                <Select disabled={!activeFile} onOpenChange={(open) => setOpenLanguageSelect(open ? "source" : null)} onValueChange={(value) => changeSourceLanguage(value as SupportedLanguageCode)} open={openLanguageSelect === "source"} value={sourceLanguage}>
                  <SelectTrigger className="h-11 w-full min-w-0 rounded-[6px] border-[#cfc9d8] bg-white px-3 text-[13px] shadow-none data-[size=default]:h-11 focus-visible:ring-[#c7bfff]">
                    <SelectValue>
                      <span className="flex min-w-0 items-center gap-2">
                        <img alt="" aria-hidden="true" className="h-4 w-[22px] shrink-0 rounded-[2px] border-[0.5px] border-black/80 object-cover" src={languageFlags[sourceLanguage]} />
                        <span className="truncate">{languageLabels[sourceLanguage][currentLocale]}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-[#d5d0dc] bg-white">
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <span className="flex items-center gap-2">
                          <img alt="" aria-hidden="true" className="h-4 w-[22px] rounded-[2px] border-[0.5px] border-black/80 object-cover" src={languageFlags[language.code]} />
                          {languageLabels[language.code][currentLocale]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button aria-label={copy.swapLanguages} className="mb-0.5 grid size-[42px] place-items-center rounded-full border border-[#c7bfff] bg-[#f8f6ff] text-[#21175c] transition-all hover:border-[#f06317] hover:bg-[#fff3ec] hover:text-[#d84f00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c] disabled:cursor-not-allowed disabled:opacity-40" disabled={!activeFile} onClick={swapLanguages} title={copy.swapLanguages} type="button">
                <ArrowLeftRight aria-hidden="true" className="size-[17px]" strokeWidth={2.2} />
              </button>

              <div className="min-w-0">
                <Label className="mb-2 block text-[12px] font-bold text-[#4c4655]">{copy.target}</Label>
                <Select disabled={!activeFile} onOpenChange={(open) => setOpenLanguageSelect(open ? "target" : null)} onValueChange={(value) => changeTargetLanguage(value as SupportedLanguageCode)} open={openLanguageSelect === "target"} value={targetLanguage}>
                  <SelectTrigger className="h-11 w-full min-w-0 rounded-[6px] border-[#cfc9d8] bg-white px-3 text-[13px] shadow-none data-[size=default]:h-11 focus-visible:ring-[#c7bfff]">
                    <SelectValue>
                      <span className="flex min-w-0 items-center gap-2">
                        <img alt="" aria-hidden="true" className="h-4 w-[22px] shrink-0 rounded-[2px] border-[0.5px] border-black/80 object-cover" src={languageFlags[targetLanguage]} />
                        <span className="truncate">{languageLabels[targetLanguage][currentLocale]}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-[#d5d0dc] bg-white">
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <span className="flex items-center gap-2">
                          <img alt="" aria-hidden="true" className="h-4 w-[22px] rounded-[2px] border-[0.5px] border-black/80 object-cover" src={languageFlags[language.code]} />
                          {languageLabels[language.code][currentLocale]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 border-t border-[#ebe8ee] pt-5">
              <h3 className="text-[16px] font-bold text-[#30265c]">{copy.options}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className={`flex min-h-[102px] items-center justify-between gap-3 rounded-[8px] border p-4 transition-colors ${translateImages ? "border-[#b9a8ff] bg-[#fbf9ff]" : "border-[#ded9e6] bg-white"}`}>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#30265c]">{copy.translateImages}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#827c89]">{copy.translateImagesDescription}</p>
                  </div>
                  <Switch aria-label={copy.translateImages} checked={translateImages} className="shrink-0 scale-105 data-[state=checked]:bg-[#2d1b78] data-[state=unchecked]:bg-[#d0cbd8]" disabled={!activeFile} onCheckedChange={(checked) => updateActiveFileConfig((currentConfig) => ({...currentConfig, translateImages: checked}))} />
                </div>

                <div className={`flex min-h-[102px] items-center justify-between gap-3 rounded-[8px] border p-4 transition-colors ${keepSourceText && hasSelectedGlossary ? "border-[#b9a8ff] bg-[#fbf9ff]" : "border-[#ded9e6] bg-white"}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-[#30265c]">{copy.keepSource}</p>
                      <button
                        aria-expanded={isKeepSourceHelpOpen}
                        aria-haspopup="dialog"
                        aria-label={copy.keepSourceHelp}
                        className="grid size-5 shrink-0 place-items-center rounded-full border border-[#f06317] text-[#f06317] transition-colors hover:bg-[#fff1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f06317]"
                        onClick={() => setIsKeepSourceHelpOpen(true)}
                        title={copy.keepSourceHelp}
                        type="button"
                      >
                        <Info aria-hidden="true" className="size-3" strokeWidth={2.3} />
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-[#827c89]">{copy.keepSourceDescription}</p>
                    <p className="mt-1 text-[11px] font-medium text-[#e45713]">{copy.infoHint}</p>
                  </div>
                  <Switch aria-label={copy.keepSource} checked={keepSourceText} className="shrink-0 scale-105 data-[state=checked]:bg-[#2d1b78] data-[state=unchecked]:bg-[#d0cbd8]" disabled={!activeFile || !hasSelectedGlossary} onCheckedChange={(checked) => updateActiveFileConfig((currentConfig) => ({...currentConfig, keepSourceText: checked}))} />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-[#ebe8ee] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[16px] font-bold text-[#30265c]">{copy.glossaries}</h3>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#21175c] bg-white px-3 text-[13px] font-bold text-[#21175c] transition-colors hover:bg-[#f3f0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c] disabled:cursor-not-allowed disabled:opacity-45" disabled={!activeFile} onClick={openCreateGlossary} type="button">
                    <Plus aria-hidden="true" className="size-4" />{copy.createGlossary}
                  </button>
                  <button className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[#f06317] bg-white px-3 text-[13px] font-bold text-[#d84f00] transition-colors hover:bg-[#fff3ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f06317] disabled:cursor-not-allowed disabled:opacity-55" disabled={!activeFile || isSuggesting} onClick={suggestGlossary} type="button">
                    {isSuggesting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}{isSuggesting ? copy.suggesting : copy.suggestGlossary}
                  </button>
                  <span className="rounded-full bg-[#eee9fb] px-3 py-1.5 text-[12px] font-bold text-[#65508f]">{selectedGlossaryIds.size} {copy.selected}</span>
                </div>
              </div>

              <div className="relative mt-4">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#827c89]" />
                <Input aria-label={copy.searchGlossary} className="h-12 rounded-[8px] border-[#cfc9d8] bg-white pl-12 text-[13px] shadow-none focus-visible:border-[#8f7bc0] focus-visible:ring-[#c7bfff]/30" disabled={!activeFile} onChange={(event) => setGlossarySearch(event.target.value)} placeholder={copy.searchGlossary} value={glossarySearch} />
              </div>

              <div className="mt-3 grid min-h-[154px] content-start grid-cols-1 gap-2.5 sm:grid-cols-2">
                {isLoadingGlossaries ? (
                  <div className="col-span-full flex min-h-[140px] items-center justify-center gap-2 text-[13px] text-[#77717f]"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />{copy.loadingGlossaries}</div>
                ) : glossaryLoadError ? (
                  <div className="col-span-full flex min-h-[140px] items-center justify-center text-center text-[13px] text-[#b42318]">{copy.glossaryError}</div>
                ) : glossaries.length === 0 ? (
                  <div className="col-span-full flex min-h-[140px] items-center justify-center text-center text-[13px] text-[#827c89]">{copy.emptyGlossaries}</div>
                ) : (
                  glossaries.map((glossary) => {
                    const isSelected = selectedGlossaryIds.has(glossary.id);
                    return (
                      <button aria-pressed={isSelected} className={`flex min-h-[70px] items-center gap-2.5 rounded-[8px] border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c] ${isSelected ? "border-[#4a3696] bg-[#faf8ff] shadow-[0_4px_14px_rgba(55,36,123,0.07)]" : "border-[#ded9e6] bg-white hover:border-[#aa9cc9] hover:bg-[#fdfcff]"}`} disabled={!activeFile} key={glossary.id} onClick={() => toggleGlossary(glossary.id)} type="button">
                        <span className={`grid size-6 shrink-0 place-items-center rounded-[5px] border ${isSelected ? "border-[#2d1b78] bg-[#2d1b78] text-white" : "border-[#aaa2b8] bg-white text-transparent"}`}>
                          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-[#30265c]" title={glossary.name}>{glossary.name}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[#827c89]">
                            <span>{languageName(glossary.sourceLanguage, currentLocale)}</span>
                            <ArrowRight aria-hidden="true" className="size-2.5" />
                            <span>{languageName(glossary.targetLanguage, currentLocale)}</span>
                            <span aria-hidden="true">&middot;</span>
                            <span>{new Intl.NumberFormat(currentLocale).format(glossary.termCount ?? 0)} {copy.terms}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex min-h-8 items-center justify-center gap-2">
                <button aria-label={copy.previousPage} className="grid size-7 place-items-center rounded-full border border-[#d5d0dc] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-35" disabled={glossaryPage <= 1 || isLoadingGlossaries} onClick={() => setGlossaryPage((currentPage) => Math.max(1, currentPage - 1))} title={copy.previousPage} type="button"><ChevronLeft aria-hidden="true" className="size-3.5" /></button>
                <span className="min-w-[66px] text-center text-[11px] font-semibold text-[#5f5968]">{copy.page} {glossaryPage} {copy.of} {glossaryPages}</span>
                <button aria-label={copy.nextPage} className="grid size-7 place-items-center rounded-full border border-[#d5d0dc] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-35" disabled={glossaryPage >= glossaryPages || isLoadingGlossaries} onClick={() => setGlossaryPage((currentPage) => Math.min(glossaryPages, currentPage + 1))} title={copy.nextPage} type="button"><ChevronRight aria-hidden="true" className="size-3.5" /></button>
              </div>
              <p aria-live="polite" className="mt-2 min-h-4 text-[11px] font-medium text-[#b24a00]">{glossaryNotice}</p>
            </div>

            <div className="mt-auto flex items-center justify-end border-t border-[#e5e1e9] pt-5">
              <button className="login-submit-button inline-flex h-10 items-center justify-center rounded-[7px] px-5 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!canStartTranslation} onClick={startWorkflow} type="button">
                <span className="relative z-10 flex items-center gap-2">{copy.startTranslation}<ArrowRight aria-hidden="true" className="size-4" /></span>
              </button>
            </div>
          </section>
        </div>
        ) : workflowStep === "processing" ? (
          <section className="mt-5 min-h-[430px] rounded-[8px] border border-[#d5d0dc] bg-white p-5 shadow-[0_10px_30px_rgba(33,23,92,0.06)] sm:p-7">
            <div className="flex items-center gap-3 border-b border-[#ebe8ee] pb-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#21175c] text-white">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[#ff8a45]" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold text-[#21175c]">{workflow.processingTitle}</h2>
                <p className="mt-1 text-[10px] text-[#827c89]">{workflow.fileProgress}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {pendingFiles.map((file) => renderTranslationFile(file, false))}
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-[7px] bg-[#f8f6ff] px-3 py-2.5 text-[9px] leading-4 text-[#65508f]">
              <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <p>{workflow.processingNote}</p>
            </div>

            <p aria-live="polite" className="mt-3 min-h-4 text-[10px] font-medium text-[#b42318]">
              {workflowNotice}
            </p>

            <div className="mt-4 border-t border-[#ebe8ee] pt-4">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-[6px] px-1 text-[10px] font-bold text-[#b42318] transition-colors hover:text-[#e04d14] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  isCancelling ||
                  cancellingFileId !== null ||
                  !Object.values(translationRuns).some((run) => !TERMINAL_TRANSLATION_STATUSES.has(run.status))
                }
                onClick={() => setIsCancelOpen(true)}
                type="button"
              >
                {isCancelling ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <X aria-hidden="true" className="size-3.5" />}
                {workflow.cancelTranslation}
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-5 min-h-[430px] rounded-[8px] border border-[#b8dfc4] bg-[#fcfffd] p-5 shadow-[0_10px_30px_rgba(33,23,92,0.05)] sm:p-7">
            <div className="flex min-h-[150px] flex-col items-center justify-center border-b border-[#e1eee5] bg-white px-4 py-6 text-center">
              <span className="grid size-12 place-items-center rounded-full border border-[#36a45a] bg-[#effaf2] text-[#16813d]">
                <Check aria-hidden="true" className="size-6" strokeWidth={2.8} />
              </span>
              <h2 className="mt-4 text-[17px] font-bold text-[#21175c]">
                {workflow.completionSummary
                  .replace("{completed}", String(completedRunsCount))
                  .replace("{total}", String(pendingFiles.length))}
              </h2>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[11px] font-bold text-[#30265c]">{workflow.translatedFiles}</h3>
              {isReconfigureMode ? (
                <span className="rounded-full bg-[#eee9fb] px-3 py-1 text-[9px] font-bold text-[#65508f]">
                  {reconfigureFileIds.size} / {pendingFiles.length} {copy.selected}
                </span>
              ) : null}
            </div>
            {isReconfigureMode ? (
              <p className="mt-1.5 text-[10px] text-[#77717f]">{workflow.reconfigureDescription}</p>
            ) : null}
            <div className="mt-3 space-y-3">
              {pendingFiles.map((file) => renderTranslationFile(file, true, isReconfigureMode))}
            </div>

            <p aria-live="polite" className="mt-3 min-h-4 text-[10px] font-medium text-[#b42318]">
              {workflowNotice}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-[#e1eee5] bg-white px-4 pt-4">
              {isReconfigureMode ? (
                <>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-[7px] border border-[#d5d0dc] bg-white px-5 text-[10px] font-bold text-[#5f5968] transition-colors hover:border-[#21175c] hover:text-[#21175c]"
                    onClick={cancelReconfigureMode}
                    type="button"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    className="login-submit-button inline-flex h-10 items-center justify-center rounded-[7px] px-5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={reconfigureFileIds.size === 0}
                    onClick={proceedReconfigure}
                    type="button"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {workflow.proceedReconfigure}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {retryableFileIds.length > 0 ? (
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] border border-[#3d2b83] bg-white px-5 text-[10px] font-bold text-[#30206f] transition-colors hover:border-[#f06317] hover:text-[#d84f00]"
                      onClick={retryAllTranslations}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                      {workflow.retryAll}
                    </button>
                  ) : null}
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] border border-[#3d2b83] bg-white px-5 text-[10px] font-bold text-[#30206f] transition-colors hover:border-[#f06317] hover:text-[#d84f00]"
                    onClick={startReconfigureMode}
                    type="button"
                  >
                    <Settings2 aria-hidden="true" className="size-4" />
                    {workflow.reconfigure}
                  </button>
                  <button
                    className="login-submit-button inline-flex h-10 items-center justify-center rounded-[7px] px-5 text-[10px] font-bold text-white"
                    onClick={requestNewTranslation}
                    type="button"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Plus aria-hidden="true" className="size-4" />
                      {workflow.newTranslation}
                    </span>
                  </button>
                </>
              )}
            </div>
          </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <DashboardFooter />

      <KeepSourceGuideDialog
        locale={currentLocale}
        onOpenChange={setIsKeepSourceHelpOpen}
        open={isKeepSourceHelpOpen}
        sourceLanguage={sourceLanguage}
      />

      <Dialog open={isPreviewNoticeOpen} onOpenChange={setIsPreviewNoticeOpen}>
        <DialogContent className="overflow-hidden rounded-[8px] border-[#d5d0dc] bg-white p-0 shadow-[0_24px_70px_rgba(33,23,92,0.2)] sm:max-w-[430px]">
          <div className="px-6 pb-6 pt-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#f5c5a8] bg-[#fff3eb] text-[#c94f0e]">
              <Construction aria-hidden="true" className="size-7" />
            </span>
            <DialogHeader className="mt-5 items-center text-center sm:text-center">
              <DialogTitle className="text-[19px] font-bold text-[#21175c]">
                {workflow.previewDevelopmentTitle}
              </DialogTitle>
              <DialogDescription className="max-w-[330px] text-[12px] leading-5 text-[#6f6a78]">
                {workflow.previewDevelopmentDescription}
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="flex-row justify-center border-t border-[#ebe8ee] bg-[#fcfbfd] px-6 py-4 sm:justify-center">
            <DialogClose asChild>
              <button
                className="inline-flex h-10 min-w-[112px] items-center justify-center rounded-[7px] bg-[#21175c] px-5 text-[11px] font-bold text-white transition-colors hover:bg-[#f06317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c] focus-visible:ring-offset-2"
                type="button"
              >
                {workflow.close}
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUploadedFilesOpen}
        onOpenChange={(open) => {
          setIsUploadedFilesOpen(open);
          if (!open) setSelectedUploadedDocuments({});
        }}
      >
        <DialogContent className="max-h-[88dvh] overflow-hidden rounded-[8px] border-[#d5d0dc] bg-white p-0 shadow-[0_24px_70px_rgba(33,23,92,0.2)] sm:max-w-[740px]">
          <DialogHeader className="border-b border-[#ebe8ee] px-5 py-4 sm:px-6">
            <DialogTitle className="text-[18px] text-[#21175c]">{copy.uploadedFilesTitle}</DialogTitle>
            <DialogDescription className="text-[11px] text-[#77717f]">{copy.uploadedFilesDescription}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 px-5 py-4 sm:px-6">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#827c89]" />
              <Input
                aria-label={copy.searchUploadedFiles}
                className="h-10 rounded-[7px] border-[#cfc9d8] bg-white pl-10 text-[12px] shadow-none focus-visible:border-[#8f7bc0] focus-visible:ring-[#c7bfff]/30"
                onChange={(event) => setUploadedFileSearch(event.target.value)}
                placeholder={copy.searchUploadedFiles}
                value={uploadedFileSearch}
              />
            </div>

            <div className="mt-4 max-h-[390px] min-h-[230px] space-y-2 overflow-y-auto pr-1">
              {isLoadingUploadedFiles ? (
                <div aria-label={copy.loadingUploadedFiles} className="space-y-2" role="status">
                  <span className="sr-only">{copy.loadingUploadedFiles}</span>
                  {Array.from({length: 5}, (_, index) => (
                    <div className="flex min-h-[61px] items-center gap-3 rounded-[8px] border border-[#e6e1eb] bg-white px-3 py-2.5" key={index}>
                      <Skeleton className="size-5 shrink-0 rounded-[5px]" />
                      <Skeleton className="size-10 shrink-0 rounded-[7px]" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-3 w-[min(72%,320px)]" />
                        <Skeleton className="h-2.5 w-[min(48%,220px)]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : uploadedFilesError ? (
                <div className="flex min-h-[230px] items-center justify-center text-center text-[11px] text-[#b42318]">
                  {copy.uploadedFilesError}
                </div>
              ) : uploadedDocuments.length === 0 ? (
                <div className="flex min-h-[230px] items-center justify-center text-center text-[11px] text-[#827c89]">
                  {copy.uploadedFilesEmpty}
                </div>
              ) : (
                <Fragment key={`${uploadedFilesPage}:${debouncedUploadedFileSearch}`}>
                  {uploadedDocuments.map((document, index) => {
                    const isAlreadyAdded = pendingFiles.some((file) => file.documentId === document.id);
                    const isSelected = Boolean(selectedUploadedDocuments[document.id]);
                    const isSelectionDisabled =
                      isAlreadyAdded || (!isSelected && selectedUploadedFilesCount >= uploadedFilesAvailableSlots);
                    const extension = getFileExtension(document.name);
                    const uploadedDate = new Date(document.uploadedAt);
                    const formattedUploadedDate = Number.isNaN(uploadedDate.getTime())
                      ? "-"
                      : new Intl.DateTimeFormat(currentLocale, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(uploadedDate);

                    return (
                      <div
                        className={`content-reveal flex min-w-0 items-center gap-3 rounded-[8px] border px-3 py-2.5 transition-colors ${
                          isSelected
                            ? "border-[#4a3696] bg-[#faf8ff]"
                            : "border-[#ded9e6] bg-white hover:border-[#aa9cc9]"
                        } ${isSelectionDisabled && !isSelected ? "opacity-55" : ""}`}
                        key={document.id}
                        style={{animationDelay: `${Math.min(index * 45, 225)}ms`}}
                      >
                        <Checkbox
                          aria-label={`${copy.uploadedFilesTitle}: ${document.name}`}
                          checked={isSelected}
                          className="size-5 shrink-0 rounded-[5px] border-[#8f84ad] data-[state=checked]:border-[#21175c] data-[state=checked]:bg-[#21175c]"
                          disabled={isSelectionDisabled}
                          id={`uploaded-document-${document.id}`}
                          onCheckedChange={() => toggleUploadedDocument(document)}
                        />
                        <Label
                          className={`flex min-w-0 flex-1 items-center gap-3 ${
                            isSelectionDisabled ? "cursor-not-allowed" : "cursor-pointer"
                          }`}
                          htmlFor={`uploaded-document-${document.id}`}
                        >
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-[7px] border text-[8px] font-extrabold tracking-[0.03em]"
                            style={getFileTypeStyle(extension)}
                          >
                            {extension.slice(0, 5)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-[11px] font-bold text-[#30265c]" title={document.name}>
                              {document.name}
                            </strong>
                            <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-[#827c89]">
                              <span>{formatBytes(document.size)}</span>
                              <span aria-hidden="true">&middot;</span>
                              <span>{copy.uploadedAt}: {formattedUploadedDate}</span>
                              <span aria-hidden="true">&middot;</span>
                              <span>{document.usageCount} {copy.usageCount}</span>
                            </span>
                          </span>
                        </Label>
                        {isAlreadyAdded ? (
                          <span className="shrink-0 rounded-full bg-[#eee9fb] px-2.5 py-1 text-[8px] font-bold text-[#65508f]">
                            {copy.alreadyAdded}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </Fragment>
              )}
            </div>

            <div className="mt-3 flex min-h-8 items-center justify-center gap-2">
              <button
                aria-label={copy.previousPage}
                className="grid size-7 place-items-center rounded-full border border-[#d5d0dc] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-35"
                disabled={uploadedFilesPage <= 1 || isLoadingUploadedFiles}
                onClick={() => setUploadedFilesPage((currentPage) => Math.max(1, currentPage - 1))}
                title={copy.previousPage}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-3.5" />
              </button>
              <span className="min-w-[66px] text-center text-[10px] font-semibold text-[#5f5968]">
                {copy.page} {uploadedFilesPage} {copy.of} {uploadedFilesPages}
              </span>
              <button
                aria-label={copy.nextPage}
                className="grid size-7 place-items-center rounded-full border border-[#d5d0dc] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-35"
                disabled={uploadedFilesPage >= uploadedFilesPages || isLoadingUploadedFiles}
                onClick={() => setUploadedFilesPage((currentPage) => Math.min(uploadedFilesPages, currentPage + 1))}
                title={copy.nextPage}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-3 border-t border-[#ebe8ee] px-5 py-4 sm:px-6">
            <span className="mr-auto text-[10px] font-semibold text-[#65508f]">
              {copy.uploadedSelectionSummary
                .replace("{selected}", String(selectedUploadedFilesCount))
                .replace("{available}", String(uploadedFilesAvailableSlots))}
            </span>
            <button
              className="h-9 rounded-[6px] border border-[#d5d0dc] bg-white px-4 text-[10px] font-bold text-[#5f5968] transition-colors hover:border-[#21175c] hover:text-[#21175c]"
              onClick={() => setIsUploadedFilesOpen(false)}
              type="button"
            >
              {copy.cancel}
            </button>
            <button
              className="login-submit-button inline-flex h-9 items-center justify-center rounded-[6px] px-4 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={selectedUploadedFilesCount === 0}
              onClick={addSelectedUploadedFiles}
              type="button"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Plus aria-hidden="true" className="size-3.5" />
                {copy.addSelectedFiles}
              </span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setGlossaryFormInitialValues(null);
        }}
      >
        <DialogContent className="max-h-[94vh] overflow-y-auto rounded-[8px] border-[#d5d0dc] bg-[#faf9fc] p-0 shadow-[0_24px_70px_rgba(33,23,92,0.2)] sm:max-w-[1120px]">
          <DialogHeader className="sticky top-0 z-10 border-b border-[#ebe8ee] bg-white px-6 py-5">
            <DialogTitle className="text-[20px] text-[#21175c]">{copy.createTitle}</DialogTitle>
            <DialogDescription className="text-[12px] text-[#77717f]">
              {activeFile?.metadata.name || copy.createDescription}
            </DialogDescription>
          </DialogHeader>

          {glossaryFormInitialValues ? (
            <div className="p-5 sm:p-6">
              <GlossaryFormView
                embedded
                initialValues={glossaryFormInitialValues}
                key={`translate-glossary-form-${glossaryFormVersion}`}
                lockLanguages
                mode="create"
                onCancel={() => {
                  setIsCreateOpen(false);
                  setGlossaryFormInitialValues(null);
                }}
                onSaved={handleGlossarySaved}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsFileId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsFileId(null);
        }}
      >
        <DialogContent className="rounded-[8px] border-[#d5d0dc] bg-white p-0 shadow-[0_24px_70px_rgba(33,23,92,0.2)] sm:max-w-[500px]">
          <DialogHeader className="border-b border-[#ebe8ee] px-6 py-5">
            <DialogTitle className="text-[18px] text-[#21175c]">{workflow.detailsTitle}</DialogTitle>
            <DialogDescription className="truncate text-[11px] text-[#77717f]">
              {detailsFile?.metadata.name}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold text-[#4c4655]">{workflow.errorDetails}</p>
            <p className="mt-2 rounded-[7px] border border-[#f0c4c0] bg-[#fff7f6] px-3 py-3 text-[11px] leading-5 text-[#9d2822]">
              {detailsRun?.errorMessage || workflow.genericError}
            </p>
          </div>
          <DialogFooter className="border-t border-[#ebe8ee] px-6 py-4">
            <button
              className="h-9 rounded-[6px] border border-[#d5d0dc] bg-white px-4 text-[10px] font-bold text-[#5f5968] transition-colors hover:border-[#21175c] hover:text-[#21175c]"
              onClick={() => setDetailsFileId(null)}
              type="button"
            >
              {workflow.close}
            </button>
            {detailsFile ? (
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] bg-[#21175c] px-4 text-[10px] font-bold text-white transition-colors hover:bg-[#f06317]"
                onClick={() => {
                  const fileId = detailsFile.id;
                  setDetailsFileId(null);
                  retryTranslation(fileId);
                }}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="size-3.5" />
                {workflow.retry}
              </button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent className="rounded-[8px] border-[#d5d0dc] bg-white shadow-[0_24px_70px_rgba(33,23,92,0.2)] sm:max-w-[460px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#21175c]">{workflow.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6f6a78]">{workflow.cancelDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-[6px] border-[#d5d0dc] bg-white text-[#5f5968] hover:border-[#21175c] hover:text-[#21175c]"
              disabled={isCancelling}
            >
              {workflow.keepProcessing}
            </AlertDialogCancel>
            <AlertDialogAction
              className="inline-flex items-center gap-2 rounded-[6px] bg-[#b42318] text-white hover:bg-[#d13b22] disabled:cursor-wait disabled:opacity-55"
              disabled={isCancelling}
              onClick={(event) => {
                event.preventDefault();
                void cancelCurrentTranslations();
              }}
            >
              {isCancelling ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <X aria-hidden="true" className="size-4" />}
              {workflow.confirmCancel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingNavigation !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNavigation(null);
        }}
      >
        <AlertDialogContent className="rounded-[8px] border-[#d5d0dc] bg-white shadow-[0_24px_70px_rgba(33,23,92,0.2)] sm:max-w-[460px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#21175c]">{copy.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6f6a78]">{copy.leaveDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[6px] border-[#d5d0dc] bg-white text-[#5f5968] hover:border-[#21175c] hover:text-[#21175c]">
              {copy.stayOnPage}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[6px] bg-[#21175c] text-white hover:bg-[#f06317]"
              onClick={confirmNavigation}
            >
              {copy.leavePage}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
