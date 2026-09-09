"use client";

import {
  ArrowRight,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  History,
  ImagePlus,
  Languages,
  Play,
  type LucideIcon,
} from "lucide-react";
import {useLocale} from "next-intl";
import {useState} from "react";
import {
  DashboardFooter,
  DashboardHeader,
  FileFormatBadgeBackground,
} from "../dashboard/dashboard-shell";

type GuideLocale = "en" | "vi" | "ja";
type GuideSectionKey = "translation" | "glossary" | "history" | "videos";
type GlossaryTopicKey = "create" | "edit" | "share";
type MediaLayout = "single" | "sequence" | "independent";
type SlideDirection = "backward" | "forward";

type MediaSlot = {
  label: string;
};

type MediaGroup = {
  layout: MediaLayout;
  slots: MediaSlot[];
  title?: string;
};

type GuideStep = {
  description: string;
  media: MediaGroup[];
  title: string;
};

type GuideTopic = {
  steps: GuideStep[];
  title: string;
};

type GuideCopy = {
  common: {
    imagePlaceholder: string;
    next: string;
    previous: string;
    step: string;
    videoPlaceholder: string;
  };
  glossary: {
    description: string;
    title: string;
    topics: Record<GlossaryTopicKey, GuideTopic>;
  };
  history: {
    description: string;
    steps: GuideStep[];
    title: string;
  };
  navigationTitle: string;
  sections: Record<GuideSectionKey, string>;
  translation: {
    description: string;
    steps: GuideStep[];
    title: string;
  };
  videos: {
    description: string;
    items: Array<{description: string; title: string}>;
    title: string;
  };
};

const singleImage = (label: string): MediaGroup => ({
  layout: "single",
  slots: [{label}],
});

const guidanceCopy: Record<GuideLocale, GuideCopy> = {
  vi: {
    navigationTitle: "Chức năng",
    sections: {
      translation: "Quy trình dịch",
      glossary: "Quản lý Bộ thuật ngữ",
      history: "Lịch sử dịch",
      videos: "Video hướng dẫn",
    },
    common: {
      imagePlaceholder: "Vị trí ảnh minh họa",
      videoPlaceholder: "Vị trí video hướng dẫn",
      previous: "Bước trước",
      next: "Bước tiếp theo",
      step: "Bước",
    },
    translation: {
      title: "Quy trình dịch",
      description: "Làm quen với toàn bộ quy trình dịch qua bốn bước ngắn.",
      steps: [
        {
          title: "Chọn tệp",
          description: "Chọn tài liệu từ máy tính hoặc dùng lại tài liệu đã tải lên trước đó.",
          media: [
            {
              title: "Cách 1: Tải tệp từ máy tính",
              layout: "sequence",
              slots: [{label: "Mở khu vực tải tệp"}, {label: "Chọn tệp cần dịch"}],
            },
            {
              title: "Cách 2: Dùng tệp đã tải lên",
              layout: "sequence",
              slots: [{label: "Mở danh sách tệp"}, {label: "Chọn tệp đã tải lên"}],
            },
          ],
        },
        {
          title: "Cấu hình tệp",
          description: "Chọn ngôn ngữ, tùy chọn dịch hình ảnh và các thiết lập phù hợp cho tài liệu.",
          media: [singleImage("Cấu hình bản dịch")],
        },
        {
          title: "Theo dõi tiến trình",
          description: "Theo dõi trạng thái và phần trăm xử lý của từng tệp trong tác vụ dịch.",
          media: [singleImage("Tiến trình xử lý")],
        },
        {
          title: "Xác nhận kết quả",
          description: "Tải kết quả đã hoàn thành hoặc quay lại cấu hình để tạo một bản dịch khác.",
          media: [
            {
              layout: "independent",
              slots: [{label: "Tải tệp đích"}, {label: "Cấu hình lại bản dịch"}],
            },
          ],
        },
      ],
    },
    glossary: {
      title: "Quản lý Bộ thuật ngữ",
      description: "Tạo, cập nhật và chia sẻ thuật ngữ dùng chung cho các bản dịch.",
      topics: {
        create: {
          title: "Tạo Bộ thuật ngữ",
          steps: [
            {
              title: "Chọn tạo mới",
              description: "Mở danh sách và chọn tạo một Bộ thuật ngữ mới.",
              media: [singleImage("Nút tạo mới")],
            },
            {
              title: "Nhập thông tin",
              description: "Nhập tên, mô tả và chọn cặp ngôn ngữ cho Bộ thuật ngữ.",
              media: [singleImage("Thông tin cơ bản")],
            },
            {
              title: "Nhập thuật ngữ",
              description: "Nhập từng cặp thuật ngữ thủ công hoặc nhập nhiều thuật ngữ từ tệp.",
              media: [
                {
                  layout: "independent",
                  slots: [{label: "Nhập thủ công"}, {label: "Nhập từ tệp"}],
                },
              ],
            },
            {
              title: "Tạo mới",
              description: "Kiểm tra dữ liệu và hoàn tất việc tạo Bộ thuật ngữ.",
              media: [singleImage("Hoàn tất tạo mới")],
            },
          ],
        },
        edit: {
          title: "Chỉnh sửa Bộ thuật ngữ",
          steps: [
            {
              title: "Chọn chỉnh sửa",
              description: "Mở Bộ thuật ngữ cần cập nhật và chọn chỉnh sửa.",
              media: [singleImage("Nút chỉnh sửa")],
            },
            {
              title: "Sửa thông tin",
              description: "Cập nhật nội dung hoặc các cặp thuật ngữ cần thay đổi.",
              media: [singleImage("Nội dung chỉnh sửa")],
            },
            {
              title: "Lưu thay đổi",
              description: "Kiểm tra các thay đổi và lưu lại Bộ thuật ngữ.",
              media: [singleImage("Nút lưu thay đổi")],
            },
          ],
        },
        share: {
          title: "Chia sẻ Bộ thuật ngữ",
          steps: [
            {
              title: "Chọn chia sẻ",
              description: "Chọn biểu tượng chia sẻ trên Bộ thuật ngữ mong muốn.",
              media: [singleImage("Nút chia sẻ")],
            },
            {
              title: "Thiết lập quyền",
              description: "Chọn công khai hoặc cấp quyền cho người dùng cụ thể.",
              media: [singleImage("Tùy chọn chia sẻ")],
            },
            {
              title: "Hoàn tất",
              description: "Xác nhận danh sách quyền truy cập và hoàn tất chia sẻ.",
              media: [singleImage("Hoàn tất chia sẻ")],
            },
          ],
        },
      },
    },
    history: {
      title: "Lịch sử dịch",
      description: "Tra cứu tác vụ, theo dõi tiến trình và tải lại kết quả dịch.",
      steps: [
        {
          title: "Xem thông tin bản dịch",
          description: "Mở chi tiết để xem tệp, ngôn ngữ và cấu hình đã sử dụng.",
          media: [singleImage("Chi tiết bản dịch")],
        },
        {
          title: "Theo dõi tiến trình",
          description: "Theo dõi trạng thái và phần trăm của các tệp đang xử lý.",
          media: [singleImage("Trạng thái đang xử lý")],
        },
        {
          title: "Tải tệp đã dịch",
          description: "Tải tệp gốc hoặc tệp đích khi bản dịch đã hoàn tất.",
          media: [singleImage("Thao tác tải tệp")],
        },
      ],
    },
    videos: {
      title: "Video hướng dẫn",
      description: "Xem toàn bộ thao tác dưới dạng video cho ba nhóm chức năng chính.",
      items: [
        {title: "Quy trình dịch", description: "Từ chọn tệp đến nhận kết quả dịch."},
        {title: "Quản lý Bộ thuật ngữ", description: "Tạo, chỉnh sửa và chia sẻ Bộ thuật ngữ."},
        {title: "Lịch sử dịch", description: "Theo dõi và tải lại các tệp đã xử lý."},
      ],
    },
  },
  en: {
    navigationTitle: "Features",
    sections: {
      translation: "Translation process",
      glossary: "Manage glossaries",
      history: "Translation history",
      videos: "Guide videos",
    },
    common: {
      imagePlaceholder: "Illustration placeholder",
      videoPlaceholder: "Guide video placeholder",
      previous: "Previous step",
      next: "Next step",
      step: "Step",
    },
    translation: {
      title: "Translation process",
      description: "Learn the complete translation workflow in four short steps.",
      steps: [
        {
          title: "Select files",
          description: "Choose documents from your computer or reuse previously uploaded documents.",
          media: [
            {
              title: "Method 1: Upload from computer",
              layout: "sequence",
              slots: [{label: "Open the upload area"}, {label: "Select files to translate"}],
            },
            {
              title: "Method 2: Use uploaded files",
              layout: "sequence",
              slots: [{label: "Open the file list"}, {label: "Select uploaded files"}],
            },
          ],
        },
        {
          title: "Configure files",
          description: "Choose languages, image translation, and the options appropriate for your documents.",
          media: [singleImage("Translation configuration")],
        },
        {
          title: "Track progress",
          description: "Track the status and processing percentage of every file in the translation job.",
          media: [singleImage("Processing progress")],
        },
        {
          title: "Confirm results",
          description: "Download completed results or return to configuration to create another translation.",
          media: [
            {
              layout: "independent",
              slots: [{label: "Download target file"}, {label: "Configure another translation"}],
            },
          ],
        },
      ],
    },
    glossary: {
      title: "Manage glossaries",
      description: "Create, update, and share terminology used across translations.",
      topics: {
        create: {
          title: "Create a glossary",
          steps: [
            {
              title: "Choose create new",
              description: "Open the glossary list and start a new glossary.",
              media: [singleImage("Create new button")],
            },
            {
              title: "Enter information",
              description: "Enter a name and description, then choose the language pair.",
              media: [singleImage("Basic information")],
            },
            {
              title: "Enter terms",
              description: "Enter term pairs manually or import multiple terms from a file.",
              media: [
                {
                  layout: "independent",
                  slots: [{label: "Manual entry"}, {label: "Import from file"}],
                },
              ],
            },
            {
              title: "Create glossary",
              description: "Review the data and finish creating the glossary.",
              media: [singleImage("Finish creation")],
            },
          ],
        },
        edit: {
          title: "Edit a glossary",
          steps: [
            {
              title: "Choose edit",
              description: "Open the glossary you want to update and choose edit.",
              media: [singleImage("Edit button")],
            },
            {
              title: "Update information",
              description: "Change the details or term pairs that need updating.",
              media: [singleImage("Editable content")],
            },
            {
              title: "Save changes",
              description: "Review and save the glossary changes.",
              media: [singleImage("Save changes button")],
            },
          ],
        },
        share: {
          title: "Share a glossary",
          steps: [
            {
              title: "Choose share",
              description: "Select the share icon on the desired glossary.",
              media: [singleImage("Share button")],
            },
            {
              title: "Set permissions",
              description: "Make it public or grant access to specific users.",
              media: [singleImage("Sharing options")],
            },
            {
              title: "Finish",
              description: "Review the access list and finish sharing.",
              media: [singleImage("Finish sharing")],
            },
          ],
        },
      },
    },
    history: {
      title: "Translation history",
      description: "Review jobs, monitor progress, and download translation results again.",
      steps: [
        {
          title: "View translation details",
          description: "Open details to inspect files, languages, and options used.",
          media: [singleImage("Translation details")],
        },
        {
          title: "Track processing progress",
          description: "Monitor the status and percentage of files currently being processed.",
          media: [singleImage("Processing status")],
        },
        {
          title: "Download translated files",
          description: "Download source or target files after translation is complete.",
          media: [singleImage("File download actions")],
        },
      ],
    },
    videos: {
      title: "Guide videos",
      description: "Watch the complete workflows for the three main feature groups.",
      items: [
        {title: "Translation process", description: "From selecting files to receiving translated results."},
        {title: "Manage glossaries", description: "Create, edit, and share glossaries."},
        {title: "Translation history", description: "Monitor and download processed files."},
      ],
    },
  },
  ja: {
    navigationTitle: "機能",
    sections: {
      translation: "翻訳プロセス",
      glossary: "用語集の管理",
      history: "翻訳履歴",
      videos: "ガイド動画",
    },
    common: {
      imagePlaceholder: "説明画像の配置場所",
      videoPlaceholder: "ガイド動画の配置場所",
      previous: "前のステップ",
      next: "次のステップ",
      step: "ステップ",
    },
    translation: {
      title: "翻訳プロセス",
      description: "4つの短いステップで翻訳フロー全体を確認できます。",
      steps: [
        {
          title: "ファイルを選択",
          description: "パソコンから文書を選択するか、アップロード済みの文書を再利用します。",
          media: [
            {
              title: "方法1：パソコンからアップロード",
              layout: "sequence",
              slots: [{label: "アップロード領域を開く"}, {label: "翻訳するファイルを選択"}],
            },
            {
              title: "方法2：アップロード済みファイルを使用",
              layout: "sequence",
              slots: [{label: "ファイル一覧を開く"}, {label: "アップロード済みファイルを選択"}],
            },
          ],
        },
        {
          title: "ファイルを設定",
          description: "言語、画像翻訳、文書に適したオプションを選択します。",
          media: [singleImage("翻訳設定")],
        },
        {
          title: "進捗を確認",
          description: "翻訳ジョブ内の各ファイルの状態と処理率を確認します。",
          media: [singleImage("処理の進捗")],
        },
        {
          title: "結果を確認",
          description: "完了した結果をダウンロードするか、設定に戻って別の翻訳を作成します。",
          media: [
            {
              layout: "independent",
              slots: [{label: "翻訳済みファイルをダウンロード"}, {label: "翻訳を再設定"}],
            },
          ],
        },
      ],
    },
    glossary: {
      title: "用語集の管理",
      description: "翻訳で共有して使用する用語を作成、更新、共有します。",
      topics: {
        create: {
          title: "用語集を作成",
          steps: [
            {
              title: "新規作成を選択",
              description: "用語集一覧を開き、新しい用語集を作成します。",
              media: [singleImage("新規作成ボタン")],
            },
            {
              title: "情報を入力",
              description: "名前と説明を入力し、言語ペアを選択します。",
              media: [singleImage("基本情報")],
            },
            {
              title: "用語を入力",
              description: "用語ペアを手動で入力するか、ファイルからまとめて読み込みます。",
              media: [
                {
                  layout: "independent",
                  slots: [{label: "手動入力"}, {label: "ファイルから読み込み"}],
                },
              ],
            },
            {
              title: "作成",
              description: "内容を確認して用語集の作成を完了します。",
              media: [singleImage("作成を完了")],
            },
          ],
        },
        edit: {
          title: "用語集を編集",
          steps: [
            {
              title: "編集を選択",
              description: "更新する用語集を開いて編集を選択します。",
              media: [singleImage("編集ボタン")],
            },
            {
              title: "情報を修正",
              description: "必要な詳細や用語ペアを更新します。",
              media: [singleImage("編集内容")],
            },
            {
              title: "変更を保存",
              description: "変更内容を確認して保存します。",
              media: [singleImage("変更を保存ボタン")],
            },
          ],
        },
        share: {
          title: "用語集を共有",
          steps: [
            {
              title: "共有を選択",
              description: "対象の用語集で共有アイコンを選択します。",
              media: [singleImage("共有ボタン")],
            },
            {
              title: "権限を設定",
              description: "公開するか、特定のユーザーにアクセス権を付与します。",
              media: [singleImage("共有オプション")],
            },
            {
              title: "完了",
              description: "アクセス一覧を確認して共有を完了します。",
              media: [singleImage("共有を完了")],
            },
          ],
        },
      },
    },
    history: {
      title: "翻訳履歴",
      description: "ジョブの確認、進捗の監視、翻訳結果の再ダウンロードを行います。",
      steps: [
        {
          title: "翻訳情報を確認",
          description: "詳細を開き、ファイル、言語、使用した設定を確認します。",
          media: [singleImage("翻訳の詳細")],
        },
        {
          title: "処理の進捗を確認",
          description: "処理中のファイルの状態と進捗率を確認します。",
          media: [singleImage("処理中の状態")],
        },
        {
          title: "翻訳済みファイルをダウンロード",
          description: "翻訳完了後に元ファイルまたは翻訳済みファイルをダウンロードします。",
          media: [singleImage("ファイルのダウンロード操作")],
        },
      ],
    },
    videos: {
      title: "ガイド動画",
      description: "3つの主要機能の操作全体を動画で確認できます。",
      items: [
        {title: "翻訳プロセス", description: "ファイルの選択から翻訳結果の受け取りまで。"},
        {title: "用語集の管理", description: "用語集の作成、編集、共有。"},
        {title: "翻訳履歴", description: "処理済みファイルの確認とダウンロード。"},
      ],
    },
  },
};

const sectionItems: Array<{icon: LucideIcon; key: GuideSectionKey}> = [
  {key: "translation", icon: Languages},
  {key: "glossary", icon: BookOpenText},
  {key: "history", icon: History},
  {key: "videos", icon: CirclePlay},
];

const glossaryTopicKeys: GlossaryTopicKey[] = ["create", "edit", "share"];

function MediaPlaceholder({label, placeholder}: {label: string; placeholder: string}) {
  return (
    <div className="relative flex aspect-video min-h-[128px] w-full flex-col items-center justify-center overflow-hidden rounded-[7px] border border-dashed border-[#c9c3d4] bg-white px-4 text-center shadow-[0_3px_12px_rgba(33,23,92,0.035)]">
      <span className="grid size-10 place-items-center rounded-[7px] bg-[#eef4ff] text-[#31548a]">
        <ImagePlus aria-hidden="true" className="size-5" />
      </span>
      <strong className="mt-3 text-[12px] text-[#21175c]">{label}</strong>
      <span className="mt-1 text-[10px] text-[#85808b]">{placeholder}</span>
    </div>
  );
}

function MediaGroupView({group, placeholder}: {group: MediaGroup; placeholder: string}) {
  if (group.layout === "sequence") {
    return (
      <div>
        {group.title ? <p className="mb-2 text-[11px] font-bold text-[#4e4760]">{group.title}</p> : null}
        <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)]">
          <MediaPlaceholder label={group.slots[0].label} placeholder={placeholder} />
          <ArrowRight aria-hidden="true" className="mx-auto size-5 rotate-90 text-[#f06317] sm:rotate-0" />
          <MediaPlaceholder label={group.slots[1].label} placeholder={placeholder} />
        </div>
      </div>
    );
  }

  if (group.layout === "independent") {
    return (
      <div>
        {group.title ? <p className="mb-2 text-[11px] font-bold text-[#4e4760]">{group.title}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {group.slots.map((slot) => (
            <MediaPlaceholder key={slot.label} label={slot.label} placeholder={placeholder} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[740px]">
      {group.title ? <p className="mb-2 text-[11px] font-bold text-[#4e4760]">{group.title}</p> : null}
      <MediaPlaceholder label={group.slots[0].label} placeholder={placeholder} />
    </div>
  );
}

function StepCarousel({
  common,
  currentStep,
  direction,
  onStepChange,
  steps,
}: {
  common: GuideCopy["common"];
  currentStep: number;
  direction: SlideDirection;
  onStepChange: (step: number) => void;
  steps: GuideStep[];
}) {
  const step = steps[currentStep];

  return (
    <section className="overflow-hidden rounded-[8px] border border-[#ddd8e5] bg-white/94 shadow-[0_8px_26px_rgba(33,23,92,0.055)]">
      <div className="flex min-h-[68px] items-stretch border-b border-[#e4dfe9] bg-white/86">
        <div className="flex w-[48px] shrink-0 items-center justify-center border-r border-[#e4dfe9] bg-[#fbfafd] sm:w-[56px]">
          <button
            aria-label={common.previous}
            className="grid size-9 place-items-center rounded-[7px] border border-[#cfc9d8] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-25"
            disabled={currentStep === 0}
            onClick={() => onStepChange(currentStep - 1)}
            title={common.previous}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden px-3 py-3 [scrollbar-width:thin] sm:px-5">
          <div className="flex min-w-[650px] gap-2">
            {steps.map((item, index) => {
              const isActive = index === currentStep;

              return (
                <button
                  aria-current={isActive ? "step" : undefined}
                  className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[7px] border px-3 text-left text-[10px] font-semibold transition-colors ${
                    isActive
                      ? "border-[#21175c] bg-[#eef4ff] text-[#21175c]"
                      : "border-transparent bg-[#f5f2f7] text-[#6f6878] hover:border-[#d4cedd] hover:bg-white"
                  }`}
                  key={item.title}
                  onClick={() => onStepChange(index)}
                  type="button"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                      isActive ? "bg-[#21175c] text-white" : "bg-white text-[#706a78]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="line-clamp-2">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex w-[48px] shrink-0 items-center justify-center border-l border-[#e4dfe9] bg-[#fbfafd] sm:w-[56px]">
          <button
            aria-label={common.next}
            className="grid size-9 place-items-center rounded-[7px] border border-[#cfc9d8] bg-white text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317] disabled:cursor-not-allowed disabled:opacity-25"
            disabled={currentStep === steps.length - 1}
            onClick={() => onStepChange(currentStep + 1)}
            title={common.next}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="px-3 py-5 sm:px-6 sm:py-7">
        <div
          className={`guidance-step-slide guidance-step-slide-${direction} min-w-0`}
          key={`${currentStep}-${step.title}`}
        >
          <div className="min-h-[390px] rounded-[8px] border border-[#e1dce6] bg-[#f8f6fa] p-3 sm:p-5">
            <div className="space-y-4">
              {step.media.map((group, index) => (
                <MediaGroupView
                  group={group}
                  key={`${group.layout}-${group.title ?? index}`}
                  placeholder={common.imagePlaceholder}
                />
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[720px] px-3 pb-2 pt-5 text-center">
            <span className="inline-flex rounded-full bg-[#fff0e7] px-3 py-1 text-[9px] font-bold uppercase text-[#d9570d]">
              {common.step} {currentStep + 1} / {steps.length}
            </span>
            <h2 className="mt-3 text-[18px] font-bold text-[#21175c] sm:text-[21px]">{step.title}</h2>
            <p className="mx-auto mt-2 max-w-[620px] text-[11px] leading-5 text-[#686270] sm:text-[12px]">
              {step.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoTemplates({copy}: {copy: GuideCopy}) {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {copy.videos.items.map((video, index) => (
        <article
          className="content-reveal overflow-hidden rounded-[8px] border border-[#ddd8e5] bg-white/94 shadow-[0_8px_24px_rgba(33,23,92,0.05)]"
          key={video.title}
          style={{animationDelay: `${index * 70}ms`}}
        >
          <div className="relative flex aspect-video items-center justify-center border-b border-[#e3dee8] bg-[#f5f3f8]">
            <span className="grid size-14 place-items-center rounded-full border border-[#f5c7ad] bg-white text-[#f06317] shadow-sm">
              <Play aria-hidden="true" className="ml-0.5 size-5 fill-current" />
            </span>
            <span className="absolute bottom-3 left-3 rounded-[5px] bg-white/92 px-2 py-1 text-[9px] font-semibold text-[#716b79]">
              {copy.common.videoPlaceholder}
            </span>
          </div>
          <div className="p-5">
            <span className="text-[9px] font-bold uppercase text-[#f06317]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="mt-2 text-[16px] font-bold text-[#21175c]">{video.title}</h2>
            <p className="mt-2 text-[11px] leading-5 text-[#6f6878]">{video.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function UserGuidanceView() {
  const rawLocale = useLocale();
  const locale: GuideLocale = rawLocale === "vi" || rawLocale === "ja" ? rawLocale : "en";
  const copy = guidanceCopy[locale];
  const [activeSection, setActiveSection] = useState<GuideSectionKey>("translation");
  const [glossaryTopic, setGlossaryTopic] = useState<GlossaryTopicKey>("create");
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("forward");

  const activeTitle = copy[activeSection].title;
  const activeDescription = copy[activeSection].description;
  const ActiveIcon = sectionItems.find((item) => item.key === activeSection)?.icon ?? Languages;
  const activeSteps =
    activeSection === "translation"
      ? copy.translation.steps
      : activeSection === "history"
        ? copy.history.steps
        : activeSection === "glossary"
          ? copy.glossary.topics[glossaryTopic].steps
          : [];

  const selectSection = (section: GuideSectionKey) => {
    setSlideDirection("forward");
    setActiveSection(section);
    setCurrentStep(0);
  };

  const selectGlossaryTopic = (topic: GlossaryTopicKey) => {
    setSlideDirection("forward");
    setGlossaryTopic(topic);
    setCurrentStep(0);
  };

  const selectStep = (step: number) => {
    if (step === currentStep) return;

    setSlideDirection(step > currentStep ? "forward" : "backward");
    setCurrentStep(step);
  };

  return (
    <div className="login-shell relative isolate flex min-h-dvh flex-col overflow-x-hidden text-[#1f2537]">
      <FileFormatBadgeBackground />
      <DashboardHeader activeNav="guidance" localePath="user-guidance" />

      <main
        className="dashboard-page-body relative z-10 mx-auto w-full max-w-[1540px] flex-1 px-4 pb-14 pt-7 sm:px-8 lg:px-10 lg:pt-9"
        data-dashboard-page="guidance"
      >
        <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="rounded-[8px] border border-[#ddd8e5] bg-white/94 p-2 shadow-[0_8px_24px_rgba(33,23,92,0.06)] lg:sticky lg:top-6">
            <h1 className="border-b border-[#e5e1e9] px-3 py-3 text-[13px] font-bold text-[#21175c]">
              {copy.navigationTitle}
            </h1>
            <nav
              aria-label={copy.navigationTitle}
              className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-1"
            >
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === activeSection;

                return (
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex min-h-12 items-center gap-3 rounded-[7px] border px-2.5 text-left text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "border-[#9bb7ec] bg-[#edf4ff] text-[#21175c]"
                        : "border-transparent text-[#4f4956] hover:border-[#e0dbe5] hover:bg-[#faf9fb]"
                    }`}
                    key={item.key}
                    onClick={() => selectSection(item.key)}
                    type="button"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-[7px] ${
                        isActive
                          ? "bg-[#dce9ff] text-[#214d9a]"
                          : "bg-[#f1eef4] text-[#787180]"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">{copy.sections[item.key]}</span>
                    <ChevronRight
                      aria-hidden="true"
                      className={`size-4 shrink-0 ${
                        isActive
                          ? "text-[#f06317]"
                          : "text-[#aaa4af] group-hover:text-[#f06317]"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">
            <header className="mb-5 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-[#edf4ff] text-[#214d9a]">
                <ActiveIcon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold text-[#21175c] sm:text-[25px]">{activeTitle}</h1>
                <p className="mt-0.5 text-[11px] text-[#716b79] sm:text-[12px]">
                  {activeDescription}
                </p>
              </div>
            </header>

            {activeSection === "glossary" ? (
              <div className="mb-4 flex overflow-x-auto rounded-[8px] border border-[#ddd8e5] bg-white/90 p-1 [scrollbar-width:thin]">
                {glossaryTopicKeys.map((topic) => {
                  const isActive = topic === glossaryTopic;

                  return (
                    <button
                      className={`min-h-10 min-w-[190px] flex-1 rounded-[6px] px-4 text-[11px] font-semibold transition-colors ${
                        isActive
                          ? "bg-[#21175c] text-white shadow-sm"
                          : "text-[#625c69] hover:bg-[#f5f2f7] hover:text-[#21175c]"
                      }`}
                      key={topic}
                      onClick={() => selectGlossaryTopic(topic)}
                      type="button"
                    >
                      {copy.glossary.topics[topic].title}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {activeSection === "videos" ? (
              <VideoTemplates copy={copy} />
            ) : (
              <StepCarousel
                common={copy.common}
                currentStep={Math.min(currentStep, activeSteps.length - 1)}
                direction={slideDirection}
                onStepChange={selectStep}
                steps={activeSteps}
              />
            )}
          </div>
        </div>
      </main>

      <DashboardFooter />
    </div>
  );
}
