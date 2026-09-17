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
import type {GlossaryLocale} from "./glossary-copy";

type GlossaryTourPhase = "list" | "create";

type TourLabels = {
  back: string;
  finish: string;
  launcherLabel: Record<GlossaryTourPhase, string>;
  next: string;
  progress: string;
  skip: string;
  step: string;
};

type TourStepCopy = {
  description: string;
  title: string;
};

type GlossaryTourCopy = {
  labels: TourLabels;
  phases: Record<GlossaryTourPhase, TourStepCopy[]>;
};

type GlossaryTourStepData = {
  labels: Omit<TourLabels, "launcherLabel">;
  phase: GlossaryTourPhase;
};

const glossaryTourCopy: Record<GlossaryLocale, GlossaryTourCopy> = {
  en: {
    labels: {
      back: "Back",
      finish: "Finish",
      launcherLabel: {
        list: "Open the glossary list guide",
        create: "Open the glossary creation guide",
      },
      next: "Next",
      progress: "Guide progress",
      skip: "Skip",
      step: "Step",
    },
    phases: {
      list: [
        {
          title: "Glossary views",
          description: "Switch between your glossaries, public glossaries, and glossaries shared with you.",
        },
        {
          title: "Search glossaries",
          description: "Find a glossary quickly by entering its name in the search field.",
        },
        {
          title: "Create a new glossary",
          description: "Open the creation page to define a language pair and add your terminology.",
        },
        {
          title: "Glossary item",
          description: "Each item shows its name, description, term count, creation date, and language pair.",
        },
        {
          title: "Glossary information",
          description: "Open the detailed glossary view and review all available terms.",
        },
        {
          title: "Edit glossary",
          description: "Update glossary information or change its source and target term pairs.",
        },
        {
          title: "Share glossary",
          description: "Manage public visibility and share this glossary with other users.",
        },
      ],
      create: [
        {
          title: "Glossary name",
          description: "Enter a clear name so the glossary can be found and reused easily.",
        },
        {
          title: "Language pair",
          description: "Choose the source and target languages that this glossary supports.",
        },
        {
          title: "Description",
          description: "Describe the glossary's domain or intended use to make its purpose clear.",
        },
        {
          title: "Manual entry",
          description: "Use manual mode when you want to enter and review each source and target term pair.",
        },
        {
          title: "Enter terms manually",
          description: "Add source and target term pairs here. Source text is copied initially when the target is empty.",
        },
        {
          title: "Import from file",
          description: "Switch to file import to add many terms from a supported CSV or text file.",
        },
      ],
    },
  },
  vi: {
    labels: {
      back: "Quay lại",
      finish: "Hoàn tất",
      launcherLabel: {
        list: "Mở hướng dẫn danh sách bộ thuật ngữ",
        create: "Mở hướng dẫn tạo bộ thuật ngữ",
      },
      next: "Tiếp theo",
      progress: "Tiến trình hướng dẫn",
      skip: "Bỏ qua",
      step: "Bước",
    },
    phases: {
      list: [
        {
          title: "Phạm vi bộ thuật ngữ",
          description: "Chuyển giữa bộ thuật ngữ của tôi, bộ công khai và bộ được chia sẻ với tôi.",
        },
        {
          title: "Tìm kiếm bộ thuật ngữ",
          description: "Tìm nhanh một bộ thuật ngữ bằng cách nhập tên vào thanh tìm kiếm.",
        },
        {
          title: "Tạo bộ thuật ngữ mới",
          description: "Mở trang tạo mới để chọn cặp ngôn ngữ và bổ sung các thuật ngữ cần sử dụng.",
        },
        {
          title: "Một bộ thuật ngữ",
          description: "Mỗi item hiển thị tên, mô tả, số lượng thuật ngữ, ngày tạo và cặp ngôn ngữ.",
        },
        {
          title: "Thông tin bộ thuật ngữ",
          description: "Mở trang chi tiết để xem đầy đủ thông tin và danh sách thuật ngữ.",
        },
        {
          title: "Chỉnh sửa bộ thuật ngữ",
          description: "Cập nhật thông tin hoặc thay đổi các cặp thuật ngữ gốc và đích.",
        },
        {
          title: "Chia sẻ bộ thuật ngữ",
          description: "Thiết lập trạng thái công khai hoặc chia sẻ bộ thuật ngữ với người dùng khác.",
        },
      ],
      create: [
        {
          title: "Tên bộ thuật ngữ",
          description: "Nhập tên rõ ràng để có thể dễ dàng tìm kiếm và sử dụng lại bộ thuật ngữ.",
        },
        {
          title: "Cặp ngôn ngữ",
          description: "Chọn ngôn ngữ gốc và ngôn ngữ đích mà bộ thuật ngữ này hỗ trợ.",
        },
        {
          title: "Mô tả",
          description: "Mô tả lĩnh vực hoặc mục đích sử dụng để người dùng hiểu rõ nội dung của bộ thuật ngữ.",
        },
        {
          title: "Nhập thủ công",
          description: "Sử dụng chế độ thủ công khi muốn nhập và kiểm tra từng cặp thuật ngữ gốc và đích.",
        },
        {
          title: "Vùng nhập thuật ngữ thủ công",
          description: "Thêm từng cặp thuật ngữ gốc và đích tại đây. Nội dung gốc sẽ được sao chép lần đầu nếu ô đích trống.",
        },
        {
          title: "Nhập từ tệp",
          description: "Chuyển sang nhập từ tệp để thêm nhiều thuật ngữ từ tệp CSV hoặc tệp văn bản được hỗ trợ.",
        },
      ],
    },
  },
  ja: {
    labels: {
      back: "戻る",
      finish: "完了",
      launcherLabel: {
        list: "用語集一覧ガイドを開く",
        create: "用語集作成ガイドを開く",
      },
      next: "次へ",
      progress: "ガイドの進行状況",
      skip: "スキップ",
      step: "ステップ",
    },
    phases: {
      list: [
        {
          title: "用語集の表示範囲",
          description: "自分の用語集、公開用語集、共有された用語集を切り替えます。",
        },
        {
          title: "用語集を検索",
          description: "検索欄に名前を入力して、用語集をすばやく検索します。",
        },
        {
          title: "新しい用語集を作成",
          description: "作成ページを開き、言語ペアを選択して必要な用語を追加します。",
        },
        {
          title: "用語集アイテム",
          description: "各アイテムには名前、説明、用語数、作成日、言語ペアが表示されます。",
        },
        {
          title: "用語集の詳細",
          description: "詳細ページを開き、用語集の情報と登録されている用語を確認します。",
        },
        {
          title: "用語集を編集",
          description: "用語集の情報や原文と翻訳先の用語ペアを更新します。",
        },
        {
          title: "用語集を共有",
          description: "公開設定を変更したり、他のユーザーと用語集を共有したりできます。",
        },
      ],
      create: [
        {
          title: "用語集名",
          description: "検索や再利用がしやすい、分かりやすい用語集名を入力します。",
        },
        {
          title: "言語ペア",
          description: "この用語集で使用する原文言語と翻訳先言語を選択します。",
        },
        {
          title: "説明",
          description: "用語集の分野や用途を入力し、内容を分かりやすくします。",
        },
        {
          title: "手動入力",
          description: "原文と翻訳先の用語ペアを一つずつ入力して確認する場合に使用します。",
        },
        {
          title: "用語を手動入力",
          description: "原文と翻訳先の用語ペアを追加します。翻訳先が空の場合、最初は原文がコピーされます。",
        },
        {
          title: "ファイルからインポート",
          description: "ファイル入力に切り替えると、対応するCSVまたはテキストファイルから複数の用語を追加できます。",
        },
      ],
    },
  },
};

const glossaryTourOverviewCopy: Record<GlossaryLocale, Record<GlossaryTourPhase, TourStepCopy>> = {
  en: {
    list: {
      title: "Glossary management overview",
      description: "Use this page to find, create, inspect, edit, and share the glossaries that guide translation terminology.",
    },
    create: {
      title: "Create glossary overview",
      description: "This form helps you define a reusable glossary, choose its language pair, and add terms manually or from a file.",
    },
  },
  vi: {
    list: {
      title: "Tổng quan quản lý Bộ thuật ngữ",
      description: "Trang này giúp bạn tìm, tạo, xem thông tin, chỉnh sửa và chia sẻ các bộ thuật ngữ dùng cho bản dịch.",
    },
    create: {
      title: "Tổng quan tạo Bộ thuật ngữ",
      description: "Biểu mẫu này giúp bạn định nghĩa bộ thuật ngữ, chọn cặp ngôn ngữ và thêm thuật ngữ thủ công hoặc từ tệp.",
    },
  },
  ja: {
    list: {
      title: "用語集管理の概要",
      description: "このページでは、翻訳用語を管理する用語集の検索、作成、詳細確認、編集、共有ができます。",
    },
    create: {
      title: "用語集作成の概要",
      description: "このフォームでは、再利用できる用語集の定義、言語ペアの選択、手動またはファイルからの用語追加ができます。",
    },
  },
};

const phaseTargets: Record<
  GlossaryTourPhase,
  Array<Pick<Step, "offset" | "placement" | "target">>
> = {
  list: [
    {target: "body", placement: "center", offset: 0},
    {target: '[data-glossary-list-tour="scope"]', placement: "bottom-start", offset: 12},
    {target: '[data-glossary-list-tour="search"]', placement: "bottom", offset: 12},
    {target: '[data-glossary-list-tour="create"]', placement: "bottom-end", offset: 12},
    {target: '[data-glossary-list-tour="item"]', placement: "top", offset: 14},
    {target: '[data-glossary-list-tour="info"]', placement: "top", offset: 12},
    {target: '[data-glossary-list-tour="edit"]', placement: "top", offset: 12},
    {target: '[data-glossary-list-tour="share"]', placement: "top", offset: 12},
  ],
  create: [
    {target: "body", placement: "center", offset: 0},
    {target: '[data-glossary-create-tour="name"]', placement: "bottom-start", offset: 12},
    {target: '[data-glossary-create-tour="languages"]', placement: "bottom", offset: 12},
    {target: '[data-glossary-create-tour="description"]', placement: "bottom", offset: 12},
    {target: '[data-glossary-create-tour="manual-mode"]', placement: "bottom-start", offset: 12},
    {target: '[data-glossary-create-tour="terms"]', placement: "top", offset: 14},
    {target: '[data-glossary-create-tour="import-file"]', placement: "bottom", offset: 12},
  ],
};

const STAGE_STORAGE_PREFIX = "glossary-ai:glossary-tour:";
function getStageStorageKey(userId: string) {
  return STAGE_STORAGE_PREFIX + userId + ":stage";
}

function readStage(userId: string) {
  try {
    return window.localStorage.getItem(getStageStorageKey(userId));
  } catch {
    return null;
  }
}

function writeCreateStage(userId: string) {
  try {
    window.localStorage.setItem(getStageStorageKey(userId), "create");
  } catch {
    // The tour still works in the current page when browser storage is unavailable.
  }
}

function clearStage(userId: string) {
  try {
    window.localStorage.removeItem(getStageStorageKey(userId));
  } catch {
    // Ignore unavailable browser storage after the backend status is saved.
  }
}

function scrollGlossaryTourTargetIntoView(phase: GlossaryTourPhase, index: number) {
  const target = phaseTargets[phase][index]?.target;

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
    block: "center",
    inline: "nearest",
  });
}

function GlossaryTourTooltip({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const data = step.data as GlossaryTourStepData;


  const runWithCrossfade = useCallback((
    handler: typeof primaryProps.onClick,
    targetIndex: number | null = null,
  ) => (event: Parameters<typeof runGuidedTourCrossfade>[0]) => {
    runGuidedTourCrossfade(
      event,
      handler,
      targetIndex === null
        ? undefined
        : () => scrollGlossaryTourTargetIntoView(data.phase, targetIndex),
    );
  }, [data.phase]);

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
          {data.labels.step} {index} / {size - 1}
        </span>
        <h2 className="mt-3 text-[21px] font-bold leading-7 text-[#21175c]">{step.title}</h2>
        <div className="mt-2 text-[14px] leading-[21px] text-[#555064]">{step.content}</div>
      </div>

      <div className="mx-6 flex items-center justify-between gap-4 border-t border-[#e9e5ed] py-3">
        <span className="text-[12px] font-medium text-[#746f7c]">{data.labels.progress}</span>
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
                key={`glossary-${data.phase}-tour-progress-${dotIndex}`}
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
          {data.labels.skip}
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
            {data.labels.back}
          </button>
          <button
            {...primaryButtonProps}
            className="h-9 rounded-[8px] bg-[#21175c] px-5 text-[13px] font-bold text-white shadow-[0_6px_14px_rgba(33,23,92,0.18)] transition-colors hover:bg-[#342779]"
            onClick={runWithCrossfade(onPrimary, isLastStep ? null : index + 1)}
            type="button"
          >
            {isLastStep ? data.labels.finish : data.labels.next}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GlossaryGuidedTour({
  locale,
  phase,
}: {
  locale: GlossaryLocale;
  phase: GlossaryTourPhase;
}) {
  const copy = glossaryTourCopy[locale];
  const bulbGradientId = useId().replaceAll(":", "");
  const [isClientReady, setIsClientReady] = useState(false);
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourSession, setTourSession] = useState(0);
  const userIdRef = useRef<string | null>(null);
  const hasCompletedPhaseRef = useRef(false);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTourStart = useCallback((delay: number) => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
    }

    setRun(false);
    setStepIndex(0);
    startTimerRef.current = setTimeout(() => {
      scrollGlossaryTourTargetIntoView(phase, 0);
      startTimerRef.current = setTimeout(() => setRun(true), GUIDED_TOUR_START_DELAY_MS);
    }, delay);
  }, [phase]);

  const steps = useMemo<Step[]>(() => phaseTargets[phase].map((target, index) => {
    const stepCopy = index === 0 ? glossaryTourOverviewCopy[locale][phase] : copy.phases[phase][index - 1];

    return {
      ...target,
      content: stepCopy.description,
      data: {
        labels: {
          back: copy.labels.back,
          finish: copy.labels.finish,
          next: copy.labels.next,
          progress: copy.labels.progress,
          skip: copy.labels.skip,
          step: copy.labels.step,
        },
        phase,
      } satisfies GlossaryTourStepData,
      skipBeacon: true,
      title: stepCopy.title,
    };
  }), [copy, locale, phase]);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const completeCurrentPhase = useCallback(async () => {
    if (hasCompletedPhaseRef.current) {
      return;
    }

    hasCompletedPhaseRef.current = true;
    const userId = userIdRef.current;

    if (phase === "list") {
      if (userId) {
        writeCreateStage(userId);
      }
      return;
    }

    try {
      await AuthService.updateUserProfile({
        walkthrough_status: {glossary_tour: true},
      });

      if (userId) {
        clearStage(userId);
      }
    } catch (error) {
      hasCompletedPhaseRef.current = false;
      console.error("Failed to save Glossary tour status", error);
    }
  }, [phase]);

  useEffect(() => {
    let isMounted = true;

    const checkTourStatus = async () => {
      try {
        const user = await AuthService.getCurrentUser();

        if (!isMounted) {
          return;
        }

        userIdRef.current = user.id;

        if (user.walkthrough_status?.glossary_tour === true) {
          clearStage(user.id);
          return;
        }

        const stage = readStage(user.id);
        const shouldStart =
          (phase === "list" && stage !== "create") ||
          (phase === "create" && stage === "create");

        if (shouldStart) {
          scheduleTourStart(450);
        }
      } catch (error) {
        console.error("Failed to load Glossary tour status", error);
      }
    };

    void checkTourStatus();

    return () => {
      isMounted = false;

      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
      }
    };
  }, [phase, scheduleTourStart]);

  const handleTourEvent = useCallback(({action, index, status, type}: EventData) => {
    if (type === EVENTS.TOUR_END && (status === STATUS.FINISHED || status === STATUS.SKIPPED)) {
      setRun(false);
      setStepIndex(0);
      setTourSession((currentSession) => currentSession + 1);
      void completeCurrentPhase();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  }, [completeCurrentPhase]);

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
          key={`${phase}-${tourSession}-${stepIndex}`}
          locale={{
            back: copy.labels.back,
            last: copy.labels.finish,
            next: copy.labels.next,
            skip: copy.labels.skip,
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
          tooltipComponent={GlossaryTourTooltip}
        />
      ) : null}

      <button
        aria-label={copy.labels.launcherLabel[phase]}
        aria-pressed={run}
        className="dashboard-tour-launcher fixed bottom-5 left-5 z-[70] flex size-12 items-center justify-center rounded-[12px] border border-[#b8cef2] bg-[#dbeafe] shadow-[0_10px_24px_rgba(33,23,92,0.18)] transition-[background-color,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#cfe2ff] hover:shadow-[0_13px_28px_rgba(33,23,92,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21175c] focus-visible:ring-offset-2"
        onClick={restartTour}
        title={copy.labels.launcherLabel[phase]}
        type="button"
      >
        <Lightbulb
          aria-hidden="true"
          className="size-6"
          stroke={`url(#${bulbGradientId})`}
          strokeWidth={2.2}
        >
          <defs key={`glossary-${phase}-tour-bulb-gradient-definition`}>
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
