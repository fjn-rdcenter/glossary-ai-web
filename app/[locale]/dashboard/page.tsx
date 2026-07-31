"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TranslationService, GlossaryService, DocumentService, AuthService } from "@/api/services";
import { useUser } from "@/components/contexts/user-context";
import { nanoid } from 'nanoid';

import {
  Upload,
  FileText,
  BookOpen,
  History,
  ArrowRight,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { FileCard } from "@/components/file-card";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from "react-joyride";
import { Logo } from "@/components/logo";
import { toast } from "sonner";
import { usePendingUploadStore } from "@/lib/pending-upload-store";

export default function DashboardPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [stats, setStats] = useState({
    totalTranslations: 0,
    activeGlossaries: 0,
    uniqueDocuments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const trml = useTranslations("Dashboard");
  const trmlTour = useTranslations("DashboardTour");
  const trmlOnboarding = useTranslations("Onboarding");
  const locale = useLocale();

  const tourImages = {
    history: {
      en: "/new/walkthrough/history-preview/history-preview-en-resized.mp4",
      vi: "/new/walkthrough/history-preview/history-preview-vi-resized.mp4",
      ja: "/new/walkthrough/history-preview/history-preview-ja-resized.mp4",
    },
    glossary: {
      en: "/new/walkthrough/glossary-preview/glossary-preview-en-resized.mp4",
      vi: "/new/walkthrough/glossary-preview/glossary-preview-vi-resized.mp4",
      ja: "/new/walkthrough/glossary-preview/glossary-preview-ja-resized.mp4",
    },
    documents: {
      en: "/new/walkthrough/document-preview/document-preview-en-resized.mp4",
      vi: "/new/walkthrough/document-preview/document-preview-vi-resized.mp4",
      ja: "/new/walkthrough/document-preview/document-preview-ja-resized.mp4",
    }
  };

  // Onboarding Tour State
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  const { user, loading: userLoading, refreshUser } = useUser();
  const setPendingFiles = usePendingUploadStore((state) => state.setPendingFiles);
  const clearPendingFiles = usePendingUploadStore((state) => state.clearPendingFiles);

  useEffect(() => {
    setIsMounted(true);

    const preloadVideos = () => {
      const videos = [
        tourImages.history[locale as keyof typeof tourImages.history] || tourImages.history.vi,
        tourImages.glossary[locale as keyof typeof tourImages.glossary] || tourImages.glossary.vi,
        tourImages.documents[locale as keyof typeof tourImages.documents] || tourImages.documents.vi,
      ];

      videos.forEach(src => {
        // Check if link already exists
        if (!document.querySelector(`link[rel="preload"][href="${src}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'fetch';
          link.href = src;
          link.crossOrigin = "anonymous";
          document.head.appendChild(link);
        }
      });
    };

    preloadVideos();
  }, [locale]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [jobsResponse, glossariesResponse, documentsResponse] = await Promise.all([
          TranslationService.getTranslationHistory({ page: 1, size: 1 }),
          GlossaryService.getGlossaries({ page: 1, size: 1 }),
          DocumentService.getSourceDocuments(1, 1),
        ]);
        setStats({
          totalTranslations: jobsResponse.total,
          activeGlossaries: glossariesResponse.total,
          uniqueDocuments: documentsResponse.total,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (
      !userLoading &&
      user &&
      !user.walkthrough_status?.dashboard_tour &&
      !localStorage.getItem("onboardingTourCompleted")
    ) {
      setShowSparkle(true);
      setTimeout(() => {
        setRunTour(true);
      }, 1200);
    }
  }, [user, userLoading]);

  useEffect(() => {
    sessionStorage.clear();
    clearPendingFiles();
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
        {/* Header / Image Area */}
        <div className="p-5 flex flex-col gap-3">
          {/* Step Counter */}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
            <span>Step {index + 1} of {size}</span>
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
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center py-2 px-1">
          <div className="flex justify-center mb-4">
            <Logo size="md" variant="icon" />
          </div>
          <h3 className="text-lg font-bold mb-2">{trmlTour("welcomeTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed text-left">
            {trmlTour.rich("welcomeDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#metric-history',
      content: (
        <div>
          <div className="mb-3 rounded-lg overflow-hidden border border-border">
            <video
              preload="auto"
              src={tourImages.history[locale as keyof typeof tourImages.history] || tourImages.history.vi}
              className="w-full h-auto object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
          <h3 className="font-bold text-base mb-1">{trmlTour("historyTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlTour.rich("historyDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#metric-glossary',
      content: (
        <div>
          <div className="mb-3 rounded-lg overflow-hidden border border-border">
            <video
              preload="auto"
              src={tourImages.glossary[locale as keyof typeof tourImages.glossary] || tourImages.glossary.vi}
              className="w-full h-auto object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
          <h3 className="font-bold text-base mb-1">{trmlTour("glossaryTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlTour.rich("glossaryDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#metric-documents',
      content: (
        <div>
          <div className="mb-3 rounded-lg overflow-hidden border border-border">
            <video
              preload="auto"
              src={tourImages.documents[locale as keyof typeof tourImages.documents] || tourImages.documents.vi}
              className="w-full h-auto object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
          <h3 className="font-bold text-base mb-1">{trmlTour("documentsTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlTour.rich("documentsDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '#upload-zone',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trmlTour("uploadTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trmlTour.rich("uploadDescription", {
              b: (chunks: any) => <b>{chunks}</b>,
              i: (chunks: any) => <i>{chunks}</i>,
              br: () => <br />
            })}
          </p>
        </div>
      ),
      placement: 'top',
      spotlightClicks: false,
      floaterProps: {
        disableAnimation: false,
        disableFlip: true,
      },
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunTour(false);

      // Remove focus from any element to prevent accidental restarts via Enter
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Try to sync with backend
      try {
        await AuthService.updateUserProfile({
          walkthrough_status: { dashboard_tour: true }
        });
        // Refresh user context to get updated walkthrough_status
        await refreshUser();
        // Remove localStorage after successful backend sync
        localStorage.removeItem("onboardingTourCompleted");
      } catch (error) {
        // Fallback to localStorage if API fails
        console.warn("Failed to sync dashboard tour completion to backend:", error);
        localStorage.setItem("onboardingTourCompleted", "true");
      }
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      const sizeError = fileRejections.find(f => f.errors.find((e: any) => e.code === "file-too-large"));
      if (sizeError) {
        setShowSizeWarning(true);
      } else {
        toast.error("Invalid file format.");
      }
    }

    if (acceptedFiles.length === 0) return;

    setFiles(prev => {
      const combined = [...prev, ...acceptedFiles];
      if (combined.length > 5) {
        toast.warning(trml("maxFilesWarning") || "You can only upload up to 5 files. We took the first 5.");
        return combined.slice(0, 5);
      }
      return combined;
    });
  }, []);
  const isPublicDomain =
    typeof window !== "undefined" &&
    window.location.hostname.includes("translatesphere.fujinet.net");
  const maxSizeMB = isPublicDomain ? 20 : 50;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxSize: maxSizeMB * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/html': ['.html'],
      'text/markdown': ['.md'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff', '.tif'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
    multiple: true,
    noClick: true
  });

  const handleContinue = async () => {
    if (files.length > 0) {
      setIsUploadingFiles(true);
      try {
        // Upload all files concurrently. Default language pairs will be overridden in the config screen if needed.
        const uploadPromises = files.map(async (file) => {
          // Use default "jp" to "vn" just for upload endpoint requirement.
          const response = await TranslationService.uploadDocument(file, "jp", "vn");
          return {
            id: nanoid(),
            file,
            documentId: response.id,
            metadata: {
              name: response.name,
              size: response.size,
              type: response.type,
            }
          };
        });

        const uploadedInfos = await Promise.all(uploadPromises);

        setPendingFiles(uploadedInfos);

        // Remove old sessionStorage variables that were for a single file state
        sessionStorage.removeItem("pendingUploadFiles");
        sessionStorage.removeItem("pendingUploadFile");

        router.push("/dashboard/translate");
      } catch (error) {
        console.error("Failed to upload test documents:", error);
        toast.error(trml("uploadFailed") || "Failed to upload documents. Please try again.");
      } finally {
        setIsUploadingFiles(false);
      }
    }
  };

  const metricIds: Record<string, string> = {
    totalTranslation: "metric-history",
    activeGlossaries: "metric-glossary",
    documentsUploaded: "metric-documents",
  };

  const currentStats = [
    { label: "totalTranslation", value: loading ? "…" : stats.totalTranslations.toLocaleString(), change: "totalTranslationUnit", icon: FileText, trend: "neutral" },
    { label: "activeGlossaries", value: loading ? "…" : stats.activeGlossaries.toString(), change: "activeGlossariesUnit", icon: BookOpen, trend: "neutral" },
    { label: "documentsUploaded", value: loading ? "…" : stats.uniqueDocuments.toString(), change: "documentsUploadedUnit", icon: FileText, trend: "neutral" },
  ];

  return (
    <PageTransition className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{trml("dashboard")}</h1>
          <p className="text-muted-foreground mt-1">{trml("dashboardDescription")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/history"><History className="w-4 h-4 mr-2" />{trml("fullHistory")}</Link></Button>
          <Button asChild><Link href="/dashboard/translate"><Upload className="w-4 h-4 mr-2" />{trml("newTranslation")}</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {currentStats.map((stat, i) => {
          let href = "/dashboard/history";
          if (stat.label === "activeGlossaries") href = "/dashboard/glossaries";
          else if (stat.label === "documentsUploaded") href = "/dashboard/documents";

          const elementId = metricIds[stat.label];
          return (
            <SlideUp key={stat.label} delay={i * 0.1}>
              <Link href={href} className="block h-full group">
                <div id={elementId} className="h-full">
                  <Card
                    className="bg-secondary cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 h-full relative"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {trml(stat.label) ?? stat.label}
                      </CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold">{stat.value}</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium text-zinc-500">
                          {trml(stat.change) ?? stat.change}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </Link>
            </SlideUp>
          );
        })}
      </div>

      <div className="space-y-6 max-w-full">
        <Card
          id="upload-zone"
          className="w-full border-2 border-dashed border-border bg-muted/50"
        >
          <CardHeader>
            <CardTitle>{trml("quickUpload")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                {files.length === 0 ? (
                  <div
                    className={cn("w-full rounded-xl p-10 cursor-pointer flex flex-col items-center justify-center text-center gap-4 min-h-[200px] bg-card border border-border shadow-sm hover:border-primary/50", isDragActive && "border-primary")}
                    onClick={open}
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-lg font-medium">{isDragActive ? trml("dropFile") : trml("clickOrDrag")}</p>
                    <p className="text-sm text-muted-foreground font-normal">{trml("supportedFiles", { maxSize: maxSizeMB })}</p>
                  </div>
                ) : (
                  <motion.div key="files" className="space-y-4 max-w-2xl mx-auto">
                    {files.map((file, index) => (
                      <FileCard key={index} name={file.name} size={file.size} type={file.type} status="success" onRemove={() => setFiles((prev) => prev.filter((_, i) => i !== index))} />
                    ))}
                    <div className="flex justify-center pt-4 gap-4">
                      {files.length < 5 && (
                        <Button variant="outline" size="lg" className="min-w-[150px]" onClick={open}>
                          {trml('addMoreFiles') || "Add More Files"}
                        </Button>
                      )}
                      <Button onClick={handleContinue} disabled={isUploadingFiles} size="lg" className="min-w-[220px] gap-2">
                        {isUploadingFiles ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> {trml('uploading') || "Uploading..."}
                          </>
                        ) : (
                          <>
                            {trml('continue')} <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

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
        />
      )}

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

      <AlertDialog open={showSizeWarning} onOpenChange={setShowSizeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{trml("fileTooLargeTitle") || "File Too Large"}</AlertDialogTitle>
            <AlertDialogDescription>
              {trml("fileTooLargeDescription", { maxSize: maxSizeMB }) || `The file you are trying to upload exceeds the ${maxSizeMB}MB maximum size limit. Please choose a smaller file.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSizeWarning(false)}>
              {trmlOnboarding("gotIt") || "Got it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}