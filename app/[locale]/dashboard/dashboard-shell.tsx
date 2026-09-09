"use client";

import {
  ArrowRight,
  BookOpenText,
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  History,
  Info,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  Share2,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {useLocale} from "next-intl";
import {type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useDropzone} from "react-dropzone";
import {AuthService, DocumentService, GlossaryService, releaseNotesService, TranslationService, type ReleaseNote} from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {FileTypeTile} from "@/components/file-type-tile";
import {LanguageDisplay} from "@/components/language-display";
import {TranslationDetailDialog, type TranslationDetailJob} from "@/components/translation-detail-dialog";
import {Link, useRouter} from "@/i18n/routing";
import {usePendingUploadStore} from "@/lib/pending-upload-store";
import type {GlossaryResponse, StatusEnum, TranslationHistoryResponse} from "@/lib/types";
import {getGlossaryLanguageFlag, glossaryCopy} from "./glossaries/glossary-copy";

const USERNAME_STORAGE_KEY = "glossaryai_username";
const FALLBACK_USERNAME = "User";

const languages = [
  {
    code: "en",
    label: "English",
    tag: "EN",
    flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ec-1f1e7.svg",
  },
  {
    code: "vi",
    label: "Tiếng Việt",
    tag: "VI",
    flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1fb-1f1f3.svg",
  },
  {
    code: "ja",
    label: "日本語",
    tag: "JA",
    flag: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f1ef-1f1f5.svg",
  },
] as const;

type AppLocale = (typeof languages)[number]["code"];

type DashboardGlossaryShareDialogProps = {
  copy: (typeof glossaryCopy)[AppLocale];
  glossary: GlossaryResponse | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

const GlossaryShareDialog = dynamic<DashboardGlossaryShareDialogProps>(
  () => import("./glossaries/glossary-shared").then((module) => module.GlossaryShareDialog),
  {ssr: false},
);
type NavKey = "home" | "glossaries" | "history" | "guidance";
type StatKey = "translations" | "glossaries" | "documents" | "processing";
type DashboardStats = Record<StatKey, number | null>;
type FileFormatBadgePosition = {
  bottom?: string;
  delay?: string;
  duration: string;
  left?: string;
  right?: string;
  top?: string;
};

type DashboardCopy = {
  nav: Record<NavKey, string>;
  heroTitle: string;
  heroDescription: string;
  stats: Record<StatKey, string>;
  newTranslation: string;
  contact: string;
  mainPages: string;
  addressLabel: string;
  internalExtLabel: string;
  emailLabel: string;
  address: string;
  internalExt: string;
  email: string;
  mainPageLinks: string[];
  copyright: string;
  rights: string;
  languageLabel: string;
  userGreeting: string;
  logout: string;
  logoutConfirmTitle: string;
  logoutConfirmDescription: string;
  logoutCancel: string;
  logoutConfirm: string;
  releaseNotes: string;
  releaseNotesLoading: string;
  releaseNotesEmpty: string;
  releaseNotesError: string;
  releaseNotesLatest: string;
  releaseNotesOpen: string;
  workspaceEyebrow: string;
  workspaceGreeting: string;
  quickStart: string;
  dropFilesTitle: string;
  dropFilesActive: string;
  dropFilesDescription: string;
  selectedFiles: string;
  proceedTranslation: string;
  removeFile: string;
  fileLimitReached: string;
  recentTranslations: string;
  recentTranslationsEmpty: string;
  glossaryList: string;
  glossaryListEmpty: string;
  viewAll: string;
  termsLabel: string;
};

const dashboardCopy: Record<AppLocale, DashboardCopy> = {
  en: {
    nav: {
      home: "Home",
      glossaries: "Glossaries",
      history: "History",
      guidance: "User Guidance",
    },
    heroTitle: "Smart Translation Management",
    heroDescription:
      "A comprehensive translation platform for managing domain glossaries, tracking translation history, and digitizing documents with artificial intelligence.",
    stats: {
      translations: "Total Translations",
      glossaries: "Active Glossaries",
      documents: "Documents Uploaded",
      processing: "Files Processing",
    },
    newTranslation: "New Translation",
    contact: "Contact",
    mainPages: "Main pages",
    addressLabel: "Address:",
    internalExtLabel: "Internal Ext:",
    emailLabel: "Email:",
    address:
      "Waseco Building, Block B, 3F, Room 302, 10 Pho Quang Street, Tan Son Hoa Ward, Ho Chi Minh City",
    internalExt: "5903",
    email: "aiic-support@fujinet.net",
    mainPageLinks: ["FUJINET SYSTEMS", "FUJINET AI INNOVATION CENTER", "AI SERVICE SOLUTIONS"],
    copyright: "© FUJINET SYSTEMS JOINT STOCK COMPANY (FUJINET SYSTEMS JSC)",
    rights: "All rights reserved.",
    languageLabel: "Language",
    userGreeting: "Welcome",
    logout: "Log out",
    logoutConfirmTitle: "Do you want to log out?",
    logoutConfirmDescription: "Your current session will end.",
    logoutCancel: "Cancel",
    logoutConfirm: "Log out",
    releaseNotes: "Release Notes",
    releaseNotesLoading: "Loading release notes...",
    releaseNotesEmpty: "No release notes available.",
    releaseNotesError: "Unable to load release notes.",
    releaseNotesLatest: "Latest",
    releaseNotesOpen: "Open release notes",
    workspaceEyebrow: "Workspace Dashboard",
    workspaceGreeting: "Welcome to GlossaryAI",
    quickStart: "Create New Translation",
    dropFilesTitle: "Drop files here or click to select.",
    dropFilesActive: "Drop the files to upload",
    dropFilesDescription: "Supported formats: PDF, DOCX, PPTX, XLSX, HTML, MD, TXT, IMAGE.",
    selectedFiles: "files selected",
    proceedTranslation: "Proceed to Translation",
    removeFile: "Remove file",
    fileLimitReached: "Maximum of 5 files reached. Remove a file to add another.",
    recentTranslations: "Recent Translations",
    recentTranslationsEmpty: "No recent translations yet.",
    glossaryList: "My Glossaries",
    glossaryListEmpty: "No glossaries available yet.",
    viewAll: "View all",
    termsLabel: "terms",
  },
  vi: {
    nav: {
      home: "Trang chủ",
      glossaries: "Bộ thuật ngữ",
      history: "Lịch sử",
      guidance: "Hướng dẫn",
    },
    heroTitle: "Quản lý Dịch thuật Thông minh",
    heroDescription:
      "Nền tảng hỗ trợ biên phiên dịch toàn diện. Quản lý hệ thống thuật ngữ chuyên ngành, theo dõi lịch sử dịch và số hóa tài liệu với trí tuệ nhân tạo.",
    stats: {
      translations: "Tổng bản dịch",
      glossaries: "Bộ thuật ngữ hoạt động",
      documents: "Tài liệu đã tải lên",
      processing: "Số file đang xử lý",
    },
    newTranslation: "Bản dịch mới",
    contact: "Liên hệ",
    mainPages: "Trang chính",
    addressLabel: "Địa chỉ:",
    internalExtLabel: "Số nội bộ:",
    emailLabel: "Email:",
    address:
      "Tòa nhà Waseco, Khối B, Tầng 3, Phòng 302, Số 10 đường Phổ Quang, Phường Tân Sơn Hòa, Thành phố Hồ Chí Minh",
    internalExt: "5903",
    email: "aiic-support@fujinet.net",
    mainPageLinks: ["FUJINET SYSTEMS", "FUJINET AI INNOVATION CENTER", "AI SERVICE SOLUTIONS"],
    copyright: "© FUJINET SYSTEMS JOINT STOCK COMPANY (FUJINET SYSTEMS JSC)",
    rights: "Đã đăng ký bản quyền.",
    languageLabel: "Ngôn ngữ",
    userGreeting: "Xin chào",
    logout: "Đăng xuất",
    logoutConfirmTitle: "Bạn có muốn đăng xuất không?",
    logoutConfirmDescription: "Phiên làm việc hiện tại của bạn sẽ kết thúc.",
    logoutCancel: "Hủy",
    logoutConfirm: "Đăng xuất",
    releaseNotes: "Nhật ký thay đổi",
    releaseNotesLoading: "Đang tải nhật ký thay đổi...",
    releaseNotesEmpty: "Chưa có thông tin thay đổi.",
    releaseNotesError: "Không thể tải nhật ký thay đổi.",
    releaseNotesLatest: "Mới nhất",
    releaseNotesOpen: "Mở nhật ký thay đổi",
    workspaceEyebrow: "Bảng điều khiển Workspace",
    workspaceGreeting: "Chào mừng đến với GlossaryAI",
    quickStart: "Tạo bản dịch mới",
    dropFilesTitle: "Thả tệp vào đây hoặc nhấn để chọn.",
    dropFilesActive: "Thả tệp để tải lên",
    dropFilesDescription: "Hỗ trợ các định dạng: PDF, DOCX, PPTX, XLSX, HTML, MD, TXT, IMAGE.",
    selectedFiles: "tệp đã chọn",
    proceedTranslation: "Tiến hành dịch",
    removeFile: "Xóa tệp",
    fileLimitReached: "Đã đạt giới hạn 5 tệp. Hãy xóa một tệp để thêm tệp khác.",
    recentTranslations: "Bản dịch gần đây",
    recentTranslationsEmpty: "Chưa có bản dịch gần đây.",
    glossaryList: "Glossary của tôi",
    glossaryListEmpty: "Chưa có glossary nào.",
    viewAll: "Xem tất cả",
    termsLabel: "thuật ngữ",
  },
  ja: {
    nav: {
      home: "ホーム",
      glossaries: "用語集",
      history: "履歴",
      guidance: "ガイド",
    },
    heroTitle: "スマート翻訳管理",
    heroDescription:
      "組織全体の翻訳プロセスをサポートし、業界専門の用語集、翻訳履歴、AI によるドキュメント処理を一元管理します。",
    stats: {
      translations: "総翻訳数",
      glossaries: "有効な用語集",
      documents: "アップロード文書",
      processing: "処理中のファイル数",
    },
    newTranslation: "新規翻訳",
    contact: "お問い合わせ",
    mainPages: "メインページ",
    addressLabel: "住所:",
    internalExtLabel: "内線:",
    emailLabel: "メール:",
    address:
      "Wasecoビル B棟 3階 302号室、10 Pho Quang Street、Tan Son Hoa Ward、Ho Chi Minh City",
    internalExt: "5903",
    email: "aiic-support@fujinet.net",
    mainPageLinks: ["FUJINET SYSTEMS", "FUJINET AI INNOVATION CENTER", "AI SERVICE SOLUTIONS"],
    copyright: "© FUJINET SYSTEMS JOINT STOCK COMPANY (FUJINET SYSTEMS JSC)",
    rights: "無断転載を禁じます。",
    languageLabel: "言語",
    userGreeting: "ようこそ",
    logout: "ログアウト",
    logoutConfirmTitle: "ログアウトしますか？",
    logoutConfirmDescription: "現在のセッションは終了します。",
    logoutCancel: "キャンセル",
    logoutConfirm: "ログアウト",
    releaseNotes: "リリースノート",
    releaseNotesLoading: "リリースノートを読み込んでいます...",
    releaseNotesEmpty: "表示できるリリースノートはありません。",
    releaseNotesError: "リリースノートを読み込めません。",
    releaseNotesLatest: "最新",
    releaseNotesOpen: "リリースノートを開く",
    workspaceEyebrow: "ワークスペースダッシュボード",
    workspaceGreeting: "GlossaryAIへようこそ",
    quickStart: "新規翻訳を作成",
    dropFilesTitle: "ここにファイルをドロップ、またはクリックして選択。",
    dropFilesActive: "ファイルをドロップしてアップロード",
    dropFilesDescription: "対応形式: PDF、DOCX、PPTX、XLSX、HTML、MD、TXT、IMAGE。",
    selectedFiles: "個のファイルを選択済み",
    proceedTranslation: "翻訳を開始",
    removeFile: "ファイルを削除",
    fileLimitReached: "5ファイルの上限に達しました。別のファイルを追加するには、ファイルを削除してください。",
    recentTranslations: "最近の翻訳",
    recentTranslationsEmpty: "最近の翻訳はまだありません。",
    glossaryList: "マイ用語集",
    glossaryListEmpty: "用語集はまだありません。",
    viewAll: "すべて表示",
    termsLabel: "用語",
  },
};

const publicAssetPath = (path: `/${string}`) => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/new";

  return `${basePath}${path}`;
};

type DashboardLocalePath = "dashboard" | `dashboard/${string}` | "user-guidance";

const localizedDashboardPath = (locale: AppLocale, path: DashboardLocalePath = "dashboard") => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/new";

  return `${basePath}/${locale}/${path}/`;
};

const navItems: Array<{key: NavKey; href: string}> = [
  {key: "home", href: "/dashboard"},
  {key: "glossaries", href: "/dashboard/glossaries"},
  {key: "history", href: "/dashboard/history"},
  {key: "guidance", href: "/user-guidance"},
];

const statItems: Array<{key: StatKey; icon: LucideIcon; href: string; labelColor: string}> = [
  {key: "translations", icon: FileText, href: "/dashboard/history", labelColor: "text-[#21175c]"},
  {key: "glossaries", icon: BookOpenText, href: "/dashboard/glossaries", labelColor: "text-[#b24a00]"},
  {key: "documents", icon: UploadCloud, href: "/dashboard/documents", labelColor: "text-[#4b2614]"},
  {key: "processing", icon: LoaderCircle, href: "/dashboard/history?status=processing", labelColor: "text-[#0f766e]"},
];

const dashboardStatusLabels: Record<AppLocale, Record<StatusEnum, string>> = {
  vi: {
    pending: "Chờ xử lý",
    translating: "Đang xử lý",
    completed: "Hoàn thành",
    failed: "Thất bại",
    cancelled: "Đã hủy",
  },
  en: {
    pending: "Pending",
    translating: "Processing",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  },
  ja: {
    pending: "待機中",
    translating: "処理中",
    completed: "完了",
    failed: "失敗",
    cancelled: "キャンセル済み",
  },
};

const fileFormatTypes = ["PDF", "DOCX", "PPTX", "XLSX", "HTML", "MD", "TXT", "PNG", "JPEG"] as const;
const dashboardAcceptedFileExtensions = new Set(["pdf", "docx", "pptx", "xlsx", "html", "htm", "md", "txt", "png", "jpeg", "jpg"]);

function isSupportedDashboardFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  return Boolean(extension && dashboardAcceptedFileExtensions.has(extension));
}
const fileFormatColors: Record<(typeof fileFormatTypes)[number], string> = {
  PDF: "#E53935",
  DOCX: "#1B65C2",
  PPTX: "#D83B01",
  XLSX: "#107C41",
  HTML: "#E34F26",
  MD: "#6B46C1",
  TXT: "#64748B",
  PNG: "#0891B2",
  JPEG: "#D97706",
};

const fileFormatBadgePositions: FileFormatBadgePosition[] = [
  {top: "12%", left: "8%", duration: "8.5s"},
  {top: "18%", right: "17%", duration: "9.4s", delay: "-1.4s"},
  {top: "34%", left: "23%", duration: "10.2s", delay: "-3s"},
  {top: "42%", right: "9%", duration: "8.8s", delay: "-2.2s"},
  {top: "58%", left: "12%", duration: "11s", delay: "-4.6s"},
  {top: "66%", right: "28%", duration: "9.8s", delay: "-5.2s"},
  {bottom: "16%", left: "36%", duration: "10.8s", delay: "-6.2s"},
  {bottom: "11%", right: "12%", duration: "9.2s", delay: "-3.8s"},
  {bottom: "28%", left: "5%", duration: "12s", delay: "-7s"},
  {top: "8%", left: "38%", duration: "9.6s", delay: "-2.8s"},
  {top: "27%", left: "5%", duration: "11.4s", delay: "-5.5s"},
  {top: "30%", right: "34%", duration: "10.6s", delay: "-1.8s"},
  {top: "51%", left: "31%", duration: "9.4s", delay: "-7.4s"},
  {top: "54%", right: "41%", duration: "12.4s", delay: "-4.2s"},
  {bottom: "34%", right: "4%", duration: "10.4s", delay: "-8.1s"},
  {bottom: "23%", left: "18%", duration: "9.7s", delay: "-3.4s"},
  {bottom: "6%", left: "57%", duration: "11.8s", delay: "-6.7s"},
  {top: "72%", right: "19%", duration: "10.9s", delay: "-9.1s"},
  {top: "6%", right: "38%", duration: "11.2s", delay: "-10.1s"},
  {top: "23%", left: "52%", duration: "9.9s", delay: "-6.4s"},
  {top: "38%", left: "47%", duration: "12.2s", delay: "-8.8s"},
  {top: "46%", left: "3%", duration: "10.1s", delay: "-11.3s"},
  {top: "63%", left: "49%", duration: "11.7s", delay: "-5.9s"},
  {bottom: "7%", right: "36%", duration: "9.3s", delay: "-12.1s"},
  {bottom: "43%", right: "22%", duration: "10.7s", delay: "-7.9s"},
  {bottom: "37%", left: "20%", duration: "12.8s", delay: "-4.7s"},
  {bottom: "4%", left: "8%", duration: "10.5s", delay: "-13.2s"},
  {top: "14%", left: "64%", duration: "9.1s", delay: "-14.2s"},
  {top: "21%", left: "28%", duration: "11.1s", delay: "-8.3s"},
  {top: "35%", right: "2%", duration: "10.3s", delay: "-6.9s"},
  {top: "49%", right: "54%", duration: "12.1s", delay: "-10.7s"},
  {top: "57%", right: "16%", duration: "9.5s", delay: "-12.8s"},
  {bottom: "19%", right: "47%", duration: "10.6s", delay: "-15.1s"},
  {bottom: "30%", left: "59%", duration: "11.5s", delay: "-9.4s"},
  {bottom: "13%", left: "25%", duration: "9.8s", delay: "-11.9s"},
  {bottom: "3%", right: "6%", duration: "12.6s", delay: "-7.2s"},
] as const;

const backgroundFileFormats = fileFormatBadgePositions.map((position, index) => ({
  label: fileFormatTypes[index % fileFormatTypes.length],
  color: fileFormatColors[fileFormatTypes[index % fileFormatTypes.length]],
  ...position,
}));

export function FileFormatBadgeBackground() {
  return (
    <div aria-hidden="true" className="auth-file-format-background">
      {backgroundFileFormats.map((fileFormat, index) => (
        <span
          className="auth-file-format-token"
          key={`${fileFormat.label}-${index}`}
          style={
            {
              "--badge-animation-delay": fileFormat.delay ?? "0s",
              "--badge-animation-duration": fileFormat.duration,
              "--badge-color": fileFormat.color,
              backgroundColor: `${fileFormat.color}14`,
              borderColor: fileFormat.color,
              bottom: fileFormat.bottom,
              color: fileFormat.color,
              left: fileFormat.left,
              right: fileFormat.right,
              top: fileFormat.top,
            } as CSSProperties
          }
        >
          {fileFormat.label}
        </span>
      ))}
    </div>
  );
}

const initialStats: DashboardStats = {
  translations: null,
  glossaries: null,
  documents: null,
  processing: null,
};

const isAppLocale = (locale: string): locale is AppLocale =>
  languages.some((language) => language.code === locale);

function getInitial(username: string) {
  const normalizedUsername = username.trim();

  return Array.from(normalizedUsername)[0]?.toUpperCase() ?? "U";
}

function formatStatValue(value: number | null, locale: AppLocale, isLoading: boolean) {
  if (isLoading) {
    return "...";
  }

  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat(locale).format(value);
}

function getReleaseChanges(note: ReleaseNote, locale: AppLocale) {
  if (Array.isArray(note.changes)) {
    return note.changes;
  }

  return note.changes[locale] ?? note.changes.en ?? Object.values(note.changes)[0] ?? [];
}

function getReleaseDateTime(date: string) {
  const time = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getSortedReleases(releases: ReleaseNote[]) {
  return [...releases].sort((currentRelease, nextRelease) => {
    const dateDiff = getReleaseDateTime(nextRelease.date) - getReleaseDateTime(currentRelease.date);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return nextRelease.version.localeCompare(currentRelease.version);
  });
}

function formatReleaseDate(date: string, locale: AppLocale) {
  const time = getReleaseDateTime(date);

  if (!time) {
    return date;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(time);
}

export function DashboardHeader({
  activeNav,
  disableNewTranslation = false,
  localePath = "dashboard",
}: {
  activeNav?: NavKey;
  disableNewTranslation?: boolean;
  localePath?: DashboardLocalePath;
}) {
  const locale = useLocale();
  const currentLocale = isAppLocale(locale) ? locale : "en";
  const copy = dashboardCopy[currentLocale];
  const newTranslationContent = (
    <span className="relative z-10 flex items-center gap-2">
      <Plus aria-hidden="true" className="size-4" strokeWidth={2.4} />
      <span className="hidden xl:inline">{copy.quickStart}</span>
    </span>
  );

  return (
    <header className="relative z-50 flex h-[68px] items-center border-b border-[#d5d0dc] bg-white/78 px-3 backdrop-blur-xl sm:px-8">
      <Link aria-label="GlossaryAI home" className="flex shrink-0 items-center gap-1" href="/dashboard">
        <Image
          alt="GlossaryAI logo"
          className="-my-3 h-auto w-[86px] sm:w-[100px]"
          height={500}
          priority
          src={publicAssetPath("/glossaryai-logo.svg")}
          width={500}
        />
        <span className="dashboard-brand-wordmark hidden text-[24px] leading-none text-[#24314d] md:inline">
          Glossary<span className="text-[#f06317]">AI</span>
        </span>
      </Link>

      <nav
        aria-label="Main navigation"
        className="ml-10 mr-auto hidden h-full items-center gap-8 text-[15px] font-medium text-[#21175c] lg:flex xl:ml-14 xl:gap-11"
      >
        {navItems.map((item) => {
          const isActive = item.key === activeNav;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`dashboard-nav-link flex h-full items-center transition-colors hover:text-[#f06317] ${
                isActive ? "is-active text-[#f06317]" : "text-[#21175c]"
              }`}
              href={item.href}
              key={item.key}
            >
              <span>{copy.nav[item.key]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5 text-[13px] font-medium text-[#1f2537] sm:gap-3">
        {disableNewTranslation ? (
          <button
            aria-label={copy.quickStart}
            className="login-submit-button inline-flex h-10 cursor-not-allowed items-center justify-center rounded-[10px] px-3.5 text-[13px] font-bold text-white opacity-45"
            disabled
            type="button"
          >
            {newTranslationContent}
          </button>
        ) : (
          <Link
            className="login-submit-button inline-flex h-10 items-center justify-center rounded-[10px] px-3.5 text-[13px] font-bold text-white"
            href="/dashboard/translate"
          >
            {newTranslationContent}
          </Link>
        )}
        <span className="hidden sm:inline-flex">
          <DashboardReleaseNotes copy={copy} locale={currentLocale} />
        </span>
        <DashboardLanguageSwitcher label={copy.languageLabel} locale={currentLocale} localePath={localePath} />
        <DashboardUserInfo greeting={copy.userGreeting} />
        <DashboardLogoutButton copy={copy} />
      </div>
    </header>
  );
}

export function DashboardFooter() {
  const locale = useLocale();
  const currentLocale = isAppLocale(locale) ? locale : "en";
  const copy = dashboardCopy[currentLocale];

  return (
    <footer className="relative z-10 border-t border-[#d5d0dc] bg-transparent backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1120px] gap-10 px-6 py-2 pt-6 md:grid-cols-[340px_1fr_230px] md:items-start lg:px-0">
        <div className="flex justify-center md:justify-start">
          <Image
            alt="AI Innovation Center"
            className="h-auto w-[315px] max-w-full"
            height={116}
            src={publicAssetPath("/aiic-logo.png")}
            width={315}
          />
        </div>

        <div className="text-[14px] leading-7 text-[#484552]">
          <h2 className="mb-2 text-[24px] font-bold text-[#ee7822]">{copy.contact}</h2>
          <p>
            <span className="font-bold text-[#21175c]">{copy.addressLabel}</span> {copy.address}
          </p>
          <p>
            <span className="font-bold text-[#21175c]">{copy.internalExtLabel}</span> {copy.internalExt}
          </p>
          <p>
            <span className="font-bold text-[#21175c]">{copy.emailLabel}</span> {copy.email}
          </p>
        </div>

        <div className="text-[14px] leading-7 text-[#484552]">
          <h2 className="mb-2 text-[24px] font-bold text-[#ee7822]">{copy.mainPages}</h2>
          {copy.mainPageLinks.map((mainPageLink) => (
            <p key={mainPageLink}>{mainPageLink}</p>
          ))}
        </div>
      </div>

      <div className="border-t border-[#d5d0dc] px-6 py-2 text-center text-[11px] font-light leading-6 text-[#3d3a45]">
        <p>{copy.copyright}</p>
      </div>
    </footer>
  );
}

export function DashboardShell() {
  const locale = useLocale();
  const currentLocale = isAppLocale(locale) ? locale : "en";
  const copy = dashboardCopy[currentLocale];
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [recentTranslations, setRecentTranslations] = useState<TranslationHistoryResponse[]>([]);
  const [recentGlossaries, setRecentGlossaries] = useState<GlossaryResponse[]>([]);
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationDetailJob | null>(null);
  const [shareGlossary, setShareGlossary] = useState<GlossaryResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      setIsStatsLoading(true);

      try {
        const [translationsResponse, glossariesResponse, documentsResponse, translatingResponse, pendingResponse] = await Promise.all([
          TranslationService.getTranslationHistory({page: 1, size: 5, sort: "startedAt:desc"}),
          GlossaryService.getGlossaries({page: 1, size: 100}),
          DocumentService.getSourceDocuments(1, 1),
          TranslationService.getTranslationHistory({page: 1, size: 1, status: "translating"}),
          TranslationService.getTranslationHistory({page: 1, size: 1, status: "pending"}),
        ]);

        if (!isMounted) {
          return;
        }

        setStats({
          translations: translationsResponse.total,
          glossaries: glossariesResponse.total,
          documents: documentsResponse.total,
          processing: translatingResponse.total + pendingResponse.total,
        });
        setRecentTranslations(
          [...(translationsResponse.items ?? [])]
            .sort((currentTranslation, nextTranslation) => {
              const currentTime = new Date(currentTranslation.startedAt).getTime();
              const nextTime = new Date(nextTranslation.startedAt).getTime();

              return (Number.isNaN(nextTime) ? 0 : nextTime) - (Number.isNaN(currentTime) ? 0 : currentTime);
            })
            .slice(0, 4),
        );
        setRecentGlossaries(
          [...(glossariesResponse.items ?? [])]
            .sort((currentGlossary, nextGlossary) => {
              const currentUpdatedAt = Date.parse(currentGlossary.updatedAt || currentGlossary.createdAt);
              const nextUpdatedAt = Date.parse(nextGlossary.updatedAt || nextGlossary.createdAt);

              return (Number.isNaN(nextUpdatedAt) ? 0 : nextUpdatedAt) - (Number.isNaN(currentUpdatedAt) ? 0 : currentUpdatedAt);
            })
            .slice(0, 4),
        );
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);

        if (isMounted) {
          setStats(initialStats);
          setRecentTranslations([]);
          setRecentGlossaries([]);
        }
      } finally {
        if (isMounted) {
          setIsStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="login-shell relative isolate flex min-h-dvh overflow-hidden flex-col text-[#1f2537]">
      <FileFormatBadgeBackground />

      <DashboardHeader activeNav="home" />

      <main
        className="dashboard-page-body relative z-10 flex flex-1 flex-col px-6 pb-10 pt-20 sm:px-10 lg:pb-14 lg:pt-24"
        data-dashboard-page="home"
      >
        <section className="mx-auto w-full max-w-[1360px]">
          <DashboardHeroDropzone copy={copy} currentLocale={currentLocale} isStatsLoading={isStatsLoading} stats={stats} />
        </section>

        <section className="mx-auto mt-5 grid w-full max-w-[1360px] items-stretch gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          <DashboardDataPanel
            icon={History}
            title={copy.recentTranslations}
          >
            {recentTranslations.length > 0 ? (
              <div className="content-reveal space-y-2">
                {recentTranslations.slice(0, 4).map((translation) => (
                  <DashboardRecentTranslationItem
                    key={translation.id}
                    locale={currentLocale}
                    onSelect={() => setSelectedTranslation(translation)}
                    translation={translation}
                  />
                ))}
                <Link
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#c9bfda] bg-white/55 px-4 text-[13px] font-bold text-[#f06317] transition-colors hover:border-[#f06317] hover:bg-[#fff7f2] hover:text-[#21175c]"
                  href="/dashboard/history"
                >
                  {copy.viewAll}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            ) : (
              <DashboardEmptyPanel message={copy.recentTranslationsEmpty} />
            )}
          </DashboardDataPanel>

          <DashboardDataPanel
            icon={BookOpenText}
            title={copy.glossaryList}
          >
            {recentGlossaries.length > 0 ? (
              <div className="content-reveal grid grid-cols-1 gap-x-3 gap-y-5 pt-3 sm:grid-cols-2">
                {recentGlossaries.map((glossary) => (
                  <DashboardGlossaryItem
                    glossary={glossary}
                    key={glossary.id}
                    locale={currentLocale}
                    onShare={() => setShareGlossary(glossary)}
                    termsLabel={copy.termsLabel}
                  />
                ))}
              </div>
            ) : (
              <DashboardEmptyPanel message={copy.glossaryListEmpty} />
            )}
            <Link
              className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#c9bfda] bg-white/55 px-4 text-[13px] font-bold text-[#f06317] transition-colors hover:border-[#f06317] hover:bg-[#fff7f2] hover:text-[#21175c]"
              href="/dashboard/glossaries"
            >
              {copy.viewAll}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </DashboardDataPanel>
        </section>
      </main>

      <DashboardFooter />
      <TranslationDetailDialog
        job={selectedTranslation}
        locale={currentLocale}
        onOpenChange={(open) => {
          if (!open) setSelectedTranslation(null);
        }}
      />
      <GlossaryShareDialog
        copy={glossaryCopy[currentLocale]}
        glossary={shareGlossary}
        onOpenChange={(open) => {
          if (!open) setShareGlossary(null);
        }}
        open={Boolean(shareGlossary)}
      />
    </div>
  );
}

function DashboardHeroDropzone({
  copy,
  currentLocale,
  isStatsLoading,
  stats,
}: {
  copy: DashboardCopy;
  currentLocale: AppLocale;
  isStatsLoading: boolean;
  stats: DashboardStats;
}) {
  const pendingFiles = usePendingUploadStore((state) => state.pendingFiles);
  const setPendingFiles = usePendingUploadStore((state) => state.setPendingFiles);
  const isFileLimitReached = pendingFiles.length >= 5;
  const [isPageDragActive, setIsPageDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  useEffect(() => {
    if (pendingFiles.length > 5) {
      setPendingFiles(pendingFiles.slice(0, 5));
    }
  }, [pendingFiles, setPendingFiles]);
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const availableSlots = Math.max(0, 5 - pendingFiles.length);

      if (acceptedFiles.length === 0 || availableSlots === 0) {
        return;
      }

      const knownFiles = new Set(pendingFiles.map((item) => `${item.metadata.name}-${item.metadata.size}-${item.file.lastModified}`));
      const newFiles = acceptedFiles
        .filter((file) => !knownFiles.has(`${file.name}-${file.size}-${file.lastModified}`))
        .slice(0, availableSlots)
        .map((file, index) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
          file,
          documentId: "",
          metadata: {name: file.name, size: file.size, type: file.type},
        }));

      setPendingFiles([...pendingFiles, ...newFiles]);
    },
    [pendingFiles, setPendingFiles],
  );
  const {getInputProps, open} = useDropzone({
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
    multiple: true,
    disabled: isFileLimitReached,
    noClick: true,
    noDrag: true,
    onDrop,
  });
  useEffect(() => {
    const eventContainsFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const resetPageDrag = () => {
      dragDepthRef.current = 0;
      setIsPageDragActive(false);
    };
    const handleDragEnter = (event: DragEvent) => {
      if (!eventContainsFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsPageDragActive(true);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!eventContainsFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = isFileLimitReached ? "none" : "copy";
    };
    const handleDragLeave = (event: DragEvent) => {
      if (!eventContainsFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsPageDragActive(false);
    };
    const handleDrop = (event: DragEvent) => {
      if (!eventContainsFiles(event)) return;
      event.preventDefault();
      const droppedFiles = Array.from(event.dataTransfer?.files ?? []).filter(isSupportedDashboardFile);
      resetPageDrag();
      onDrop(droppedFiles);
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    window.addEventListener("blur", resetPageDrag);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
      window.removeEventListener("blur", resetPageDrag);
    };
  }, [isFileLimitReached, onDrop]);
  const removeFile = (fileId: string) => {
    setPendingFiles(pendingFiles.filter((item) => item.id !== fileId));
  };
  return (
    <>
      {isPageDragActive ? (
        <div
          aria-live="polite"
          className={`pointer-events-none fixed inset-0 z-[80] grid place-items-center border-[3px] backdrop-blur-sm ${
            isFileLimitReached ? "border-red-400 bg-red-50/90" : "border-[#f06317] bg-[#f8f6ff]/90"
          }`}
          role="status"
        >
          <div className="flex max-w-[720px] flex-col items-center px-6 text-center">
            <span className={`flex size-16 items-center justify-center rounded-full ${isFileLimitReached ? "bg-red-100 text-red-600" : "bg-[#fff0e6] text-[#f06317]"}`}>
              <UploadCloud aria-hidden="true" className="size-8" strokeWidth={2} />
            </span>
            <p className="mt-5 text-[20px] font-bold text-[#21175c]">
              {isFileLimitReached ? copy.fileLimitReached : copy.dropFilesActive}
            </p>
            {!isFileLimitReached ? <p className="mt-2 text-[13px] leading-5 text-[#625d6b]">{copy.dropFilesDescription}</p> : null}
          </div>
        </div>
      ) : null}

      <div
        className={`dashboard-hero-drop-target rounded-[22px] border bg-white/72 p-7 shadow-[0_28px_80px_rgba(33,23,92,0.13)] backdrop-blur-xl transition-colors md:p-10 lg:px-12 lg:py-11 ${
          isPageDragActive && !isFileLimitReached
            ? "is-drag-active border-[#f06317] bg-[#fff8f3]/92"
            : "border-white/70"
        }`}
      >
      <input {...getInputProps({"aria-label": copy.dropFilesTitle})} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_720px] xl:items-center">
        <div className="min-w-0 text-center xl:text-left">
          <h1 className="dashboard-workspace-greeting w-full max-w-full text-balance whitespace-normal break-words text-[30px] font-bold leading-tight sm:text-[40px] xl:text-[42px]">
            {copy.workspaceGreeting}
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statItems.map((stat) => {
            const Icon = stat.icon;

            return (
              <Link
                className="group min-h-[126px] rounded-[14px] border border-[#d5d0dc] bg-white/76 p-4 shadow-[0_10px_24px_rgba(33,23,92,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f16418] hover:bg-[#fff7f2] hover:shadow-[0_14px_28px_rgba(241,100,24,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f16418]"
                href={stat.href}
                key={stat.key}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex size-11 items-center justify-center rounded-[11px] bg-[#f7f2f9] transition-colors group-hover:bg-[#f16418] group-hover:text-white ${stat.labelColor}`}>
                    <Icon aria-hidden="true" className="size-5" strokeWidth={2.1} />
                  </div>
                  <p className="text-[27px] font-bold leading-none text-[#202027] transition-colors group-hover:text-[#f16418]">
                    {formatStatValue(stats[stat.key], currentLocale, isStatsLoading)}
                  </p>
                </div>
                  <p className="mt-4 text-[13px] font-semibold leading-4 text-[#3f3c46] transition-colors group-hover:text-[#f16418]">{copy.stats[stat.key]}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div aria-hidden="true" className="dashboard-greeting-lines mt-9">
        <span />
        <span />
      </div>

      <button
        aria-disabled={isFileLimitReached}
        className={`dashboard-translation-dropzone relative isolate mt-9 flex min-h-[150px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border-2 border-dashed px-6 py-7 text-center outline-none transition-all ${
          isFileLimitReached
            ? "cursor-not-allowed border-[#c9c4d1] bg-[#f3f0f5]/80 opacity-75"
            : isPageDragActive
              ? "dashboard-active-dropzone border-[#f06317] bg-[#fff0e6]"
              : "border-[#8a82cb] bg-white/55 hover:border-[#f06317] hover:bg-[#fff9f5]/80"
        }`}
        disabled={isFileLimitReached}
        onClick={() => {
          if (!isFileLimitReached) {
            open();
          }
        }}
        type="button"
      >
        <span className={`flex size-12 items-center justify-center rounded-full transition-colors ${isFileLimitReached ? "bg-[#e5e1e8] text-[#827d89]" : isPageDragActive ? "bg-[#f06317] text-white" : "bg-[#f0edff] text-[#21175c]"}`}>
          <UploadCloud aria-hidden="true" className="size-6" strokeWidth={2} />
        </span>
        <p className="mt-3 text-[16px] font-bold text-[#21175c]">
          {isFileLimitReached ? copy.fileLimitReached : isPageDragActive ? copy.dropFilesActive : copy.dropFilesTitle}
        </p>
        {!isFileLimitReached ? (
          <p className="mt-1.5 max-w-[680px] text-[13px] leading-5 text-[#625d6b]">{copy.dropFilesDescription}</p>
        ) : null}
      </button>

      {pendingFiles.length > 0 ? (
        <div className="mt-5">
          <p className="mb-3 text-[14px] font-bold text-[#21175c]">{pendingFiles.length} {copy.selectedFiles}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {pendingFiles.map((item) => (
              <div className="flex min-w-0 items-center gap-3 rounded-[12px] border border-[#ddd7e8] bg-white/78 px-3 py-2.5" key={item.id}>
                <FileTypeTile className="size-10 rounded-[7px]" fileName={item.metadata.name} />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[13px] font-semibold text-[#21175c]">{item.metadata.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#746f7c]">{formatFileSize(item.metadata.size)}</p>
                </div>
                <button aria-label={`${copy.removeFile}: ${item.metadata.name}`} className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#746f7c] transition-colors hover:bg-[#fff0e8] hover:text-[#f06317]" onClick={() => removeFile(item.id)} type="button">
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <Link className="login-submit-button inline-flex h-12 items-center justify-center rounded-[12px] px-7 text-[14px] font-bold text-white" href="/dashboard/translate">
              <span className="relative z-10">{copy.proceedTranslation}</span>
            </Link>
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function DashboardDataPanel({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <article className="h-full w-full min-w-0 rounded-[16px] border border-white/70 bg-white/74 p-4 shadow-[0_14px_38px_rgba(33,23,92,0.09)] backdrop-blur-xl md:p-5">
      <div className="mb-3.5 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#f7f2f9] text-[#21175c]">
            <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2.1} />
          </span>
          <h2 className="text-[18px] font-bold text-[#21175c]">{title}</h2>
        </div>
      </div>

      {children}
    </article>
  );
}

function DashboardRecentTranslationItem({
  locale,
  onSelect,
  translation,
}: {
  locale: AppLocale;
  onSelect: () => void;
  translation: TranslationHistoryResponse;
}) {
  const documentName = translation.sourceDocumentName || translation.sourceDocument || translation.id;

  return (
    <button
      className="w-full rounded-[12px] border border-[#e4dfee] bg-white/70 px-3.5 py-2.5 text-left transition-colors hover:border-[#f16418] hover:bg-[#fff7f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f16418]/60"
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-[#21175c]">{documentName}</p>
          <span className="mt-1 flex min-w-0 items-center gap-2 text-[12px] text-[#625d6b]">
            <LanguageDisplay language={translation.sourceLanguage} locale={locale} />
            <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-[#918a99]" />
            <LanguageDisplay language={translation.targetLanguage} locale={locale} />
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${getTranslationStatusClassName(translation.status)}`}>
          {dashboardStatusLabels[locale][translation.status]}
        </span>
      </div>
      <p className="mt-2 text-[13px] text-[#625d6b]">{formatDashboardDateTime(translation.startedAt, locale)}</p>
    </button>
  );
}

function DashboardGlossaryItem({
  glossary,
  locale,
  onShare,
  termsLabel,
}: {
  glossary: GlossaryResponse;
  locale: AppLocale;
  onShare: () => void;
  termsLabel: string;
}) {
  const infoLabel = glossaryCopy[locale].list.open;
  const editLabel = glossaryCopy[locale].detail.edit;
  const shareLabel = glossaryCopy[locale].list.share;
  const router = useRouter();
  const glossaryHref = "/dashboard/glossaries/" + glossary.id;

  return (
    <article
      aria-label={infoLabel + ": " + glossary.name}
      className="glossary-reference-card dashboard-glossary-reference-card group cursor-pointer focus-visible:outline-none"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button")) return;
        router.push(glossaryHref);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        router.push(glossaryHref);
      }}
      role="link"
      style={{height: 156, isolation: "isolate", marginTop: 4, minHeight: 156, minWidth: 0, position: "relative"}}
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className="glossary-reference-sheet glossary-reference-sheet-back"
        style={{borderRadius: 10, bottom: 4, left: 20, right: 14, top: -9, transform: "rotate(-2.4deg)"}}
      />
      <span
        aria-hidden="true"
        className="glossary-reference-sheet glossary-reference-sheet-front"
        style={{borderRadius: 10, bottom: 4, left: 14, right: 7, top: -5, transform: "rotate(-1.2deg)"}}
      />
      <span
        aria-hidden="true"
        className="glossary-reference-tab"
        style={{borderRadius: "6px 6px 2px 2px", height: 20, left: 22, top: -12, width: 52}}
      />
      <span
        aria-hidden="true"
        className="glossary-reference-surface"
        style={{borderRadius: 10, borderRightWidth: 2}}
      />
      <span
        aria-hidden="true"
        className="glossary-reference-bookmark"
        style={{height: 27, left: 10, width: 12}}
      />

      <div className="relative z-[5] flex h-full min-w-0 flex-col px-3 pb-3 pt-4">
        <div className="flex min-w-0 items-start justify-between gap-2 pl-4">
          <Link
            className="line-clamp-2 min-w-0 text-[14px] font-bold leading-5 text-[#21175c] hover:text-[#f06317] focus-visible:outline-none focus-visible:underline"
            href={glossaryHref}
            title={glossary.name}
          >
            {glossary.name}
          </Link>
          <span className="shrink-0 rounded-full bg-[#fff1e9] px-2 py-1 text-[10px] font-bold text-[#d5530d]">
            {new Intl.NumberFormat(locale).format(glossary.termCount)} {termsLabel}
          </span>
        </div>

        <div className="mt-auto pt-2">
          <time
            className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-[#697287]"
            dateTime={glossary.createdAt}
            title={formatDashboardDateTime(glossary.createdAt, locale)}
          >
            <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-[#31548a]" />
            <span className="truncate">{formatDashboardDateTime(glossary.createdAt, locale)}</span>
          </time>

          <div className="flex items-end justify-between gap-3">
            <span className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#dde4ef] bg-[#f4f7fc] px-2.5">
              <img
                alt=""
                aria-hidden="true"
                className="h-3.5 w-5 rounded-[1px] border-[0.5px] border-black/70 object-cover"
                src={getGlossaryLanguageFlag(glossary.sourceLanguage)}
              />
              <ArrowRight aria-hidden="true" className="size-3.5 text-[#7b8496]" />
              <img
                alt=""
                aria-hidden="true"
                className="h-3.5 w-5 rounded-[1px] border-[0.5px] border-black/70 object-cover"
                src={getGlossaryLanguageFlag(glossary.targetLanguage)}
              />
              <span className="sr-only">{glossary.sourceLanguage} to {glossary.targetLanguage}</span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              <button
                aria-label={shareLabel + ": " + glossary.name}
                className="grid size-8 place-items-center rounded-[6px] border border-[#d8d2e1] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                onClick={onShare}
                title={shareLabel}
                type="button"
              >
                <Share2 aria-hidden="true" className="size-4" />
              </button>
              <Link
                aria-label={infoLabel + ": " + glossary.name}
                className="grid size-8 place-items-center rounded-[6px] border border-[#d8d2e1] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                href={glossaryHref}
                title={infoLabel}
              >
                <Info aria-hidden="true" className="size-4" />
              </Link>
              <Link
                aria-label={editLabel + ": " + glossary.name}
                className="grid size-8 place-items-center rounded-[6px] border border-[#d8d2e1] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                href={"/dashboard/glossaries/" + glossary.id + "/edit"}
                title={editLabel}
              >
                <Pencil aria-hidden="true" className="size-4" />
              </Link>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function DashboardEmptyPanel({message}: {message: string}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[14px] border border-dashed border-[#d5d0dc] bg-white/50 px-4 text-center text-[14px] text-[#625d6b]">
      {message}
    </div>
  );
}

function formatDashboardDateTime(date: string, locale: AppLocale) {
  const time = new Date(date).getTime();

  if (Number.isNaN(time)) {
    return date;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(time);
}

function getTranslationStatusClassName(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("completed") || normalizedStatus.includes("success")) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus.includes("failed") || normalizedStatus.includes("error")) {
    return "bg-red-50 text-red-700";
  }

  if (normalizedStatus.includes("cancel")) {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-[#f7f2f9] text-[#21175c]";
}

function DashboardReleaseNotes({copy, locale}: {copy: DashboardCopy; locale: AppLocale}) {
  const [open, setOpen] = useState(false);
  const [releases, setReleases] = useState<ReleaseNote[]>([]);
  const [latestReadRelease, setLatestReadRelease] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoadedReleaseNotes, setHasLoadedReleaseNotes] = useState(false);
  const [expandedReleaseVersions, setExpandedReleaseVersions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (hasLoadedReleaseNotes) {
      return;
    }

    let isMounted = true;

    const fetchReleaseNotes = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await releaseNotesService.getReleaseNotes();

        if (!isMounted) {
          return;
        }

        setReleases(response.releases ?? []);
        setLatestReadRelease(response.latest_read_release ?? "");
      } catch (error) {
        console.error("Failed to fetch release notes", error);

        if (isMounted) {
          setErrorMessage(copy.releaseNotesError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setHasLoadedReleaseNotes(true);
        }
      }
    };

    fetchReleaseNotes();

    return () => {
      isMounted = false;
    };
  }, [copy.releaseNotesError, hasLoadedReleaseNotes]);

  const sortedReleases = useMemo(() => getSortedReleases(releases), [releases]);
  const latestReleaseVersion = sortedReleases[0]?.version ?? "";
  const hasUnreadRelease = Boolean(latestReleaseVersion && latestReleaseVersion !== latestReadRelease);

  useEffect(() => {
    if (!latestReleaseVersion) {
      return;
    }

    setExpandedReleaseVersions((currentExpandedReleaseVersions) => {
      if (currentExpandedReleaseVersions.size > 0) {
        return currentExpandedReleaseVersions;
      }

      return new Set([latestReleaseVersion]);
    });
  }, [latestReleaseVersion]);

  useEffect(() => {
    if (!open || !hasUnreadRelease || !latestReleaseVersion) {
      return;
    }

    let isMounted = true;

    const markLatestReleaseAsRead = async () => {
      try {
        const response = await releaseNotesService.markAsRead(latestReleaseVersion);

        if (isMounted) {
          setLatestReadRelease(response.latest_read_release || latestReleaseVersion);
        }
      } catch (error) {
        console.error("Failed to mark release notes as read", error);
      }
    };

    markLatestReleaseAsRead();

    return () => {
      isMounted = false;
    };
  }, [hasUnreadRelease, latestReleaseVersion, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={copy.releaseNotesOpen}
          className="relative flex size-8 items-center justify-center rounded-full border border-[#d5d0dc] bg-white/72 text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c]"
          title={copy.releaseNotes}
          type="button"
        >
          <Bell aria-hidden="true" className="size-4" strokeWidth={2.2} />
          {hasUnreadRelease ? (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-[#f06317]" />
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="z-[90] max-h-[520px] w-[380px] overflow-hidden rounded-[10px] border border-[#d5d0dc] bg-white/95 p-0 shadow-[0_18px_46px_rgba(33,23,92,0.18)] backdrop-blur-xl"
        sideOffset={12}
      >
        <div className="border-b border-[#e4dfee] px-5 py-4">
          <h2 className="text-[16px] font-bold text-[#21175c]">{copy.releaseNotes}</h2>
        </div>

        <div className="max-h-[455px] overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
          {isLoading ? (
            <p className="text-sm text-[#625d6b]">{copy.releaseNotesLoading}</p>
          ) : errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : sortedReleases.length === 0 ? (
            <p className="text-sm text-[#625d6b]">{copy.releaseNotesEmpty}</p>
          ) : (
            <div className="space-y-4">
              {sortedReleases.map((release, index) => {
                const changes = getReleaseChanges(release, locale);
                const isLatestRelease = index === 0;
                const isExpanded = expandedReleaseVersions.has(release.version);

                return (
                  <article
                    className={`relative rounded-[8px] border border-[#e4dfee] bg-white/72 ${
                      isExpanded ? "px-4 pb-6 pt-4" : "px-4 pb-5 pt-3"
                    }`}
                    key={`${release.version}-${release.date}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[14px] font-bold text-[#21175c]">{release.version}</h3>
                        <p className="mt-1 text-[12px] text-[#625d6b]">{formatReleaseDate(release.date, locale)}</p>
                      </div>
                      {isLatestRelease ? (
                        <span className="rounded-full bg-[#fff4ef] px-2 py-1 text-[11px] font-semibold text-[#f06317]">
                          {copy.releaseNotesLatest}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        {changes.length > 0 ? (
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] leading-5 text-[#3f3c46]">
                            {changes.map((change, changeIndex) => (
                              <li key={`${release.version}-${changeIndex}`}>{change}</li>
                            ))}
                          </ul>
                        ) : null}

                        {release.url ? (
                          <a
                            className="mt-3 inline-flex text-[12px] font-semibold text-[#21175c] transition-colors hover:text-[#f06317]"
                            href={release.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {release.url}
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <button
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${release.version}`}
                      className="absolute bottom-0 left-1/2 flex size-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-[#e4dfee] bg-white text-[#21175c] shadow-[0_4px_10px_rgba(33,23,92,0.12)] transition-colors hover:border-[#f06317] hover:text-[#f06317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c]"
                      onClick={() => {
                        setExpandedReleaseVersions((currentExpandedReleaseVersions) => {
                          const nextExpandedReleaseVersions = new Set(currentExpandedReleaseVersions);

                          if (nextExpandedReleaseVersions.has(release.version)) {
                            nextExpandedReleaseVersions.delete(release.version);
                          } else {
                            nextExpandedReleaseVersions.add(release.version);
                          }

                          return nextExpandedReleaseVersions;
                        });
                      }}
                      type="button"
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        strokeWidth={2.4}
                      />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DashboardLanguageSwitcher({
  label,
  locale,
  localePath,
}: {
  label: string;
  locale: AppLocale;
  localePath: DashboardLocalePath;
}) {
  const currentLanguage = languages.find((language) => language.code === locale) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={label}
          className="flex cursor-pointer list-none items-center gap-1.5 border-r border-[#d5d0dc] pr-3 text-[#21175c] transition-colors hover:text-[#f06317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c]"
          type="button"
        >
          <img
            alt=""
            aria-hidden="true"
            className="h-3.5 w-5 rounded-[1px] object-contain"
            src={currentLanguage.flag}
          />
          <span>{currentLanguage.tag}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="z-[80] w-24 overflow-hidden rounded-[8px] border border-[#d5d0dc] bg-white/95 p-1 shadow-[0_12px_28px_rgba(33,23,92,0.14)] backdrop-blur-xl"
      >
        {languages.map((language) => (
          <DropdownMenuItem
            className={`flex cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] font-semibold uppercase outline-none transition-colors focus:bg-[#fff4ef] focus:text-[#f06317] ${
              language.code === locale ? "text-[#f06317]" : "text-[#21175c]"
            }`}
            key={language.code}
            onSelect={() => {
              window.location.assign(localizedDashboardPath(language.code, localePath));
            }}
          >
            <img alt="" aria-hidden="true" className="h-3.5 w-5 rounded-[1px] object-contain" src={language.flag} />
            <span>{language.tag}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardUserInfo({greeting}: {greeting: string}) {
  const [username, setUsername] = useState(FALLBACK_USERNAME);

  useEffect(() => {
    const storedUsername = localStorage.getItem(USERNAME_STORAGE_KEY)?.trim();

    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const initial = useMemo(() => getInitial(username), [username]);

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <span className="flex size-8 items-center justify-center rounded-full bg-[#21175c] text-sm font-semibold text-white">
        {initial}
      </span>
      <span className="hidden min-w-0 flex-col leading-tight xl:flex">
        <span className="text-[11px] font-medium text-[#77717f]">{greeting},</span>
        <span className="max-w-[130px] truncate text-[13px] font-bold text-[#21175c]">{username}</span>
      </span>
    </div>
  );
}

function DashboardLogoutButton({copy}: {copy: DashboardCopy}) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await AuthService.logout();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          aria-label={copy.logout}
          className="flex size-8 items-center justify-center rounded-full border border-[#d5d0dc] bg-white/72 text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoggingOut}
          title={copy.logout}
          type="button"
        >
          <LogOut aria-hidden="true" className="size-4" strokeWidth={2.2} />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[8px] border-[#d5d0dc] bg-white shadow-[0_24px_70px_rgba(33,23,92,0.2)] sm:max-w-[440px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#21175c]">{copy.logoutConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription className="text-[#6f6a78]">{copy.logoutConfirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-[6px] border-[#d5d0dc] bg-white text-[#5f5968] hover:border-[#21175c] hover:text-[#21175c]">
            {copy.logoutCancel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-[6px] bg-[#21175c] text-white hover:bg-[#f06317]"
            disabled={isLoggingOut}
            onClick={handleLogout}
          >
            {copy.logoutConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
