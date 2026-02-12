"use client";

import { useState, useEffect, useCallback } from "react"; // [TOUR] Added useCallback
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  BookOpen,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Lightbulb, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/components/contexts/user-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { GlossaryService, AuthService } from "@/api/services";
import { GlossaryResponse } from "@/lib/types";
import { getLanguageName, formatDate } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { useToast } from "@/components/ui/use-toast";
import { getErrorMessage } from "@/lib/error-utils";

import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from "react-joyride";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Logo } from "@/components/logo";

export default function GlossariesPage() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGlossaries, setSelectedGlossaries] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");
  const trmlOnboarding = useTranslations("Onboarding");
  const trml = useTranslations("GlossaryListTour");
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchGlossaries = async () => {
    setLoading(true);
    try {
      const response = await GlossaryService.getGlossaries(); 
      setGlossaries(Array.isArray(response) ? response : []);
    } catch (error) {
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlossaries();
  }, []);

  useEffect(() => {
    // Check both backend status and localStorage
    const hasSeenTour = 
      user?.walkthrough_status?.glossary_tour || 
      localStorage.getItem("glossaryTourCompleted") === "true";
    
    if (!loading && !hasSeenTour && isMounted) {
      setTimeout(() => {
        setRunTour(true);
      }, 1000);
    }
  }, [loading, isMounted, user]);

  const filteredGlossaries = (glossaries || []).filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                <span>Step {index + 1} of {size}</span>
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
              <Button {...backProps} variant="outline" size="sm" className="h-8 text-xs">
                {trmlOnboarding("back")}
              </Button>
            )}
            <Button {...primaryProps} size="sm" className="h-8 text-xs bg-primary text-primary-foreground">
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
           <h3 className="text-lg font-bold mb-2">{trml("welcomeTitle")}</h3>
           <p className="text-muted-foreground leading-relaxed text-left">
             {trml.rich("welcomeDescription", {
               b: (chunks: any) => <b>{chunks}</b>,
               br: () => <br />
             })}
           </p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#create-glossary-btn',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">{trml("createTitle")}</h3>
           <p className="text-muted-foreground leading-relaxed">
             {trml.rich("createDescription", {
               b: (chunks: any) => <b>{chunks}</b>
             })}
           </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#search-glossaries',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">{trml("searchTitle")}</h3>
           <p className="text-muted-foreground leading-relaxed">
             {trml("searchDescription")}
           </p>
        </div>
      ),
      placement: 'bottom',
    },
    ...(filteredGlossaries.length > 0 ? [{
      target: '#first-glossary-card',
      content: (
        <div>
           <h3 className="font-bold text-base mb-1">{trml("detailTitle")}</h3>
           <p className="text-muted-foreground leading-relaxed">
             {trml.rich("detailDescription", {
               b: (chunks: any) => <b>{chunks}</b>,
               br: () => <br />
             })}
           </p>
        </div>
      ),
      placement: 'top' as const,
      spotlightClicks: false,     
      floaterProps: {
        disableAnimation: false,
        disableFlip: true,
      },
    }] : []),
  ];

  // [TOUR] Handle Callback
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
          walkthrough_status: { glossary_tour: true } 
        });
        // Refresh user context to get updated walkthrough_status
        await refreshUser();
        // Remove localStorage after successful backend sync
        localStorage.removeItem("glossaryTourCompleted");
      } catch (error) {
        // Fallback to localStorage if API fails
        console.warn("Failed to sync glossary tour completion to backend:", error);
        localStorage.setItem("glossaryTourCompleted", "true");
      }
    }
  };

  const toggleGlossarySelection = (id: string) => {
    setSelectedGlossaries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGlossaries.size === filteredGlossaries.length) {
      setSelectedGlossaries(new Set());
    } else {
      setSelectedGlossaries(new Set(filteredGlossaries.map((g) => g.id)));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await GlossaryService.deleteGlossary(id);
      setGlossaries((prev) => prev.filter((g) => g.id !== id));
      setSelectedGlossaries((prev) => {
        const newSet = new Set(prev); newSet.delete(id); return newSet;
      });
      toast({ title: trmlGlossaries("deleted"), description: trmlGlossaries("deleteSuccess") });
    } catch (error) {
      setErrorDialog({ open: true, message: getErrorMessage(error) });
    }
  };

  const deleteSelectedGlossaries = async () => {
    try {
      await Promise.all(Array.from(selectedGlossaries).map((id) => GlossaryService.deleteGlossary(id)));
      setGlossaries((prev) => prev.filter((g) => !selectedGlossaries.has(g.id)));
      setSelectedGlossaries(new Set());
      setShowDeleteDialog(false);
      toast({ title: trmlGlossaries("deleted"), description: trmlGlossaries("deleteSelectedSuccess", { count: selectedGlossaries.size }) });
    } catch (error) {
      setErrorDialog({ open: true, message: getErrorMessage(error) });
    }
  };

  return (
    <PageTransition className="container mx-auto px-6 py-10">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              {trmlGlossaries("glossariesTitle")}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {trmlGlossaries("glossariesSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchGlossaries} disabled={loading} className="mr-2">
               <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
               {trmlGlossaries("refresh")}
            </Button>
            {selectedGlossaries.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 w-4 h-4" />
                {trmlGlossaries("delete")}{" "}{selectedGlossaries.size}
              </Button>
            )}
            <Button
              id="create-glossary-btn" // [TOUR] Added ID
              onClick={() => router.push("/dashboard/glossaries/new")}
              className="group"
            >
              <Plus className="mr-2 w-4 h-4" />
              {trmlGlossaries("createGlossary")}
              <ArrowRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Button>
          </div>
        </div>
      </SlideUp>

      {/* Search and Select All */}
      <SlideUp delay={0.1}>
        <div className="flex items-center gap-4 mb-8">
          <div 
            id="search-glossaries" // [TOUR] Added ID
            className="relative flex-1 max-w-md"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={trmlGlossaries("searchGlossaries")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card"
            />
          </div>
          {filteredGlossaries.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedGlossaries.size === filteredGlossaries.length &&
                  filteredGlossaries.length > 0
                }
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">{trmlGlossaries("selectAll")}</span>
            </div>
          )}
        </div>
      </SlideUp>

      {/* Glossary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
             <div className="col-span-full text-center py-10 text-muted-foreground">{trmlGlossaries("loadingList")}</div>
        ) : filteredGlossaries.map((glossary, index) => (
          <SlideUp key={glossary.id} delay={0.1 + index * 0.05}>
            {/* [TOUR] Added div wrapper with ID for first element */}
            <div id={index === 0 ? "first-glossary-card" : undefined} className="h-full">
                <Card
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer"
                onClick={() =>
                    router.push(`/dashboard/glossaries/${glossary.id}`)
                }
                >
                <CardContent className="p-6 flex flex-col h-full">
                    {/* ... Existing Card Content ... */}
                    <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                        <Checkbox
                        checked={selectedGlossaries.has(glossary.id)}
                        onCheckedChange={() =>
                            toggleGlossarySelection(glossary.id)
                        }
                        onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <BookOpen className="w-6 h-6" />
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() =>
                            router.push(`/dashboard/glossaries/${glossary.id}`)
                            }
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            {trmlGlossaries("view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() =>
                            router.push(
                                `/dashboard/glossaries/${glossary.id}/edit`
                            )
                            }
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            {trmlGlossaries("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(glossary.id);
                            }}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {trmlGlossaries("delete")}
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </div>

                    <h3 className="font-semibold text-lg text-foreground mb-1">
                    {glossary.name}
                    </h3>
                    <div className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 min-h-[40px]">
                    {glossary.description ? (
                        glossary.description
                    ) : (
                        <span className="italic opacity-50">{trmlGlossaries("noDescription")}</span>
                    )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="font-medium text-foreground">
                        {glossary.termCount}
                        </span>{" "}
                        {trmlGlossaries("terms")}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>
                        {trmlCommon(glossary.sourceLanguage)} → {trmlCommon(glossary.targetLanguage)}
                    </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {trmlGlossaries("updated")} {formatDate(glossary.updatedAt)}
                    </div>
                </CardContent>
                </Card>
            </div>
          </SlideUp>
        ))}
      </div>

      {/* Empty State */}
      {!loading && filteredGlossaries.length === 0 && (
        <SlideUp delay={0.2}>
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {trmlGlossaries("noResults")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? trmlGlossaries("searchEmptyHint")
                : trmlGlossaries("createFirst")}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push("/dashboard/glossaries/new")}>
                <Plus className="mr-2 w-4 h-4" />
                {trmlGlossaries("create")}
              </Button>
            )}
          </div>
        </SlideUp>
      )}

      {/* Dialogs... (Keep existing AlertDialogs) */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
         <AlertDialogContent>
             <AlertDialogFooter>
                <AlertDialogCancel>{trmlCommon("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSelectedGlossaries} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{trmlCommon("delete")}</AlertDialogAction>
             </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
         <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" />{trmlCommon("error")}</AlertDialogTitle>
                <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogAction onClick={() => setErrorDialog({ open: false, message: "" })}>{trmlCommon("close")}</AlertDialogAction></AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>

      {/* [TOUR] Joyride Component */}
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
          locale={{
            skip: trmlOnboarding("skipTour"),
            next: trmlOnboarding("next"),
            back: trmlOnboarding("back"),
            last: trmlOnboarding("finish"),
          }}
        />
      )}
      
      {/* [TOUR] Help Button (Optional: to replay tour) */}
      <div className="fixed bottom-6 left-6 z-[100]">
        <motion.button
          onClick={() => setRunTour(true)}
          className="p-3 rounded-full bg-secondary text-secondary-foreground shadow-md hover:shadow-lg transition-all border border-border"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={trmlOnboarding("onboardingHelp")}
        >
          <Lightbulb className="w-5 h-5" />
        </motion.button>
      </div>

    </PageTransition>
  );
}