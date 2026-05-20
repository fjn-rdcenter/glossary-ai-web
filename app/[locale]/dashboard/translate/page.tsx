"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { AlertTriangle, Lightbulb, Settings, FileText } from "lucide-react";
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

  // Stores
  const { pendingFiles } = usePendingUploadStore();

  // Application State
  const [appState, setAppState] = useState<"loading" | "overview" | "setup" | "translating">("loading");

  const [fileConfigs, setFileConfigs] = useState<FileConfigState[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

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
      const initialConfigs: FileConfigState[] = pendingFiles.map(pf => ({
        id: pf.id,
        file: pf.file,
        documentId: pf.documentId,
        metadata: pf.metadata,
        sourceLanguage: "jp",
        targetLanguage: "vn",
        translateImages: false,
        glossaryOption: "none",
        selectedGlossaries: [],
        configStatus: "pending",
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
      router.push("/dashboard");
    }
  }, [pendingFiles, appState, router]);

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
  };

  const handleUpdateEditingFile = (updates: Partial<FileConfigState>) => {
    setFileConfigs(prev => prev.map(f => f.id === editingFileId ? { ...f, ...updates } : f));
  };

  const editingFile = fileConfigs.find(f => f.id === editingFileId);

  const handleSaveConfig = (applyToAll: boolean = false) => {
    const currentEditingFile = fileConfigs.find(f => f.id === editingFileId);
    if (!currentEditingFile) return;

    let updatedConfigs: FileConfigState[] = [];
    if (applyToAll) {
      updatedConfigs = fileConfigs.map(f => ({
        ...f,
        sourceLanguage: currentEditingFile.sourceLanguage,
        targetLanguage: currentEditingFile.targetLanguage,
        translateImages: currentEditingFile.translateImages,
        glossaryOption: currentEditingFile.glossaryOption,
        selectedGlossaries: currentEditingFile.selectedGlossaries,
        configStatus: "configured"
      }));
    } else {
      updatedConfigs = fileConfigs.map(f => f.id === editingFileId ? { ...f, configStatus: "configured" } : f);
    }
    setFileConfigs(updatedConfigs);

    // Auto-advance logic: Find the next file that is still pending configuration
    let nextUnconfiguredId: string | null = null;
    if (!applyToAll) {
      const currentIndex = fileConfigs.findIndex(f => f.id === editingFileId);
      // Look for next pending files starting after the current index
      const nextPending = fileConfigs.slice(currentIndex + 1).find(f => f.configStatus === "pending");
      if (nextPending) {
        nextUnconfiguredId = nextPending.id;
      } else {
        // Wrap around to find any pending file from the start
        const prevPending = fileConfigs.slice(0, currentIndex).find(f => f.configStatus === "pending");
        if (prevPending) {
          nextUnconfiguredId = prevPending.id;
        }
      }
    }

    if (nextUnconfiguredId) {
      setEditingFileId(nextUnconfiguredId);
      setAppState("setup");
    }
  };

  const handleStartAll = async () => {
    setAppState("translating");

    // Start translation for all configured and idle files
    const filesToStart = fileConfigs.filter(f => f.configStatus === "configured" && f.translationStatus === "idle");

    // Optimistically set to translating
    setFileConfigs(prev => prev.map(f =>
      filesToStart.find(fs => fs.id === f.id)
        ? { ...f, translationStatus: "translating", progress: 0 }
        : f
    ));

    for (const file of filesToStart) {
      try {
        const job = await TranslationService.startTranslation({
          sourceLanguage: file.sourceLanguage,
          targetLanguage: file.targetLanguage,
          documentId: file.documentId,
          isTranslateImage: file.translateImages,
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
    const newConfigs: FileConfigState[] = newFiles.map(f => ({
      id: `file_${Date.now()}_${Math.random()}`,
      documentId: f.documentId,
      metadata: f.metadata,
      sourceLanguage: "jp",
      targetLanguage: "vn",
      translateImages: false,
      glossaryOption: "none",
      selectedGlossaries: [],
      configStatus: "pending",
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

    setFileConfigs(prev => prev.map(f => f.id === fileId ? { ...f, translationStatus: "translating", progress: 0 } : f));
    try {
      const job = await TranslationService.startTranslation({
        sourceLanguage: file.sourceLanguage,
        targetLanguage: file.targetLanguage,
        documentId: file.documentId,
        isTranslateImage: file.translateImages,
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

  if (appState === "loading") {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <PageTransition className="container mx-auto px-6 max-w-7xl">
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
                isAllConfigured={fileConfigs.length > 0 && fileConfigs.every(f => f.configStatus === "configured")}
              />
            </div>

            {/* Right Detail: Setup Wizard */}
            <div className="lg:col-span-8 flex flex-col h-full border rounded-lg bg-background p-6 shadow-md relative">
              {editingFile ? (
                <>
                  <div className="mb-6 shrink-0 flex items-center justify-between pb-4 gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {trmlTranslate("fileConfiguration") || "File Configuration"}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                          <FileText className="w-3.5 h-3.5 text-primary/80" />
                          <span className="max-w-[240px] sm:max-w-[400px] truncate font-mono" title={editingFile.metadata.name}>
                            {editingFile.metadata.name}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col">
                    <UnifiedFileSetup
                      editingFile={editingFile}
                      onUpdateFile={handleUpdateEditingFile}
                      glossaries={glossaries}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      termQuery={termQuery}
                      setTermQuery={setTermQuery}
                      isCreatingOpen={isCreatingGlossaryOpen}
                      onCreatingOpenChange={setIsCreatingGlossaryOpen}
                      onRefreshGlossaries={fetchGlossaries}
                      onSaveConfig={handleSaveConfig}
                    />
                  </div>
                </>
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
              onNewTranslation={() => router.push("/dashboard")}
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
