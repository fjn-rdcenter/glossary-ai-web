"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { StepIndicator } from "@/components/step-indicator";
import { DocumentSetupStep } from "./translating-process/document-setup-step";
import { GlossarySelectionStep } from "./translating-process/glossary-selection-step";
import { TranslationExecutionStep } from "./translating-process/translation-execution-step";
import { TranslationService, GlossaryService, AuthService } from "@/api/services";
import { useUser } from "@/components/contexts/user-context";

import { GlossaryResponse } from "@/lib/types";

import { useToast } from "@/hooks/use-toast";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Lightbulb } from "lucide-react";
import Joyride, {
  ACTIONS,
  CallBackProps,
  EVENTS,
  STATUS,
  Step,
  TooltipRenderProps,
} from "react-joyride";

export const dynamic = "force-dynamic";

const steps = [
  { id: "document", label: "Document" },
  { id: "glossary", label: "Glossary" },
  { id: "preview", label: "Preview" },
  { id: "translate", label: "Translate" },
];

export type TranslationStatus =
  | "idle"
  | "translating"
  | "success"
  | "error"
  | "cancelled";

function TranslatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const trml = useTranslations("Translate");
  const trmlCommon = useTranslations("Common");
  const trmlOnboarding = useTranslations("Onboarding");

  // [NEW] Error Dialog State
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  // Translation Config
  const [sourceLanguage, setSourceLanguage] = useState("jp");
  const [targetLanguage, setTargetLanguage] = useState("vn");
  const [selectedGlossaries, setSelectedGlossaries] = useState<string[]>([]);
  const [glossaryOption, setGlossaryOption] = useState<
    "none" | "existing" | "new"
  >("none");

  // Document State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [translateImages, setTranslateImages] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);

  // Translation Job State
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);


  // Polling State
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Glossaries data
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);

  // Search/Filter state for Glossary Step
  const [searchQuery, setSearchQuery] = useState("");
  const [termQuery, setTermQuery] = useState("");

  // Onboarding Tour State
  const [runDocumentTour, setRunDocumentTour] = useState(false);
  const [runGlossaryTour, setRunGlossaryTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [documentTourIndex, setDocumentTourIndex] = useState(0);
  const [glossaryTourIndex, setGlossaryTourIndex] = useState(0);
  const [showSparkle, setShowSparkle] = useState(false);
  // Glossary Creation Dialog State
  const [isCreatingGlossaryOpen, setIsCreatingGlossaryOpen] = useState(false);
  const { user, refreshUser } = useUser();

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize tour state (check if new user for spark effect)
  useEffect(() => {
    if (user && isMounted) {
      // Both document and glossary tours in translate page use upload_tour key
      const shouldShowUploadTour =
        !user.walkthrough_status?.upload_tour &&
        !localStorage.getItem("documentTourCompleted") &&
        !localStorage.getItem("glossaryTourCompleted");

      if (shouldShowUploadTour) {
        setShowSparkle(true);
      }

      // Auto start tour based on current step if upload_tour not completed
      if (!user.walkthrough_status?.upload_tour) {
        if (currentStep === 0 && !localStorage.getItem("documentTourCompleted")) {
          setRunDocumentTour(true);
        } else if (currentStep === 1 && !localStorage.getItem("glossaryTourCompleted")) {
          setRunGlossaryTour(true);
        }
      }
    }
  }, [user, isMounted, currentStep]);


  // Handle tour callback
  const handleDocumentTourCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunDocumentTour(false);
      // Only set localStorage for document tour, don't update backend yet
      // Backend will be updated when glossary tour completes (last step)
      localStorage.setItem("documentTourCompleted", "true");
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Handle Next/Back navigation
      if (action === ACTIONS.NEXT) {
        setDocumentTourIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setDocumentTourIndex(index - 1);
      }
    }
  };

  const handleGlossaryTourCallback = async (data: CallBackProps) => {
    const { status, action, index, type } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunGlossaryTour(false);
      // Remove focus from any element (e.g. restart tour button) to prevent accidental restarts via Enter
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Set localStorage for glossary tour
      localStorage.setItem("glossaryTourCompleted", "true");

      // Check if both tours are completed (document + glossary)
      const bothToursCompleted = localStorage.getItem("documentTourCompleted") === "true";
      
      if (bothToursCompleted) {
        // Only update backend when BOTH tours are complete
        try {
          await AuthService.updateUserProfile({
            walkthrough_status: { upload_tour: true },
          });
          // Refresh user context to get updated walkthrough_status
          await refreshUser();
          // Remove both localStorage items after successful backend sync
          localStorage.removeItem("documentTourCompleted");
          localStorage.removeItem("glossaryTourCompleted");
        } catch (error) {
          // Keep localStorage if API fails
          console.warn("Failed to sync upload tour completion to backend:", error);
        }
      }
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Handle Next/Back navigation
      if (action === ACTIONS.NEXT) {
        setGlossaryTourIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setGlossaryTourIndex(index - 1);
      }
    }
  };

  useEffect(() => {
    // Check for step query parameter first
    const stepParam = searchParams.get("step");

    // Check if coming from dashboard with a pending file
    const pendingFile = sessionStorage.getItem("pendingUploadFile");
    if (
      pendingFile &&
      typeof window !== "undefined" &&
      (window as any).__pendingFile
    ) {
      const fileMetadata = JSON.parse(pendingFile);
      const actualFile = (window as any).__pendingFile;

      // Set the file to upload and the metadata
      setFileToUpload(actualFile);
      setUploadedFile(fileMetadata);

      // Clean up
      sessionStorage.removeItem("pendingUploadFile");
      delete (window as any).__pendingFile;
    }

    // Load saved state
    const storedFile = sessionStorage.getItem("uploadedFile");
    const storedDocId = sessionStorage.getItem("documentId");
    const storedStep = sessionStorage.getItem("currentStep");
    const storedSourceLang = sessionStorage.getItem("sourceLanguage");
    const storedTargetLang = sessionStorage.getItem("targetLanguage");
    const storedGlossaryOption = sessionStorage.getItem("glossaryOption");
    const storedSelectedGlossaries =
      sessionStorage.getItem("selectedGlossaries");
    const storedJobId = sessionStorage.getItem("jobId");

    if (storedDocId) {
      setDocumentId(storedDocId);
      // Only restore file if we have an ID (valid session)
      if (storedFile) setUploadedFile(JSON.parse(storedFile));
    } else if (!pendingFile) {
      // No ID and no pending file, so any stored file is invalid/ghost state. Clear it.
      sessionStorage.removeItem("uploadedFile");
      setDocumentId(storedDocId);
      // Only restore file if we have an ID (valid session)
      if (storedFile) setUploadedFile(JSON.parse(storedFile));
    } else if (!pendingFile) {
      // No ID and no pending file, so any stored file is invalid/ghost state. Clear it.
      sessionStorage.removeItem("uploadedFile");
    }
    if (storedJobId) setJobId(storedJobId);

    // Prioritize URL parameter over sessionStorage
    if (stepParam) {
      const step = parseInt(stepParam);
      setCurrentStep(step);
      router.replace("/dashboard/translate");
    } else if (storedStep) {
      setCurrentStep(parseInt(storedStep));
    }

    // Only restore language settings if we have an active session (documentId exists)
    // Otherwise, use the default values (jp for source, empty for target)
    if (storedDocId) {
      if (storedSourceLang) setSourceLanguage(storedSourceLang);
      if (storedTargetLang) setTargetLanguage(storedTargetLang);
      if (storedGlossaryOption) setGlossaryOption(storedGlossaryOption as any);
      if (storedSelectedGlossaries)
        setSelectedGlossaries(JSON.parse(storedSelectedGlossaries));
    } else {
      // Clear old session data when starting fresh
      sessionStorage.removeItem("sourceLanguage");
      sessionStorage.removeItem("targetLanguage");
      sessionStorage.removeItem("glossaryOption");
      sessionStorage.removeItem("selectedGlossaries");
    }
  }, [searchParams, router]);

  // Save state changes
  useEffect(() => {
    sessionStorage.setItem("currentStep", currentStep.toString());
  }, [currentStep]);

  useEffect(() => {
    sessionStorage.setItem("sourceLanguage", sourceLanguage);
  }, [sourceLanguage]);

  useEffect(() => {
    sessionStorage.setItem("targetLanguage", targetLanguage);
  }, [targetLanguage]);

  useEffect(() => {
    sessionStorage.setItem("glossaryOption", glossaryOption);
  }, [glossaryOption]);

  useEffect(() => {
    sessionStorage.setItem(
      "selectedGlossaries",
      JSON.stringify(selectedGlossaries)
    );
  }, [selectedGlossaries]);


  useEffect(() => {
    if (documentId) sessionStorage.setItem("documentId", documentId);
    else sessionStorage.removeItem("documentId");
  }, [documentId]);

  useEffect(() => {
    if (jobId) sessionStorage.setItem("jobId", jobId);
    else sessionStorage.removeItem("jobId");
  }, [jobId]);

  const fetchGlossaries = async () => {
    try {
      const data = await GlossaryService.getGlossaries();
      setGlossaries(data);
    } catch (error) {
      console.error("Failed to fetch glossaries", error);
    }
  };

  // Fetch glossaries when entering step 1
  useEffect(() => {
    if (currentStep === 1) {
      fetchGlossaries();
    }
  }, [currentStep]);


  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Polling logic
  useEffect(() => {
    if (status === "translating" && jobId) {
      // Check immediately
      checkStatus(jobId);

      // Set interval
      pollingInterval.current = setInterval(() => {
        checkStatus(jobId);
      }, 2000); // Poll every 2 seconds
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [status, jobId, stopPolling]);

  const checkStatus = async (id: string) => {
    try {
      const jobStatus = await TranslationService.getTranslationStatus(id);
      setProgress(jobStatus.progress);

      if (jobStatus.status === "completed") {
        setStatus("success");
        setProgress(100);
        stopPolling();
      } else if (jobStatus.status === "failed") {
        setStatus("error");
        stopPolling();
        setErrorDialog({
          open: true,
          message: jobStatus.errorMessage || "Translation failed",
        });
      } else if (jobStatus.status === "cancelled") {
        setStatus("cancelled");
        stopPolling();
      }
    } catch (error) {
      console.error("Status check failed", error);
      // Don't error out completely on one failed check
    }
  };

  // Custom Tooltip Component
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
        {/* Content Area */}
        <div className="p-5 flex flex-col gap-3">
          {/* Step Counter */}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Bước {index + 1} / {size}</span>
          </div>

          {/* Content Body */}
          <div className="text-sm">
            {step.content}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-muted/30 border-t border-border flex justify-between items-center">
          <button
            {...skipProps}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            {trmlOnboarding("skipTour")}
          </button>

          <div className="flex gap-2">
            {index > 0 && (
              <button
                {...backProps}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md border border-border hover:bg-muted"
              >
                {trmlOnboarding("back")}
              </button>
            )}
            <button
              {...primaryProps}
              className="text-xs font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              {isLastStep ? trmlOnboarding("finish") : trmlOnboarding("next")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Tour Steps Configuration
  const documentSetupTourSteps: Step[] = [
    {
      target: '[data-tour="file-upload"]',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">{trmlOnboarding("step1Title")}</h3>
           <p className="text-muted-foreground leading-relaxed">
             {trmlOnboarding("step1Description")}
           </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="language-selection"]',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">{trmlOnboarding("step2Title")}</h3>
           <p className="text-muted-foreground leading-relaxed">
             {trmlOnboarding("step2Description")}
           </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="translate-images"]',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">{trmlOnboarding("step3Title")}</h3>
           <p className="text-muted-foreground leading-relaxed">
             {trmlOnboarding("step3Description")}
           </p>
        </div>
      ),
      placement: "top",
      disableBeacon: true,
    }
  ];

  const glossarySelectionTourSteps: Step[] = [
    {
      target: '[data-tour="glossary-panel"]',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">{trmlOnboarding("step4Title")}</h3>
           <p className="text-muted-foreground leading-relaxed">
             {trmlOnboarding("step4Description")}
           </p>
        </div>
      ),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: '[data-tour="create-glossary-btn"]',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">
             {trmlOnboarding("stepCreateGlossaryTitle")}
           </h3>
           <p className="text-muted-foreground leading-relaxed">
             {trmlOnboarding("stepCreateGlossaryDescription")}
           </p>
        </div>
      ),
      placement: "bottom",
      disableBeacon: true,
    },
  ];

  const handleNext = async () => {
    if (currentStep === 0) {
      // Handle Document Upload if not already uploaded
      if (!documentId && fileToUpload) {
        if (isUploading) return; // Prevent duplicate calls

        setIsUploading(true);
        try {
          const response = await TranslationService.uploadDocument(
            fileToUpload,
            sourceLanguage,
            targetLanguage
          );
          setDocumentId(response.id);
          setUploadedFile({
            name: response.name,
            size: response.size,
            type: response.type,
          });
          sessionStorage.setItem(
            "uploadedFile",
            JSON.stringify({
              name: response.name,
              size: response.size,
              type: response.type,
            })
          );
        } catch (error) {
          console.error("Upload failed", error);
          setErrorDialog({
            open: true,
            message: "Failed to upload document. Please try again.",
          });
          setIsUploading(false);
          return; // Stop navigation
        } finally {
          setIsUploading(false);
        }
      } else if (!documentId && !uploadedFile) {
        // Case 1: No file selected at all
        setErrorDialog({
          open: true,
          message: trml("noDocumentUploaded"),
        });
        return;
      } else if (!documentId && uploadedFile) {
        // Case 2: File appears uploaded (metadata exists) but ID is missing (session lost/inconsistent)
        // This is the specific fix for "No document uploaded" error later on
        setErrorDialog({
          open: true,
          message: trml("documentSessionLost"),
        });
        // Reset state to force re-upload
        setUploadedFile(null);
        sessionStorage.removeItem("uploadedFile");
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      if (currentStep === 3) {
        setStatus("idle");
        setProgress(0);
        stopPolling();
      }
      setCurrentStep(currentStep - 1);
    } else {
      // Going back to dashboard - clear all translation states
      setUploadedFile(null);
      setDocumentId(null);
      setJobId(null);
      setFileToUpload(null);
      setSourceLanguage("jp");
      setTargetLanguage("vn");
      setSelectedGlossaries([]);
      setGlossaryOption("none");
      setStatus("idle");
      setProgress(0);
      stopPolling();

      // Clear all session storage
      sessionStorage.removeItem("uploadedFile");
      sessionStorage.removeItem("pendingUploadFile");
      sessionStorage.removeItem("documentId");
      sessionStorage.removeItem("jobId");
      sessionStorage.removeItem("currentStep");
      sessionStorage.removeItem("sourceLanguage");
      sessionStorage.removeItem("targetLanguage");
      sessionStorage.removeItem("glossaryOption");
      sessionStorage.removeItem("selectedGlossaries");

      router.push("/dashboard");
    }
  };

  const handleStartTranslation = async () => {
    if (!documentId) {
      setErrorDialog({
        open: true,
        message: trml("noDocumentUploaded"),
      });
      return;
    }

    setStatus("translating");
    setProgress(0);

    try {
      const job = await TranslationService.startTranslation({
        sourceLanguage,
        targetLanguage,
        documentId: documentId,
        isTranslateImage: translateImages,
        glossaries:
          glossaryOption === "existing" ? selectedGlossaries : undefined,
      });

      setJobId(job.id);
      // Polling will effectively start via useEffect on status change
    } catch (error) {
      console.error("Translation Start Failed", error);
      setStatus("error");
      setErrorDialog({
        open: true,
        message: trml("failedToStartTranslation"),
      });
    }
  };

  const handleCancelTranslation = async () => {
    stopPolling();
    if (jobId) {
      try {
        await TranslationService.cancelTranslation(jobId);
      } catch (e) {
        console.error("Cancel failed", e);
      }
    }
    setStatus("cancelled");
    setProgress(0);
    setJobId(null);
  };

  const handleDownload = async () => {
    if (!jobId) return;
    try {
      const blob = await TranslationService.downloadTranslatedDocument(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${targetLanguage.toUpperCase()}-${uploadedFile?.name || "document"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
      setErrorDialog({
        open: true,
        message: trml("downloadFailed"),
      });
    }
  };

  const handleNewTranslation = () => {
    // Reset all state
    setCurrentStep(0);
    setUploadedFile(null);
    setDocumentId(null);
    setJobId(null);
    setFileToUpload(null);
    setSourceLanguage("jp");
    setTargetLanguage("vn");
    setSelectedGlossaries([]);
    setGlossaryOption("none");
    setStatus("idle");
    setProgress(0);
    stopPolling();

    // Clear session storage
    sessionStorage.removeItem("uploadedFile");
    sessionStorage.removeItem("documentId");
    sessionStorage.removeItem("jobId");
    sessionStorage.removeItem("currentStep");
    sessionStorage.removeItem("sourceLanguage");
    sessionStorage.removeItem("targetLanguage");
    sessionStorage.removeItem("glossaryOption");
    sessionStorage.removeItem("selectedGlossaries");
  };

  // Helper to retry from failed/cancelled state
  const handleRetry = () => {
    handleStartTranslation();
  };

  const selectedGlossaryList = glossaries.filter((g) =>
    selectedGlossaries.includes(g.id)
  );

  return (
    <PageTransition className="container mx-auto px-6">
      {/* Step Indicator */}
      <SlideUp>
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          className="mb-6"
        />
      </SlideUp>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 0: Document Setup */}
        {currentStep === 0 && (
          <DocumentSetupStep
            uploadedFile={uploadedFile}
            setUploadedFile={(file) => {
              // If null (removed)
              if (!file) {
                setUploadedFile(null);
                setDocumentId(null);
                setFileToUpload(null);
                sessionStorage.removeItem("uploadedFile");
                sessionStorage.removeItem("documentId");
                return;
              }
              // If it's metadata (from storage) -> update meta
              setUploadedFile(file);
            }}
            setFileToUpload={setFileToUpload} // Pass this down
            sourceLanguage={sourceLanguage}
            setSourceLanguage={setSourceLanguage}
            targetLanguage={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            translateImages={translateImages}
            setTranslateImages={setTranslateImages}
            onNext={handleNext}
            onBack={handleBack}
            isUploading={isUploading}
          />
        )}

        {/* Step 1: Glossary Selection */}
        {currentStep === 1 && (
          <GlossarySelectionStep
            glossaryOption={glossaryOption}
            setGlossaryOption={setGlossaryOption}
            selectedGlossaries={selectedGlossaries}
            setSelectedGlossaries={setSelectedGlossaries}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            termQuery={termQuery}
            setTermQuery={setTermQuery}
            glossaries={glossaries} // Pass real glossaries
            onNext={handleNext}
            onBack={handleBack}
            onRefresh={fetchGlossaries}
            isCreatingOpen={isCreatingGlossaryOpen}
            onCreatingOpenChange={setIsCreatingGlossaryOpen}
          />
        )}

        {/* Steps 2 & 3: Preview and Translation Execution */}
        {(currentStep === 2 || currentStep === 3) && (
          <TranslationExecutionStep
            currentStep={currentStep}
            uploadedFile={uploadedFile}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            glossaryOption={glossaryOption}
            selectedGlossaryList={selectedGlossaryList}
            translateImages={translateImages}
            status={status}
            progress={progress}
            onBack={handleBack}
            onStepChange={setCurrentStep}
            onStartTranslation={handleStartTranslation}
            onCancelTranslation={handleCancelTranslation}
            onDownload={handleDownload}
            onNewTranslation={handleNewTranslation}
            onRetry={handleRetry}
          />
        )}
      </AnimatePresence>


      {/* Error Dialog */}
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

      {/* Document Setup Tour */}
      {isMounted && currentStep === 0 && (
        <Joyride
          steps={documentSetupTourSteps}
          run={runDocumentTour}
          continuous
          scrollToFirstStep={true}
          disableScrolling={false}
          spotlightClicks={false}
          showProgress={true}
          showSkipButton={true}
          hideCloseButton
          disableOverlayClose
          tooltipComponent={CustomTooltip}
          stepIndex={documentTourIndex}
          callback={handleDocumentTourCallback}
          floaterProps={{
            disableAnimation: true,
            hideArrow: false,
          }}
          styles={{
            options: {
              backgroundColor: '#ffffff',
              textColor: '#334155',
              overlayColor: "rgba(0, 0, 0, 0.65)",
              zIndex: 10000,
              primaryColor: "#3b82f6",
              width: 400,
            },
            spotlight: {
              borderRadius: '12px',
            },
            tooltip: {
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: 0,
            },
            buttonNext: {
              borderRadius: '8px',
              fontWeight: 600,
              outline: 'none',
            }
          }}
          locale={{
            skip: trmlOnboarding("skipTour"),
            next: trmlOnboarding("next"),
            back: trmlOnboarding("back"),
            last: trmlOnboarding("finish"),
          }}
        />
      )}

      {/* Glossary Selection Tour */}
      {isMounted && currentStep === 1 && (
        <Joyride
          steps={glossarySelectionTourSteps}
          run={runGlossaryTour}
          continuous
          scrollToFirstStep={false}
          disableScrolling={true}
          spotlightClicks={false}
          showProgress={true}
          showSkipButton={true}
          hideCloseButton
          disableOverlayClose
          tooltipComponent={CustomTooltip}
          stepIndex={glossaryTourIndex}
          callback={handleGlossaryTourCallback}
          floaterProps={{
            disableAnimation: true,
            hideArrow: false,
          }}
          styles={{
            options: {
              backgroundColor: '#ffffff',
              textColor: '#334155',
              overlayColor: "rgba(0, 0, 0, 0.65)",
              zIndex: 10000,
              primaryColor: "#3b82f6",
              width: 400,
            },
            spotlight: {
              borderRadius: '12px',
            },
            tooltip: {
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: 0,
            },
            buttonNext: {
              borderRadius: '8px',
              fontWeight: 600,
              outline: 'none',
            }
          }}
          locale={{
            skip: trmlOnboarding("skipTour"),
            next: trmlOnboarding("next"),
            back: trmlOnboarding("back"),
            last: trmlOnboarding("finish"),
          }}
        />
      )}

      {/* Help Button - Bottom Left (Only for Doc Setup & Glossary) */}
      {currentStep <= 1 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="fixed bottom-6 left-6 z-[100]">
                <motion.button
                  onClick={() => {
                    // Reset to section start when manually triggering help
                    if (currentStep === 0) {
                      setDocumentTourIndex(0);
                      setRunDocumentTour(true);
                    }
                    else if (currentStep === 1) {
                      setGlossaryTourIndex(0);
                      setRunGlossaryTour(true);
                    }
                  }}
                  className="p-3 rounded-full bg-secondary text-secondary-foreground shadow-md hover:shadow-lg transition-all border border-border"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Lightbulb className="w-5 h-5" />
                </motion.button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Xem lại hướng dẫn</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </PageTransition>
  );
}

export default function TranslatePage() {
  return (
    <Suspense
      fallback={<div className="container mx-auto px-6 py-8">Loading...</div>}
    >
      <TranslatePageContent />
    </Suspense>
  );
}
