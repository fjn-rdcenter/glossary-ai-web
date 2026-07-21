"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useRouter } from "@/i18n/routing";
import { AnimatePresence, motion } from "framer-motion";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { UnifiedFileSetup } from "./components/unified-file-setup";
import { TranslationService, GlossaryService, AuthService } from "@/api/services";
import { useUser } from "@/components/contexts/user-context";
import { usePendingUploadStore } from "@/lib/pending-upload-store";
import { MultiFileOverview } from "./components/multi-file-overview";
import { MultiTranslationProgress } from "./components/multi-translation-progress";

import { FileConfigState, TranslationStatus } from "./types";
import { GlossaryResponse } from "@/lib/types";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Lightbulb, Settings, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Joyride, { CallBackProps, EVENTS, ACTIONS, STATUS, Step, TooltipRenderProps } from "react-joyride";

export const dynamic = "force-dynamic";
function TranslatePageContent() {
  const router = useRouter();
  const trmlCommon = useTranslations("Common");
  const trmlOnboarding = useTranslations("Onboarding");
  const trmlTranslate = useTranslations("Translate");
  const trmlDocumentSetup = useTranslations("DocumentSetup");
  const trmlGlossarySelection = useTranslations("GlossarySelection");
  const trmlTranslationExecution = useTranslations("TranslationExecution");
  const trmlUploadTour = useTranslations("UploadTour");

  // Tour State
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, loading: userLoading, refreshUser } = useUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);



  const CustomTooltip = ({
    index,
    step,
    backProps,
    primaryProps,
    skipProps,
    tooltipProps,
    size,
    isLastStep
  }: TooltipRenderProps) => {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          primaryProps.onClick(e as any);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [primaryProps]);

    return (
      <div
        {...tooltipProps}
        className="bg-background text-foreground rounded-xl shadow-2xl p-0 max-w-[400px] border border-border overflow-hidden flex flex-col"
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>{trmlCommon("stepIndicator", { current: index + 1, total: size })}</span>
          </div>
          <div className="text-sm">
            {step.content}
          </div>
        </div>
        <div className="p-4 bg-muted/30 border-t border-border flex justify-between items-center">
          <button
            {...skipProps}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            {trmlOnboarding("skipTour")}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button
                {...backProps}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                {trmlOnboarding("back")}
              </Button>
            )}
            <Button
              {...primaryProps}
              size="sm"
              className="h-8 text-xs bg-primary text-primary-foreground"
            >
              {isLastStep ? trmlOnboarding("finish") : trmlOnboarding("next")}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const tourSteps: Step[] = [
    {
      target: '#tour-file-list',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trmlUploadTour("fileListTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlUploadTour.rich("fileListDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'right' as const,
      disableBeacon: true,
    },
    {
      target: '#tour-language-options',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trmlUploadTour("languageTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlUploadTour.rich("languageDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'bottom' as const,
    },
    {
      target: '#tour-translate-images',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trmlUploadTour("translateImagesTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlUploadTour.rich("translateImagesDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'bottom' as const,
    },
    {
      target: '#tour-glossary-section',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trmlUploadTour("glossaryTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlUploadTour.rich("glossaryDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'top' as const,
    },
    {
      target: '#tour-action-buttons',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trmlUploadTour("actionTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlUploadTour.rich("actionDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'top' as const,
      spotlightClicks: false,
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunTour(false);

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      try {
        await AuthService.updateUserProfile({
          walkthrough_status: { upload_tour: true }
        });
        await refreshUser();
        localStorage.removeItem("uploadTourCompleted");
      } catch (error) {
        console.warn("Failed to sync upload tour completion to backend:", error);
        localStorage.setItem("uploadTourCompleted", "true");
      }
    }
  };
  // Stores
  const { pendingFiles, clearPendingFiles } = usePendingUploadStore();

  // Application State
  const [appState, setAppState] = useState<"loading" | "overview" | "setup" | "translating">("loading");

  const [fileConfigs, setFileConfigs] = useState<FileConfigState[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [displayFileId, setDisplayFileId] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const hasSeenTour =
      user?.walkthrough_status?.upload_tour ||
      localStorage.getItem("uploadTourCompleted") === "true";

    if (
      !userLoading &&
      !hasSeenTour &&
      isMounted &&
      appState === "setup" &&
      fileConfigs.length > 0
    ) {
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, userLoading, isMounted, appState, fileConfigs.length]);

  useEffect(() => {
    if (!editingFileId) {
      setDisplayFileId(null);
      setIsFading(false);
      return;
    }

    if (editingFileId === displayFileId) return;

    if (!displayFileId) {
      setDisplayFileId(editingFileId);
      return;
    }

    setIsFading(true);
    const timer = setTimeout(() => {
      setDisplayFileId(editingFileId);
      setIsFading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [editingFileId, displayFileId]);

  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  // Glossaries data
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [termQuery, setTermQuery] = useState("");
  const [isCreatingGlossaryOpen, setIsCreatingGlossaryOpen] = useState(false);

  // Polling State
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize from pendingFiles
  useEffect(() => {
    if (pendingFiles && pendingFiles.length > 0 && appState === "loading") {
      const initialConfigs: FileConfigState[] = pendingFiles.map((pf, index) => ({
        id: pf.id,
        file: pf.file,
        documentId: pf.documentId,
        metadata: pf.metadata,
        sourceLanguage: "jp",
        targetLanguage: "vn",
        translateImages: false,
        glossaryOption: "none",
        selectedGlossaries: [],
        translationStatus: "idle",
        jobId: null,
        progress: 0,
      }));
      setFileConfigs(initialConfigs);
      if (initialConfigs.length > 0) {
        setEditingFileId(initialConfigs[0].id);
        setAppState("setup");
      } else {
        setAppState("overview");
      }
    } else if (appState === "loading") {
      setAppState("overview");
    }
  }, [pendingFiles, appState]);

  // Fetch Glossaries when needed
  const fetchGlossaries = useCallback(async () => {
    try {
      const data = await GlossaryService.getGlossaries();
      setGlossaries(data);
    } catch (error) {
      console.error("Failed to fetch glossaries", error);
    }
  }, []);

  useEffect(() => {
    fetchGlossaries();
  }, [fetchGlossaries]);

  const fileConfigsRef = useRef(fileConfigs);
  useEffect(() => {
    fileConfigsRef.current = fileConfigs;
  }, [fileConfigs]);

  // Polling logic
  const checkStatus = useCallback(async () => {
    // Find files that are translating
    const translatingFiles = fileConfigsRef.current.filter(f => f.translationStatus === "translating" && f.jobId);
    if (translatingFiles.length === 0) return;

    try {
      const statusUpdates = await Promise.all(
        translatingFiles.map(async (file) => {
          const jobStatus = await TranslationService.getTranslationStatus(file.jobId!);
          return { id: file.id, status: jobStatus };
        })
      );

      setFileConfigs(prev => prev.map(file => {
        const update = statusUpdates.find(u => u.id === file.id);
        if (!update) return file;

        let newStatus: TranslationStatus = "translating";
        if (update.status.status === "completed") newStatus = "success";
        else if (update.status.status === "failed") newStatus = "error";
        else if (update.status.status === "cancelled") newStatus = "cancelled";

        return {
          ...file,
          translationStatus: newStatus,
          progress: update.status.status === "completed" ? 100 : update.status.progress,
          errorMessage: update.status.errorMessage,
          targetDocumentId: update.status.targetDocument
        };
      }));
    } catch (error) {
      console.error("Status check failed", error);
    }
  }, []);

  useEffect(() => {
    const hasTranslating = fileConfigs.some(f => f.translationStatus === "translating");
    if (hasTranslating && appState === "translating") {
      if (!pollingInterval.current) {
        // Trigger immediately once
        checkStatus();
        pollingInterval.current = setInterval(checkStatus, 2000);
      }
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }
  }, [fileConfigs, appState, checkStatus]);

  // Clean up interval only when component unmounts
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  // --- Handlers ---

  const handleSetupFile = (id: string) => {
    setEditingFileId(id);
    setAppState("setup");
    setFileConfigs(prev => prev.map(f => f.id === id ? { ...f } : f));
  };

  const handleUpdateEditingFile = (updates: Partial<FileConfigState>) => {
    setFileConfigs(prev => prev.map(f => f.id === editingFileId ? { ...f, ...updates } : f));
  };

  const editingFile = fileConfigs.find(f => f.id === editingFileId);
  const displayFile = fileConfigs.find(f => f.id === displayFileId);

  const handleStartAll = async () => {
    setAppState("translating");
    for (const file of fileConfigs) {
      console.log(`Starting translation for ${file.metadata.name} with document ID ${file.documentId}`);
    };

    for (const file of fileConfigs) {
      try {
        const job = await TranslationService.startTranslation({
          sourceLanguage: file.sourceLanguage,
          targetLanguage: file.targetLanguage,
          documentId: file.documentId,
          isTranslateImage: file.translateImages,
          keepSource: file.selectedGlossaries && file.selectedGlossaries.length > 0 ? (file.keepSource ?? (file.sourceLanguage === "vn" || file.sourceLanguage === "vi" ? false : true)) : undefined,
          glossaries: file.selectedGlossaries && file.selectedGlossaries.length > 0 ? file.selectedGlossaries : undefined,
        });

        let newStatus: TranslationStatus = "translating";
        if (job.status === "completed") newStatus = "success";
        else if (job.status === "failed") newStatus = "error";
        else if (job.status === "cancelled") newStatus = "cancelled";

        setFileConfigs(prev => prev.map(f => f.id === file.id ? {
          ...f,
          jobId: job.id,
          translationStatus: newStatus,
          progress: job.status === "completed" ? 100 : job.progress || 0,
        } : f));
      } catch (error) {
        console.error(`Failed to start translation for ${file.metadata.name}`, error);
        setFileConfigs(prev => prev.map(f => f.id === file.id ? { ...f, translationStatus: "error", errorMessage: "Failed to start" } : f));
      }
    }
  };

  const handleAddFiles = (newFiles: Array<{ documentId: string; metadata: { name: string; size: number; type: string } }>) => {
    const newConfigs: FileConfigState[] = newFiles.map((f, index) => ({
      id: `file_${Date.now()}_${Math.random()}`,
      documentId: f.documentId,
      metadata: f.metadata,
      sourceLanguage: "jp",
      targetLanguage: "vn",
      translateImages: false,
      glossaryOption: "none",
      selectedGlossaries: [],
      keepSource: true,
      translationStatus: "idle",
      jobId: null,
      progress: 0,
    }));

    setFileConfigs(prev => [...prev, ...newConfigs]);

    // Auto-select the first new file for setup
    if (newConfigs.length > 0) {
      setEditingFileId(newConfigs[0].id);
      if (appState === "overview") {
        setAppState("setup");
      }
    }
  };

  const handleDownload = async (jobId: string, filename: string) => {
    try {
      const blob = await TranslationService.downloadTranslatedDocument(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorDialog({ open: true, message: "Download failed." });
    }
  };

  const handleCancelAll = async () => {
    const translating = fileConfigs.filter(f => f.translationStatus === "translating" && f.jobId);
    for (const file of translating) {
      try {
        await TranslationService.cancelTranslation(file.jobId!);
      } catch (e) { console.error(e); }
    }
    setFileConfigs(prev => prev.map(f => f.translationStatus === "translating" ? { ...f, translationStatus: "cancelled" } : f));
  };

  const handleCancelFile = async (fileId: string) => {
    const file = fileConfigs.find(f => f.id === fileId);
    if (file && (file.translationStatus === "translating" || file.translationStatus === "idle") && file.jobId) {
      try {
        await TranslationService.cancelTranslation(file.jobId);
      } catch (e) { console.error(e); }
      setFileConfigs(prev => prev.map(f => f.id === fileId ? { ...f, translationStatus: "cancelled" } : f));
    } else if (file && file.translationStatus === "idle" && !file.jobId) {
      // If it hasn't even started sending request yet
      setFileConfigs(prev => prev.map(f => f.id === fileId ? { ...f, translationStatus: "cancelled" } : f));
    }
  };

  const handleRetry = async (fileId: string) => {
    const file = fileConfigs.find(f => f.id === fileId);
    if (!file) return;

    try {
      const job = await TranslationService.startTranslation({
        sourceLanguage: file.sourceLanguage,
        targetLanguage: file.targetLanguage,
        documentId: file.documentId,
        isTranslateImage: file.translateImages,
        keepSource: file.selectedGlossaries && file.selectedGlossaries.length > 0 ? (file.keepSource ?? (file.sourceLanguage === "vn" || file.sourceLanguage === "vi" ? false : true)) : undefined,
        glossaries: file.selectedGlossaries && file.selectedGlossaries.length > 0 ? file.selectedGlossaries : undefined,
      });

      let newStatus: TranslationStatus = "translating";
      if (job.status === "completed") newStatus = "success";
      else if (job.status === "failed") newStatus = "error";
      else if (job.status === "cancelled") newStatus = "cancelled";

      setFileConfigs(prev => prev.map(f => f.id === file.id ? {
        ...f,
        jobId: job.id,
        translationStatus: newStatus,
        progress: job.status === "completed" ? 100 : job.progress || 0,
      } : f));
    } catch (error) {
      setFileConfigs(prev => prev.map(f => f.id === file.id ? { ...f, translationStatus: "error", errorMessage: "Failed to start" } : f));
    }
  };

  const handleNewTranslation = () => {
    clearPendingFiles();
    setFileConfigs([]);
    setEditingFileId(null);
    setAppState("overview");
  };

  if (appState === "loading") {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <PageTransition className="container mx-auto px-6 max-w-8xl">
      <AnimatePresence mode="wait">
        {(appState === "overview" || appState === "setup") && (
          <motion.div
            key="config-side-by-side"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-6"
          >
            {/* Left Master: File List Sidebar */}
            <div className="lg:col-span-4 shrink-0">
              <MultiFileOverview
                files={fileConfigs}
                activeFileId={editingFileId}
                onSetupFile={handleSetupFile}
                onRemoveFile={(id) => {
                  const updated = fileConfigs.filter(f => f.id !== id);
                  setFileConfigs(updated);
                  if (updated.length === 0) {
                    router.push("/dashboard");
                  } else if (editingFileId === id) {
                    // If deleted active file, auto-select the first of the remaining files
                    setEditingFileId(updated[0].id);
                  }
                }}
                onAddFiles={handleAddFiles}
                onStartAll={handleStartAll}
              />
            </div>

            {/* Right Detail: Setup Wizard */}
            <div className="lg:col-span-8 flex flex-col h-full border rounded-lg bg-background p-6 shadow-md relative">
              {editingFile ? (
                <motion.div
                  animate={{ opacity: isFading ? 0 : 1 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="mb-4 shrink-0 flex items-center justify-between pb-4 gap-2 border-b flex-wrap">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {trmlTranslate("fileConfiguration") || "File Configuration"}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-start gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs max-w-full">
                          <FileText className="w-3.5 h-3.5 text-primary/80 shrink-0 mt-0.5" />
                          <span className="font-mono break-all whitespace-normal" title={displayFile?.metadata.name || editingFile.metadata.name}>
                            {displayFile?.metadata.name || editingFile.metadata.name}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col">
                    {displayFile && (
                      <UnifiedFileSetup
                        editingFile={displayFile}
                        onUpdateFile={handleUpdateEditingFile}
                        glossaries={glossaries}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        termQuery={termQuery}
                        setTermQuery={setTermQuery}
                        isCreatingOpen={isCreatingGlossaryOpen}
                        onCreatingOpenChange={setIsCreatingGlossaryOpen}
                        onRefreshGlossaries={fetchGlossaries}
                      />
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Settings className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {trmlTranslate("noFileSelected") || "No File Selected"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                      {trmlTranslate("selectFileInstruction") || "Select a file from the list on the left to start configuring its settings."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {appState === "translating" && (
          <motion.div key="translating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MultiTranslationProgress
              files={fileConfigs}
              isAllCompleted={fileConfigs.every(f => ["success", "error", "cancelled"].includes(f.translationStatus))}
              onDownload={handleDownload}
              onRetry={handleRetry}
              onCancelAll={handleCancelAll}
              onCancel={handleCancelFile}
              onNewTranslation={handleNewTranslation}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {trmlCommon("error")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-medium mt-2">
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ open: false, message: "" })}>
              {trmlCommon("close") || "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMounted && (
        <Joyride
          key={runTour ? 'tour-active' : 'tour-idle'}
          steps={tourSteps}
          run={runTour}
          continuous={true}
          scrollToFirstStep={true}
          disableScrolling={false}
          showProgress={true}
          showSkipButton={true}
          hideCloseButton
          disableOverlayClose
          tooltipComponent={CustomTooltip}
          callback={handleJoyrideCallback}
          floaterProps={{ disableAnimation: true, hideArrow: false }}
          styles={{
            options: {
              backgroundColor: '#ffffff',
              textColor: '#334155',
              overlayColor: "rgba(0, 0, 0, 0.65)",
              zIndex: 10000,
              primaryColor: "#3b82f6",
              width: 400,
            },
            spotlight: { borderRadius: '12px' },
            tooltip: {
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: 0,
            },
            buttonNext: { borderRadius: '8px', fontWeight: 600, outline: 'none' }
          }}
          locale={{
            skip: trmlOnboarding("skipTour"),
            next: trmlOnboarding("next"),
            back: trmlOnboarding("back"),
            last: trmlOnboarding("finish"),
          }}
        />
      )}

      {appState === "setup" && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="fixed bottom-6 left-6 z-[100]">
                <motion.button
                  onClick={() => setRunTour(true)}
                  className="p-3 rounded-full bg-secondary text-secondary-foreground shadow-md hover:shadow-lg transition-all border border-border"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Lightbulb className="w-5 h-5" />
                </motion.button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{trmlOnboarding("onboardingHelp")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </PageTransition>
  );
}

export default function TranslatePage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8">Loading...</div>}>
      <TranslatePageContent />
    </Suspense>
  );
}
