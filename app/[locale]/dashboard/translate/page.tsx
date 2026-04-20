"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { StepIndicator } from "@/components/step-indicator";
import { DocumentSetupStep } from "./translating-process/document-setup-step";
import { GlossarySelectionStep } from "./translating-process/glossary-selection-step";
import { TranslationExecutionStep } from "./translating-process/translation-execution-step";
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
import { AlertTriangle, Lightbulb } from "lucide-react";
import Joyride, { CallBackProps, EVENTS, ACTIONS, STATUS, Step, TooltipRenderProps } from "react-joyride";

export const dynamic = "force-dynamic";

const steps = [
  { id: "document", label: "Document" },
  { id: "glossary", label: "Glossary" },
  { id: "preview", label: "Preview" },
];

function TranslatePageContent() {
  const router = useRouter();
  const trmlCommon = useTranslations("Common");
  const trmlOnboarding = useTranslations("Onboarding");
  const trmlTranslate = useTranslations("Translate");
  
  // Stores
  const { pendingFiles } = usePendingUploadStore();
  
  // Application State
  const [appState, setAppState] = useState<"loading" | "overview" | "setup" | "translating">("loading");
  
  const [fileConfigs, setFileConfigs] = useState<FileConfigState[]>([]);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // For setup wizard
  
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
         setAppState("overview");
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
      setCurrentStep(0);
      setAppState("setup");
  };

  const handleUpdateEditingFile = (updates: Partial<FileConfigState>) => {
      setFileConfigs(prev => prev.map(f => f.id === editingFileId ? { ...f, ...updates } : f));
  };

  const editingFile = fileConfigs.find(f => f.id === editingFileId);

  const handleNextStep = () => {
     if (currentStep < 2) {
         setCurrentStep(c => c + 1);
     }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
        setCurrentStep(c => c - 1);
    } else {
        setAppState("overview");
        setEditingFileId(null);
    }
  };

  const handleSaveConfig = (applyToAll: boolean = false) => {
      const currentEditingFile = fileConfigs.find(f => f.id === editingFileId);
      if (applyToAll && currentEditingFile) {
          setFileConfigs(prev => prev.map(f => ({
              ...f,
              sourceLanguage: currentEditingFile.sourceLanguage,
              targetLanguage: currentEditingFile.targetLanguage,
              translateImages: currentEditingFile.translateImages,
              glossaryOption: currentEditingFile.glossaryOption,
              selectedGlossaries: currentEditingFile.selectedGlossaries,
              configStatus: "configured"
          })));
      } else {
          handleUpdateEditingFile({ configStatus: "configured" });
      }
      setAppState("overview");
      setEditingFileId(null);
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
                 glossaries: file.glossaryOption === "existing" ? file.selectedGlossaries : undefined,
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
                 glossaries: file.glossaryOption === "existing" ? file.selectedGlossaries : undefined,
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
    <PageTransition className="container mx-auto px-6">
      {appState === "setup" && (
          <SlideUp>
            <StepIndicator steps={steps} currentStep={currentStep} className="mb-6" />
          </SlideUp>
      )}

      <AnimatePresence mode="wait">
         {appState === "overview" && (
             <motion.div key="overview" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                 <MultiFileOverview
                    files={fileConfigs}
                    onSetupFile={handleSetupFile}
                    onRemoveFile={(id) => setFileConfigs(prev => prev.filter(f => f.id !== id))}
                    onStartAll={handleStartAll}
                    isAllConfigured={fileConfigs.length > 0 && fileConfigs.every(f => f.configStatus === "configured")}
                 />
             </motion.div>
         )}

         {appState === "setup" && editingFile && (
             <motion.div key="setup" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}}>
                {currentStep === 0 && (
                   <DocumentSetupStep
                     uploadedFile={editingFile.metadata}
                     setUploadedFile={() => {}} // Disabled dropping new files here
                     setFileToUpload={() => {}} 
                     sourceLanguage={editingFile.sourceLanguage}
                     setSourceLanguage={(l) => handleUpdateEditingFile({ sourceLanguage: l })}
                     targetLanguage={editingFile.targetLanguage}
                     setTargetLanguage={(l) => handleUpdateEditingFile({ targetLanguage: l })}
                     translateImages={editingFile.translateImages}
                     setTranslateImages={(v) => handleUpdateEditingFile({ translateImages: v })}
                     onNext={handleNextStep}
                     onBack={handlePrevStep}
                   />
                )}
                {currentStep === 1 && (
                   <GlossarySelectionStep
                     glossaryOption={editingFile.glossaryOption}
                     setGlossaryOption={(o) => handleUpdateEditingFile({ glossaryOption: o })}
                     selectedGlossaries={editingFile.selectedGlossaries}
                     setSelectedGlossaries={(g) => handleUpdateEditingFile({ selectedGlossaries: g })}
                     sourceLanguage={editingFile.sourceLanguage}
                     targetLanguage={editingFile.targetLanguage}
                     searchQuery={searchQuery}
                     setSearchQuery={setSearchQuery}
                     termQuery={termQuery}
                     setTermQuery={setTermQuery}
                     glossaries={glossaries}
                     onNext={handleNextStep}
                     onBack={handlePrevStep}
                     onRefresh={fetchGlossaries}
                     isCreatingOpen={isCreatingGlossaryOpen}
                     onCreatingOpenChange={setIsCreatingGlossaryOpen}
                   />
                )}
                {currentStep === 2 && (
                   <TranslationExecutionStep
                     currentStep={2} // Using only preview mode
                     uploadedFile={editingFile.metadata}
                     sourceLanguage={editingFile.sourceLanguage}
                     targetLanguage={editingFile.targetLanguage}
                     glossaryOption={editingFile.glossaryOption}
                     selectedGlossaryList={glossaries.filter(g => editingFile.selectedGlossaries.includes(g.id))}
                     translateImages={editingFile.translateImages}
                     status="idle"
                     progress={0}
                     onBack={handlePrevStep}
                     onStepChange={(s, applyToAll) => { if (s===3) handleSaveConfig(applyToAll) }}
                     onStartTranslation={() => {}}
                     onCancelTranslation={() => {}}
                     onDownload={() => {}}
                     onNewTranslation={() => {}}
                     onRetry={() => {}}
                   />
                )}
             </motion.div>
         )}

         {appState === "translating" && (
             <motion.div key="translating" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
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
