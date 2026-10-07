"use client";

import {Lightbulb} from "lucide-react";
import Image from "next/image";
import {
  Children,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ACTIONS,
  EVENTS,
  Joyride,
  STATUS,
  type EventData,
  type Step,
  type TooltipRenderProps,
} from "react-joyride";
import {AuthService} from "@/api";
import {useMediaUrl} from "@/components/ui/use-media-url";
import {
  GUIDED_TOUR_FADE_IN_TRANSITION,
  GUIDED_TOUR_START_DELAY_MS,
  runGuidedTourCrossfade,
} from "./guided-tour-transition";

type DashboardTourLocale = "en" | "vi" | "ja";

type DashboardTourCopy = {
  back: string;
  finish: string;
  launcherLabel: string;
  next: string;
  progress: string;
  skip: string;
  step: string;
  steps: Array<{
    description: string;
    title: string;
  }>;
};

type DashboardTourMedia = {
  alt: string;
  mediaStorage: string;
  src: string;
};

type DashboardTourStepData = {
  labels: Omit<DashboardTourCopy, "launcherLabel" | "steps">;
  media?: DashboardTourMedia;
};

const dashboardTourOverviewCopy: Record<
  DashboardTourLocale,
  {
    description: string;
    title: string;
  }
> = {
  en: {
    title: "Dashboard overview",
    description: "Use the Dashboard to review translation activity, start new work, upload files, and access recent content.",
  },
  vi: {
    title: "Tổng quan Dashboard",
    description: "Dashboard giúp bạn theo dõi hoạt động dịch, bắt đầu công việc mới, tải tệp và truy cập nội dung gần đây.",
  },
  ja: {
    title: "ダッシュボードの概要",
    description: "ダッシュボードでは、翻訳状況の確認、新しい翻訳の開始、ファイルのアップロード、最近のデータへのアクセスができます。",
  },
};

const dashboardTourCopy: Record<DashboardTourLocale, DashboardTourCopy> = {
  en: {
    back: "Back",
    finish: "Finish",
    launcherLabel: "Open the Dashboard guide",
    next: "Next",
    progress: "Guide progress",
    skip: "Skip",
    step: "Step",
    steps: [
      {
        title: "Create a new translation",
        description: "Start a new workflow to upload files, choose languages, and configure translation options.",
      },
      {
        title: "Total translations",
        description: "View the total number of translations. Selecting this card opens your translation history.",
      },
      {
        title: "Active glossaries",
        description: "See how many glossaries are available and open the glossary management page.",
      },
      {
        title: "Uploaded documents",
        description: "Review the number of uploaded documents and open the document management page.",
      },
      {
        title: "Files being processed",
        description: "Check how many files are pending or translating and open the filtered history list.",
      },
      {
        title: "Upload files",
        description: "Drop supported files here or select this area to choose files from your device.",
      },
      {
        title: "Recent translations",
        description: "Quickly review your latest translation jobs and open a record for more information.",
      },
      {
        title: "My glossaries",
        description: "Access your newest glossaries and use the available information, edit, and sharing actions.",
      },
    ],
  },
  vi: {
    back: "Quay lại",
    finish: "Hoàn tất",
    launcherLabel: "Mở hướng dẫn Dashboard",
    next: "Tiếp theo",
    progress: "Tiến trình hướng dẫn",
    skip: "Bỏ qua",
    step: "Bước",
    steps: [
      {
        title: "Tạo bản dịch mới",
        description: "Bắt đầu quy trình tải tệp, chọn ngôn ngữ và cấu hình các tùy chọn cho bản dịch mới.",
      },
      {
        title: "Tổng bản dịch",
        description: "Xem tổng số bản dịch. Khi nhấn vào ô này, bạn sẽ được chuyển đến lịch sử dịch.",
      },
      {
        title: "Bộ thuật ngữ hoạt động",
        description: "Xem số bộ thuật ngữ hiện có và mở trang quản lý Bộ thuật ngữ.",
      },
      {
        title: "Tài liệu đã tải lên",
        description: "Theo dõi số tài liệu đã tải lên và mở trang quản lý tài liệu.",
      },
      {
        title: "Số file đang xử lý",
        description: "Xem số file đang chờ hoặc đang dịch và mở danh sách lịch sử đã được lọc.",
      },
      {
        title: "Thả tệp",
        description: "Thả tệp được hỗ trợ vào đây hoặc nhấn vào vùng này để chọn tệp từ thiết bị.",
      },
      {
        title: "Bản dịch gần đây",
        description: "Xem nhanh các bản dịch mới nhất và nhấn vào từng bản ghi để mở thông tin chi tiết.",
      },
      {
        title: "Glossary của tôi",
        description: "Truy cập các glossary mới nhất cùng các thao tác xem thông tin, chỉnh sửa và chia sẻ.",
      },
    ],
  },
  ja: {
    back: "戻る",
    finish: "完了",
    launcherLabel: "ダッシュボードガイドを開く",
    next: "次へ",
    progress: "ガイドの進行状況",
    skip: "スキップ",
    step: "ステップ",
    steps: [
      {
        title: "新しい翻訳を作成",
        description: "ファイルのアップロード、言語の選択、翻訳オプションの設定を開始します。",
      },
      {
        title: "翻訳の合計",
        description: "翻訳の合計件数を確認し、クリックして翻訳履歴を開きます。",
      },
      {
        title: "利用可能な用語集",
        description: "利用できる用語集の数を確認し、用語集管理ページを開きます。",
      },
      {
        title: "アップロード済み文書",
        description: "アップロードした文書数を確認し、文書管理ページを開きます。",
      },
      {
        title: "処理中のファイル",
        description: "待機中または翻訳中のファイル数を確認し、絞り込まれた履歴を開きます。",
      },
      {
        title: "ファイルを追加",
        description: "対応ファイルをここにドロップするか、クリックして端末から選択します。",
      },
      {
        title: "最近の翻訳",
        description: "最新の翻訳を確認し、各項目をクリックして詳細情報を開きます。",
      },
      {
        title: "マイ用語集",
        description: "新しい用語集を確認し、詳細表示、編集、共有の操作を利用できます。",
      },
    ],
  },
};

const tourTargets: Array<Pick<Step, "offset" | "placement" | "target">> = [
  {target: "body", placement: "center", offset: 0},
  {target: '[data-dashboard-tour="new-translation"]', placement: "bottom-end", offset: 14},
  {target: '[data-dashboard-tour="stat-translations"]', placement: "bottom", offset: 12},
  {target: '[data-dashboard-tour="stat-glossaries"]', placement: "bottom", offset: 12},
  {target: '[data-dashboard-tour="stat-documents"]', placement: "bottom", offset: 12},
  {target: '[data-dashboard-tour="stat-processing"]', placement: "bottom-end", offset: 12},
  {target: '[data-dashboard-tour="drop-files"]', placement: "top", offset: 14},
  {target: '[data-dashboard-tour="recent-translations"]', placement: "top-start", offset: 14},
  {target: '[data-dashboard-tour="my-glossaries"]', placement: "top-end", offset: 14},
];

const dashboardTourStepMedia: Record<number, {src: string}> = {
  2: {src: "GuidedTour/Step2.gif"},
  3: {src: "GuidedTour/Step3.gif"},
  4: {src: "GuidedTour/Step4.gif"},
  5: {src: "GuidedTour/Step5.gif"},
};

function scrollDashboardTourTargetIntoView(index: number) {
  const target = tourTargets[index]?.target;

  if (typeof target !== "string") {
    return;
  }

  if (target === "body") {
    window.scrollTo({behavior: "auto", top: 0});
    return;
  }

  const targetElement = document.querySelector(target);

  if (!targetElement) {
    return;
  }

  if (index >= 7) {
    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      behavior: "auto",
      top: Math.max(0, targetTop - 320),
    });
    return;
  }

  targetElement.scrollIntoView({
    behavior: "auto",
    block: "center",
    inline: "nearest",
  });
}

function DashboardTourTooltip({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const data = step.data as DashboardTourStepData;
  const labels = data.labels;
  const media = data.media;
  const mediaSrc = useMediaUrl(media?.mediaStorage ?? "", media?.src);


  const runWithCrossfade = useCallback((
    handler: typeof primaryProps.onClick,
    targetIndex: number | null = null,
  ) => (event: Parameters<typeof runGuidedTourCrossfade>[0]) => {
    runGuidedTourCrossfade(
      event,
      handler,
      targetIndex === null ? undefined : () => scrollDashboardTourTargetIntoView(targetIndex),
    );
  }, []);

  const {onClick: onBack, ...backButtonProps} = backProps;
  const {onClick: onPrimary, ...primaryButtonProps} = primaryProps;
  const {onClick: onSkip, ...skipButtonProps} = skipProps;

  return (
    <div
      {...tooltipProps}
      className={`dashboard-tour-tooltip${media ? " dashboard-tour-tooltip-with-media" : ""}`}
    >
      <span aria-hidden="true" className="dashboard-tour-tooltip-accent" />

      <div className="px-6 pb-3 pt-5">
        <span className="inline-flex h-7 items-center rounded-full border border-[#ffd8c4] bg-[#fff0e8] px-3 text-[11px] font-bold uppercase text-[#d94e0b]">
          {labels.step} {index} / {size - 1}
        </span>
        <h2 className="mt-3 text-[21px] font-bold leading-7 text-[#21175c]">{step.title}</h2>
        <div className="mt-2 text-[14px] leading-[21px] text-[#555064]">{step.content}</div>
      </div>

      {media ? (
        <div className="mx-6 mb-4 overflow-hidden rounded-[10px] border border-[#ded8e6] bg-[#f8f6fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <div className="relative aspect-video min-h-[132px] overflow-hidden rounded-[8px] bg-white">
            {mediaSrc ? (
              <Image
                alt={media.alt}
                className="object-contain"
                fill
                sizes="(min-width: 768px) 500px, calc(100vw - 80px)"
                src={mediaSrc}
                unoptimized
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mx-6 flex items-center justify-between gap-4 border-t border-[#e9e5ed] py-3">
        <span className="text-[12px] font-medium text-[#746f7c]">{labels.progress}</span>
        <span aria-hidden="true" className="flex items-center gap-1.5">
          {Children.toArray(
            Array.from({length: size}, (_, dotIndex) => (
              <span
                className={`size-2 rounded-full border transition-colors ${
                  dotIndex === index
                    ? "border-[#f06317] bg-[#f06317]"
                    : dotIndex < index
                      ? "border-[#21175c] bg-[#21175c]"
                      : "border-[#f06317] bg-white"
                }`}
                key={`dashboard-tour-progress-${dotIndex}`}
              />
            )),
          )}
        </span>
      </div>

      <div className="flex min-h-[62px] items-center justify-between gap-3 border-t border-[#e9e5ed] px-6 py-3">
        <button
          {...skipButtonProps}
          className="h-9 rounded-[8px] border border-[#e1dce7] bg-white px-4 text-[13px] font-semibold text-[#625d6b] transition-colors hover:border-[#f06317] hover:text-[#d94e0b]"
          onClick={runWithCrossfade(onSkip)}
          type="button"
        >
          {labels.skip}
        </button>

        <div className="flex items-center gap-2">
          <button
            {...backButtonProps}
            aria-disabled={index === 0}
            className="h-9 rounded-[8px] border border-[#d9d3e3] bg-white px-4 text-[13px] font-semibold text-[#21175c] transition-colors hover:border-[#8a82cb] disabled:cursor-not-allowed disabled:bg-[#f4f2f6] disabled:text-[#aaa5b0]"
            disabled={index === 0}
            onClick={index === 0 ? undefined : runWithCrossfade(onBack, index - 1)}
            type="button"
          >
            {labels.back}
          </button>
          <button
            {...primaryButtonProps}
            className="h-9 rounded-[8px] bg-[#21175c] px-5 text-[13px] font-bold text-white shadow-[0_6px_14px_rgba(33,23,92,0.18)] transition-colors hover:bg-[#342779]"
            onClick={runWithCrossfade(onPrimary, isLastStep ? null : index + 1)}
            type="button"
          >
            {isLastStep ? labels.finish : labels.next}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DashboardGuidedTour({locale, mediaStorage}: {locale: DashboardTourLocale; mediaStorage: string}) {
  const copy = dashboardTourCopy[locale];
  const bulbGradientId = useId().replaceAll(":", "");
  const [isClientReady, setIsClientReady] = useState(false);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourSession, setTourSession] = useState(0);
  const hasMarkedCompleteRef = useRef(false);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTourStart = useCallback((delay: number) => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
    }

    setRun(false);
    setStepIndex(0);
    startTimerRef.current = setTimeout(() => {
      scrollDashboardTourTargetIntoView(0);
      startTimerRef.current = setTimeout(() => setRun(true), GUIDED_TOUR_START_DELAY_MS);
    }, delay);
  }, []);

  const steps = useMemo<Step[]>(() => tourTargets.map((target, index) => {
    const stepCopy = index === 0 ? dashboardTourOverviewCopy[locale] : copy.steps[index - 1];
    const stepMedia = dashboardTourStepMedia[index];

    return {
      ...target,
      content: stepCopy.description,
      data: {
        labels: {
          back: copy.back,
          finish: copy.finish,
          next: copy.next,
          progress: copy.progress,
          skip: copy.skip,
          step: copy.step,
        },
        media: stepMedia
          ? {
              alt: stepCopy.title,
              mediaStorage,
              src: stepMedia.src,
            }
          : undefined,
      } satisfies DashboardTourStepData,
      skipBeacon: true,
      title: stepCopy.title,
    };
  }), [copy, locale, mediaStorage]);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const markDashboardTourComplete = useCallback(async () => {
    if (hasMarkedCompleteRef.current) {
      return;
    }

    hasMarkedCompleteRef.current = true;

    try {
      await AuthService.updateUserProfile({
        walkthrough_status: {dashboard_tour: true},
      });
    } catch (error) {
      hasMarkedCompleteRef.current = false;
      console.error("Failed to save Dashboard tour status", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkTourStatus = async () => {
      try {
        const user = await AuthService.getCurrentUser();

        if (isMounted && user.walkthrough_status?.dashboard_tour === false) {
          scheduleTourStart(450);
        }
      } catch (error) {
        console.error("Failed to load Dashboard tour status", error);
      }
    };

    void checkTourStatus();

    return () => {
      isMounted = false;

      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
      }
    };
  }, [scheduleTourStart]);

  const handleTourEvent = useCallback(({action, index, status, type}: EventData) => {
    if (type === EVENTS.TOUR_END && (status === STATUS.FINISHED || status === STATUS.SKIPPED)) {
      setRun(false);
      setStepIndex(0);
      setTourSession((currentSession) => currentSession + 1);
      void markDashboardTourComplete();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  }, [markDashboardTourComplete]);

  const restartTour = () => {
    setTourSession((currentSession) => currentSession + 1);
    scheduleTourStart(40);
  };

  return (
    <>
      {isClientReady ? (
        <Joyride
          onEvent={handleTourEvent}
          continuous
          key={`${tourSession}-${stepIndex}`}
          locale={{
            back: copy.back,
            last: copy.finish,
            next: copy.next,
            skip: copy.skip,
          }}
          options={{
            arrowBase: 22,
            arrowColor: "#ffffff",
            arrowSize: 11,
            arrowSpacing: 10,
            backgroundColor: "#ffffff",
            buttons: ["back", "primary", "skip"],
            dismissKeyAction: false,
            overlayClickAction: false,
            overlayColor: "rgba(21, 17, 47, 0.56)",
            primaryColor: "#21175c",
            scrollDuration: 480,
            scrollOffset: 96,
            skipScroll: true,
            spotlightPadding: 4,
            spotlightRadius: 12,
            textColor: "#1f2537",
            zIndex: 120,
          }}
          run={run}
          scrollToFirstStep
          stepIndex={stepIndex}
          steps={steps}
          styles={{
            arrow: {
              filter: "drop-shadow(0 2px 1px rgba(21, 17, 47, 0.12))",
            },
            floater: {
              filter: "none",
              maxWidth: "none",
              transition: GUIDED_TOUR_FADE_IN_TRANSITION,
              willChange: "opacity",
            },
          }}
          tooltipComponent={DashboardTourTooltip}
        />
      ) : null}

      <button
        aria-label={copy.launcherLabel}
        aria-pressed={run}
        className="dashboard-tour-launcher fixed bottom-5 left-5 z-[70] flex size-12 items-center justify-center rounded-[12px] border border-[#b8cef2] bg-[#dbeafe] shadow-[0_10px_24px_rgba(33,23,92,0.18)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#cfe2ff] hover:shadow-[0_13px_28px_rgba(33,23,92,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c] focus-visible:ring-offset-2"
        onClick={restartTour}
        title={copy.launcherLabel}
        type="button"
      >
        <Lightbulb
          aria-hidden="true"
          className="size-6"
          stroke={`url(#${bulbGradientId})`}
          strokeWidth={2.2}
        >
          <defs key="dashboard-tour-bulb-gradient-definition">
            <linearGradient gradientUnits="userSpaceOnUse" id={bulbGradientId} x1="3" x2="21" y1="3" y2="21">
              <stop offset="0%" stopColor="#f06317" />
              <stop offset="100%" stopColor="#21175c" />
            </linearGradient>
          </defs>
        </Lightbulb>
      </button>
    </>
  );
}
