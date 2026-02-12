"use client";

import { useState } from "react";
import {
  BookOpen,
  History,
  Languages,
  FileText,
  Upload,
  Settings,
  Plus,
  Search,
  ArrowRight,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useTranslations, useLocale } from "next-intl";

type Feature = "translation" | "history" | "glossary" | "demo-video";

export function GuidanceClient() {
  const [activeFeature, setActiveFeature] = useState<Feature>("translation");
  const trml = useTranslations("UserGuidance");
  const locale = useLocale();
  

  const demoVideos = {
      en: "https://www.youtube.com/embed/3Sw-1yezq4I",
      vi: "https://www.youtube.com/embed/Su5He2LwIrE",
      ja: "https://www.youtube.com/embed/qIP7c8VFlKg",
  };

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-8 items-start">
      {/* Sidebar Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm sticky top-8">
        <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {trml("features")}
          </h2>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => setActiveFeature("translation")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
              activeFeature === "translation"
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
            )}
          >
            <div
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeFeature === "translation"
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300",
              )}
            >
              <Languages size={18} />
            </div>
            <span className="font-medium text-sm">
              {trml("translationProcess")}
            </span>
            {activeFeature === "translation" && (
              <ChevronRight size={16} className="ml-auto text-blue-500" />
            )}
          </button>

          <button
            onClick={() => setActiveFeature("history")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
              activeFeature === "history"
                ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-200 dark:ring-purple-800"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
            )}
          >
            <div
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeFeature === "history"
                  ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300",
              )}
            >
              <History size={18} />
            </div>
            <span className="font-medium text-sm">
              {trml("translationHistory")}
            </span>
            {activeFeature === "history" && (
              <ChevronRight size={16} className="ml-auto text-purple-500" />
            )}
          </button>

          <button
            onClick={() => setActiveFeature("glossary")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
              activeFeature === "glossary"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 shadow-sm ring-1 ring-green-200 dark:ring-green-800"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
            )}
          >
            <div
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeFeature === "glossary"
                  ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300",
              )}
            >
              <BookOpen size={18} />
            </div>
            <span className="font-medium text-sm">
              {trml("manageGlossary")}
            </span>
            {activeFeature === "glossary" && (
              <ChevronRight size={16} className="ml-auto text-green-500" />
            )}
          </button>

          <button
            onClick={() => setActiveFeature("demo-video")}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
              activeFeature === "demo-video"
                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-sm ring-1 ring-red-200 dark:ring-red-800"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
            )}
          >
            <div
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeFeature === "demo-video"
                  ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300",
              )}
            >
              <PlayCircle size={18} />
            </div>
            <span className="font-medium text-sm">{trml("demoVideo")}</span>
            {activeFeature === "demo-video" && (
              <ChevronRight size={16} className="ml-auto text-red-500" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6 min-h-[500px]">
        {activeFeature === "demo-video" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                <PlayCircle size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trml("demoVideo")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trml("demoVideoSubtitle")}
                </p>
              </div>
            </div>

            <section className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-8">
                <div className="aspect-video w-full rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden relative shadow-lg">
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={demoVideos[locale as keyof typeof demoVideos] || demoVideos.vi}
                    title="GlossaryAI Demo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {trml("demoVideoWelcome")}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    {trml("demoVideoDescription")}
                  </p>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-3 text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="shrink-0 font-bold">
                      {trml("demoVideoNote")}
                    </span>
                    <p>
                      {trml.rich("demoVideoNoteText", {
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
        {activeFeature === "translation" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <Languages size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trml("howToUseTranslation")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trml("followSteps")}
                </p>
              </div>
            </div>

            <section className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-8">
                <Carousel className="w-full max-w-lg mx-auto">
                  <CarouselContent>
                    <CarouselItem>
                      <div className="p-1">
                        <div className="flex flex-col items-center text-center space-y-6">
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-gray-50 dark:bg-gray-900">
                            <Image
                              src="/v2/step_1.png"
                              alt="Select Files & Choose Languages"
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="max-w-md mx-auto">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-sm font-bold text-white mb-4 shadow-sm">
                              1
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                              {trml("step1Title")}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {trml("step1Description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                    <CarouselItem>
                      <div className="p-1">
                        <div className="flex flex-col items-center text-center space-y-6">
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-gray-50 dark:bg-gray-900">
                            <Image
                              src="/v2/step_2.png"
                              alt="Choose Glossaries"
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="max-w-md mx-auto">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-sm font-bold text-white mb-4 shadow-sm">
                              2
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                              {trml("step2Title")}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {trml("step2Description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                    <CarouselItem>
                      <div className="p-1">
                        <div className="flex flex-col items-center text-center space-y-6">
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-gray-50 dark:bg-gray-900">
                            <Image
                              src="/v2/step_3.png"
                              alt="Review Settings"
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="max-w-md mx-auto">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-sm font-bold text-white mb-4 shadow-sm">
                              3
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                              {trml("step3Title")}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {trml("step3Description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                    <CarouselItem>
                      <div className="p-1">
                        <div className="flex flex-col items-center text-center space-y-6">
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg bg-gray-50 dark:bg-gray-900">
                            <Image
                              src="/v2/step_4.png"
                              alt="Start Translation & Download"
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="max-w-md mx-auto">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-sm font-bold text-white mb-4 shadow-sm">
                              4
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                              {trml("step4Title")}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                              {trml("step4Description")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  </CarouselContent>
                  <CarouselPrevious className="h-12 w-12 border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:border-blue-400 text-blue-600 dark:text-blue-400 transition-all duration-300 hover:scale-110 -left-20" />
                  <CarouselNext className="h-12 w-12 border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:border-blue-400 text-blue-600 dark:text-blue-400 transition-all duration-300 hover:scale-110 -right-20" />
                </Carousel>
              </div>
            </section>
          </div>
        )}

        {activeFeature === "history" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                <History size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trml("historyTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trml("historySubtitle")}
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mt-1">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {trml("viewPastJobsTitle")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {trml("viewPastJobsDescription")}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mt-1">
                  <Search size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {trml("smartSearchTitle")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {trml("smartSearchDescription")}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mt-1">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {trml("redownloadTitle")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {trml("redownloadDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeFeature === "glossary" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {trml("glossaryTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {trml("glossarySubtitle")}
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                      <Plus size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {trml("createImportTitle")}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                    {trml("createImportDescription")}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-6 font-mono bg-gray-100 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                    {trml("createImportFormat")}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="px-2.5 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                      {trml("manualCreation")}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
                      {trml("textFileImport")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                      <Settings size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {trml("editManageTitle")}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                    {trml("editManageDescription")}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      {trml("editTerms")}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      {trml("deleteGlossary")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
