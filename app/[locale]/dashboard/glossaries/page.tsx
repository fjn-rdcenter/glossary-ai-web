"use client";

import { useState, useEffect, useCallback } from "react"; // [TOUR] Added useCallback
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/components/contexts/user-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { GlossaryResponse, PaginatedResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getLanguageName, formatDate } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from "react-joyride";
import { motion } from "framer-motion";
import { ShareGlossaryDialog } from "@/components/glossaries/ShareGlossaryDialog";
import { CloneGlossaryDialog } from "@/components/glossaries/CloneGlossaryDialog";

type GlossaryTab = "my" | "marketplace" | "shared";

const tabAccentStyles: Record<GlossaryTab, { pill: string; icon: string; trigger: string }> = {
  my: {
    pill: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
    icon: "text-sky-600 dark:text-sky-200",
    trigger: "data-[state=active]:bg-sky-50 data-[state=active]:text-sky-700 data-[state=active]:shadow-sm",
  },
  marketplace: {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-200",
    trigger: "data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm",
  },
  shared: {
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200",
    icon: "text-violet-600 dark:text-violet-200",
    trigger: "data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm",
  },
};

export default function GlossariesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: GlossaryTab =
    tabParam === "marketplace" || tabParam === "shared" || tabParam === "my"
      ? tabParam
      : "my";
  const { user, refreshUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [backendSearchQuery, setBackendSearchQuery] = useState("");
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedGlossaries, setSelectedGlossaries] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedGlossaryForShare, setSelectedGlossaryForShare] = useState<{ id: string, name: string } | null>(null);

  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [selectedGlossaryForClone, setSelectedGlossaryForClone] = useState<{ id: string, name: string } | null>(null);
  const [isCheckingClone, setIsCheckingClone] = useState(false);

  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");
  const trmlOnboarding = useTranslations("Onboarding");
  const trml = useTranslations("GlossaryListTour");
  const { toast } = useToast();
  const isMyGlossariesTab = activeTab === "my";

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleTabChange = (value: string) => {
    const nextTab: GlossaryTab =
      value === "marketplace" || value === "shared" || value === "my"
        ? value
        : "my";

    setSearchQuery("");
    setBackendSearchQuery("");
    setPage(1);

    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "my") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const fetchGlossaries = useCallback(async (targetPage?: number, search?: string) => {
    setLoading(true);
    setSelectedGlossaries(new Set());
    try {
      let response: PaginatedResponse<GlossaryResponse>;
      const searchTerm = search !== undefined ? search : backendSearchQuery;
      const currentPage = targetPage !== undefined ? targetPage : page;
      
      const params = {
        search: searchTerm || undefined,
        page: currentPage,
        size: pageSize,
      };

      if (activeTab === "marketplace") {
        response = await GlossaryService.getPublicGlossaries(params);
      } else if (activeTab === "shared") {
        response = await GlossaryService.getSharedWithMeGlossaries(params);
      } else {
        response = await GlossaryService.getGlossaries(params);
      }

      setGlossaries(response.items || []);
      setPage(response.page || 1);
      setTotalItems(response.total || 0);
      setTotalPages(response.pages || 0);
    } catch (error) {
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, backendSearchQuery, page, pageSize]);

  const handleGetGlossary = async (glossaryId: string, glossaryName: string) => {
    if (isCheckingClone) return;
    setIsCheckingClone(true);
    try {
      const permissionData = await GlossaryService.getMyPermission(glossaryId).catch(() => ({ permission: "view" as const }));
      if (permissionData.permission === "owner" || permissionData.permission === "admin") {
        setErrorDialog({ open: true, message: trmlGlossaries("alreadyOwner") });
      } else {
        setSelectedGlossaryForClone({ id: glossaryId, name: glossaryName });
        setCloneDialogOpen(true);
      }
    } catch (error) {
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setIsCheckingClone(false);
    }
  };


  useEffect(() => {
    fetchGlossaries(page, backendSearchQuery);
  }, [page, backendSearchQuery, fetchGlossaries]);

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

  const handleSearch = useCallback(() => {
    setBackendSearchQuery(searchQuery);
    setPage(1);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const filteredGlossaries = glossaries || [];

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
      target: '#glossary-tab-list',
      content: (
        <div>
          <h3 className="font-bold text-base mb-1">{trml("tabsTitle")}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {trml.rich("tabsDescription", {
              b: (chunks: any) => <b>{chunks}</b>
            })}
          </p>
        </div>
      ),
      placement: 'bottom',
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
    <>
      <PageTransition className="container mx-auto px-6">
        {/* Header */}
        <SlideUp>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="mt-1 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-serif font-semibold text-foreground">
                  {trmlGlossaries("glossariesTitle")}
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {trmlGlossaries("glossariesSubtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchGlossaries()} disabled={loading} className="mr-2">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {trmlGlossaries("refresh")}
              </Button>
              {isMyGlossariesTab && selectedGlossaries.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  {trmlGlossaries("delete")}{" "}{selectedGlossaries.size}
                </Button>
              )}
              {isMyGlossariesTab && (
                <Button
                  id="create-glossary-btn" // [TOUR] Added ID
                  onClick={() => router.push("/dashboard/glossaries/new")}
                  className="group"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  {trmlGlossaries("createGlossary")}
                  <ArrowRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Button>
              )}
            </div>
          </div>
        </SlideUp>

        <SlideUp delay={0.05}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
            <div id="glossary-tabs" className="w-full border-b border-border pb-2">
              <TabsList id="glossary-tab-list" className="w-fit h-auto bg-transparent p-0 gap-2">
                {["my", "marketplace", "shared"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary shadow-none"
                  >
                    {tab === "my" ? trmlGlossaries("myGlossaries") : tab === "marketplace" ? trmlGlossaries("marketplace") : trmlGlossaries("sharedWithMe")}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </SlideUp>

        {/* Search and Select All */}
        <SlideUp delay={0.1}>
          <div className="flex items-center gap-4 mb-4">
            <div
              id="search-glossaries" // [TOUR] Added ID
              className="relative flex-1 max-w-md flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder={trmlGlossaries("searchGlossaries")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-10 h-12 bg-card"
                />
              </div>
            </div>
            {isMyGlossariesTab && filteredGlossaries.length > 0 && (
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
                  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer py-0"
                  onClick={() =>
                    router.push(`/dashboard/glossaries/${glossary.id}`)
                  }
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* ... Existing Card Content ... */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        {isMyGlossariesTab && (
                          <Checkbox
                            checked={selectedGlossaries.has(glossary.id)}
                            onCheckedChange={() =>
                              toggleGlossarySelection(glossary.id)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300",
                            tabAccentStyles[activeTab].pill,
                            "group-hover:brightness-95"
                          )}
                        >
                          <BookOpen
                            className={cn(
                              "w-6 h-6",
                              tabAccentStyles[activeTab].icon
                            )}
                          />
                        </div>
                      </div>
                      {isMyGlossariesTab ? (
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
                                  `/dashboard/glossaries/${glossary.id}`
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
                      ) : (
                        <div className="w-8 h-8" />
                      )}
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
                      {glossary.matchedTermCount !== undefined && glossary.matchedTermCount > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <div className="relative inline-flex items-center pt-2" onClick={(e) => e.stopPropagation()}>
                            {/* The Chrome-like bubble */}
                            <div className="bg-[#ffd000] text-black text-[11px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 shadow-sm leading-tight select-none">
                              {trmlGlossaries("termMatched", { count: glossary.matchedTermCount })}
                            </div>
                            {/* The arrow pointing up */}
                            <div className="absolute top-1.5 left-4 w-1.5 h-1.5 bg-[#ffd000] rotate-45 border-l border-t border-yellow-500/20" />
                          </div>
                        </>
                      )}
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>
                        {trmlCommon(glossary.sourceLanguage)} → {trmlCommon(glossary.targetLanguage)}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {trmlGlossaries("updated")} {formatDate(glossary.updatedAt)}
                      </div>
                      {isMyGlossariesTab && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-3 rounded-full gap-1.5 text-[10px] font-semibold uppercase tracking-wider border border-transparent hover:border-primary hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center leading-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedGlossaryForShare({ id: glossary.id, name: glossary.name });
                            setShareDialogOpen(true);
                          }}
                        >
                          <Share2 className="w-3 h-3" />
                          {trmlGlossaries("share") || "Share"}
                        </Button>
                      )}
                      {!isMyGlossariesTab && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-3 rounded-full gap-1.5 text-[10px] font-semibold uppercase tracking-wider border border-transparent hover:border-primary hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center leading-none"
                          disabled={isCheckingClone && selectedGlossaryForClone?.id === glossary.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleGetGlossary(glossary.id, glossary.name);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                          {trmlGlossaries("getGlossary") || "Get This"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SlideUp>
          ))}
        </div>

        {/* Pagination */}
        {!loading && filteredGlossaries.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-xs text-muted-foreground">
              {trmlGlossaries("showing", {
                start: totalItems > 0 ? (page - 1) * pageSize + 1 : 0,
                end: Math.min(page * pageSize, totalItems),
                total: totalItems,
              })}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                aria-label={trmlCommon("previous") || "Previous page"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium min-w-[48px] text-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label={trmlCommon("next") || "Next page"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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
              {isMyGlossariesTab && (
                <p className="text-muted-foreground mb-6">
                  {backendSearchQuery
                    ? trmlGlossaries("searchEmptyHint")
                    : trmlGlossaries("createFirst")}
                </p>
              )}
              {isMyGlossariesTab && !backendSearchQuery && (
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
      {selectedGlossaryForShare && (
        <ShareGlossaryDialog
          key={selectedGlossaryForShare.id}
          glossaryId={selectedGlossaryForShare.id}
          glossaryName={selectedGlossaryForShare.name}
          open={!!selectedGlossaryForShare}
          onOpenChange={(open) => {
            if (!open) setSelectedGlossaryForShare(null);
          }}
        />
      )}
      {selectedGlossaryForClone && (
        <CloneGlossaryDialog
          key={`clone-${selectedGlossaryForClone.id}`}
          glossaryId={selectedGlossaryForClone.id}
          glossaryName={selectedGlossaryForClone.name}
          open={cloneDialogOpen}
          onOpenChange={(open) => {
            setCloneDialogOpen(open);
            if (!open) {
              setSelectedGlossaryForClone(null);
            }
          }}
          onSuccess={() => {
            // Switch to "my" tab to show the cloned glossary
            if (activeTab !== "my") {
              handleTabChange("my");
            } else {
              fetchGlossaries();
            }
          }}
        />
      )}
    </>
  );
}