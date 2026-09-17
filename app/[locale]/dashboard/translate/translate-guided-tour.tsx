"use client";

import {Lightbulb} from "lucide-react";
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
import {
  GUIDED_TOUR_FADE_IN_TRANSITION,
  GUIDED_TOUR_START_DELAY_MS,
  runGuidedTourCrossfade,
} from "../guided-tour-transition";

type TranslateTourLocale = "en" | "vi" | "ja";

type TranslateTourCopy = {
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

type TranslateTourStepData = {
  labels: Omit<TranslateTourCopy, "launcherLabel" | "steps">;
};

const translateTourOverviewCopy: Record<
  TranslateTourLocale,
  {
    description: string;
    title: string;
  }
> = {
  en: {
    title: "Translation workspace overview",
    description: "This workspace guides you from adding source files through language, image, and glossary configuration.",
  },
  vi: {
    title: "Tổng quan trang dịch",
    description: "Trang dịch hướng dẫn bạn từ bước thêm tệp nguồn đến cấu hình ngôn ngữ, hình ảnh và bộ thuật ngữ.",
  },
  ja: {
    title: "翻訳ページの概要",
    description: "このページでは、元ファイルの追加から言語、画像、用語集の設定までを行えます。",
  },
};

const translateTourCopy: Record<TranslateTourLocale, TranslateTourCopy> = {
  en: {
    back: "Back",
    finish: "Finish",
    launcherLabel: "Open the translation guide",
    next: "Next",
    progress: "Guide progress",
    skip: "Skip",
    step: "Step",
    steps: [
      {
        title: "Translation progress",
        description: "Follow the current stage from configuration through processing to completion.",
      },
      {
        title: "Drop files",
        description: "Drop supported documents here or select the area to choose files from your device.",
      },
      {
        title: "Add uploaded files",
        description: "Reuse source documents that you previously uploaded without selecting them from your device again.",
      },
      {
        title: "Choose languages",
        description: "Select the source and target languages for the active file, or swap them with one action.",
      },
      {
        title: "Translate images",
        description: "Enable this option to detect and translate text contained in images in the document.",
      },
      {
        title: "Keep source text",
        description: "Keep original glossary terms beside their translated content when a glossary is selected.",
      },
      {
        title: "Create a glossary",
        description: "Create a new glossary directly from the translation setup without leaving this workflow.",
      },
      {
        title: "Suggest a glossary",
        description: "Ask the system to recommend a glossary based on the active document and language pair.",
      },
      {
        title: "Select glossaries",
        description: "Search and select the glossaries that should guide terminology in this translation.",
      },
    ],
  },
  vi: {
    back: "Quay lại",
    finish: "Hoàn tất",
    launcherLabel: "Mở hướng dẫn trang dịch",
    next: "Tiếp theo",
    progress: "Tiến trình hướng dẫn",
    skip: "Bỏ qua",
    step: "Bước",
    steps: [
      {
        title: "Thanh tiến trình",
        description: "Theo dõi giai đoạn hiện tại từ cấu hình, xử lý cho đến khi hoàn tất bản dịch.",
      },
      {
        title: "Thả tệp",
        description: "Thả tài liệu được hỗ trợ vào đây hoặc nhấn vào vùng này để chọn tệp từ thiết bị.",
      },
      {
        title: "Thêm tệp đã tải lên",
        description: "Sử dụng lại tài liệu nguồn đã tải lên hệ thống mà không cần chọn lại từ thiết bị.",
      },
      {
        title: "Chọn ngôn ngữ",
        description: "Chọn ngôn ngữ gốc và ngôn ngữ đích cho tệp hiện tại, hoặc đổi vị trí chỉ với một thao tác.",
      },
      {
        title: "Dịch hình ảnh",
        description: "Bật tùy chọn này để nhận diện và dịch phần chữ nằm trong hình ảnh của tài liệu.",
      },
      {
        title: "Giữ văn bản gốc",
        description: "Giữ thuật ngữ gốc bên cạnh nội dung đã dịch khi bạn đã chọn ít nhất một bộ thuật ngữ.",
      },
      {
        title: "Tạo bộ thuật ngữ",
        description: "Tạo một bộ thuật ngữ mới ngay trong màn hình cấu hình mà không rời khỏi quy trình dịch.",
      },
      {
        title: "Gợi ý bộ thuật ngữ",
        description: "Yêu cầu hệ thống đề xuất bộ thuật ngữ dựa trên tài liệu và cặp ngôn ngữ hiện tại.",
      },
      {
        title: "Chọn bộ thuật ngữ",
        description: "Tìm kiếm và chọn các bộ thuật ngữ sẽ được dùng để kiểm soát thuật ngữ trong bản dịch.",
      },
    ],
  },
  ja: {
    back: "戻る",
    finish: "完了",
    launcherLabel: "翻訳ガイドを開く",
    next: "次へ",
    progress: "ガイドの進行状況",
    skip: "スキップ",
    step: "ステップ",
    steps: [
      {
        title: "進行状況",
        description: "設定から処理、翻訳完了まで、現在のステージを確認できます。",
      },
      {
        title: "ファイルをドロップ",
        description: "対応ファイルをここにドロップするか、このエリアを選択して端末から追加します。",
      },
      {
        title: "アップロード済みファイルを追加",
        description: "以前アップロードした原文ファイルを、端末から選び直さずに再利用できます。",
      },
      {
        title: "言語を選択",
        description: "対象ファイルの原文言語と翻訳先言語を選択し、必要に応じて入れ替えます。",
      },
      {
        title: "画像を翻訳",
        description: "この設定を有効にすると、文書内の画像に含まれる文字を検出して翻訳します。",
      },
      {
        title: "原文を保持",
        description: "用語集を選択した場合、原文の用語を翻訳結果の横に残します。",
      },
      {
        title: "用語集を作成",
        description: "翻訳設定画面を離れずに、新しい用語集を作成できます。",
      },
      {
        title: "用語集を提案",
        description: "現在の文書と言語ペアをもとに、適切な用語集をシステムに提案させます。",
      },
      {
        title: "用語集を選択",
        description: "翻訳時の用語を統一するために、使用する用語集を検索して選択します。",
      },
    ],
  },
};

const tourTargets: Array<Pick<Step, "offset" | "placement" | "target">> = [
  {target: "body", placement: "center", offset: 0},
  {target: '[data-translate-tour="progress"]', placement: "bottom", offset: 14},
  {target: '[data-translate-tour="drop-files"]', placement: "right-start", offset: 14},
  {target: '[data-translate-tour="uploaded-files"]', placement: "right-end", offset: 14},
  {target: '[data-translate-tour="language-pair"]', placement: "bottom", offset: 14},
  {target: '[data-translate-tour="translate-images"]', placement: "top", offset: 14},
  {target: '[data-translate-tour="keep-source"]', placement: "top", offset: 14},
  {target: '[data-translate-tour="create-glossary"]', placement: "bottom-end", offset: 12},
  {target: '[data-translate-tour="suggest-glossary"]', placement: "bottom-end", offset: 12},
  {target: '[data-translate-tour="glossary-selection"]', placement: "top", offset: 14},
];

function scrollTranslateTourTargetIntoView(index: number) {
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

  targetElement.scrollIntoView({
    behavior: "auto",
    block: index <= 1 ? "start" : "center",
    inline: "nearest",
  });
}

function TranslateTourTooltip({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const data = step.data as TranslateTourStepData;
  const labels = data.labels;


  const runWithCrossfade = useCallback((
    handler: typeof primaryProps.onClick,
    targetIndex: number | null = null,
  ) => (event: Parameters<typeof runGuidedTourCrossfade>[0]) => {
    runGuidedTourCrossfade(
      event,
      handler,
      targetIndex === null ? undefined : () => scrollTranslateTourTargetIntoView(targetIndex),
    );
  }, []);

  const {onClick: onBack, ...backButtonProps} = backProps;
  const {onClick: onPrimary, ...primaryButtonProps} = primaryProps;
  const {onClick: onSkip, ...skipButtonProps} = skipProps;

  return (
    <div
      {...tooltipProps}
      className="dashboard-tour-tooltip"
    >
      <span aria-hidden="true" className="dashboard-tour-tooltip-accent" />

      <div className="px-6 pb-3 pt-5">
        <span className="inline-flex h-7 items-center rounded-full border border-[#ffd8c4] bg-[#fff0e8] px-3 text-[11px] font-bold uppercase text-[#d94e0b]">
          {labels.step} {index} / {size - 1}
        </span>
        <h2 className="mt-3 text-[21px] font-bold leading-7 text-[#21175c]">{step.title}</h2>
        <div className="mt-2 text-[14px] leading-[21px] text-[#555064]">{step.content}</div>
      </div>

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
                key={`translate-tour-progress-${dotIndex}`}
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

export function TranslateGuidedTour({locale}: {locale: TranslateTourLocale}) {
  const copy = translateTourCopy[locale];
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
      scrollTranslateTourTargetIntoView(0);
      startTimerRef.current = setTimeout(() => setRun(true), GUIDED_TOUR_START_DELAY_MS);
    }, delay);
  }, []);

  const steps = useMemo<Step[]>(() => tourTargets.map((target, index) => {
    const stepCopy = index === 0 ? translateTourOverviewCopy[locale] : copy.steps[index - 1];

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
      } satisfies TranslateTourStepData,
      skipBeacon: true,
      title: stepCopy.title,
    };
  }), [copy, locale]);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const markUploadTourComplete = useCallback(async () => {
    if (hasMarkedCompleteRef.current) {
      return;
    }

    hasMarkedCompleteRef.current = true;

    try {
      await AuthService.updateUserProfile({
        walkthrough_status: {upload_tour: true},
      });
    } catch (error) {
      hasMarkedCompleteRef.current = false;
      console.error("Failed to save Translate tour status", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkTourStatus = async () => {
      try {
        const user = await AuthService.getCurrentUser();

        if (isMounted && user.walkthrough_status?.upload_tour === false) {
          scheduleTourStart(450);
        }
      } catch (error) {
        console.error("Failed to load Translate tour status", error);
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
      void markUploadTourComplete();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  }, [markUploadTourComplete]);

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
          tooltipComponent={TranslateTourTooltip}
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
          <defs key="translate-tour-bulb-gradient-definition">
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
