import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  MoveRight,
  Edit2,
  X,
  Book,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, getLanguageName } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { GlossaryResponse, GlossaryDetailResponse } from "@/api/types";
import { GlossaryService } from "@/api/services";
import { CreateGlossaryDialog } from "../../../../components/glossary/create-glossary-dialog";
import { EditGlossaryDialog } from "../../../../components/glossary/edit-glossary-dialog";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Loader2 } from "lucide-react";

interface GlossarySelectionStepProps {
  glossaryOption: "none" | "existing" | "new";
  setGlossaryOption: (option: "none" | "existing" | "new") => void;
  selectedGlossaries: string[];
  setSelectedGlossaries: (ids: string[]) => void;
  sourceLanguage: string;
  targetLanguage: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  termQuery: string;
  setTermQuery: (query: string) => void;
  glossaries: GlossaryResponse[];
  onNext: () => void;
  onBack: () => void;
  onRefresh: () => void;
}

export function GlossarySelectionStep({
  glossaryOption,
  setGlossaryOption,
  selectedGlossaries,
  setSelectedGlossaries,
  sourceLanguage,
  targetLanguage,
  searchQuery,
  setSearchQuery,
  termQuery,
  setTermQuery,
  glossaries,
  onNext,
  onBack,
  onRefresh,
}: GlossarySelectionStepProps) {
  // Filtering
  const filteredGlossaries = glossaries.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Viewing state (Read-only view in the panel)
  const [viewingGlossaryId, setViewingGlossaryId] = useState<string | null>(
    null
  );

  // Cache for fetched details
  const [glossaryDetails, setGlossaryDetails] = useState<
    Record<string, GlossaryResponse>
  >({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  // Conflict Handling State
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(
    null
  );
  const [conflictData, setConflictData] = useState<{
    count: number;
    examples: string[];
  } | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Colors for selection (up to 5)
  const SELECTION_COLORS = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
  ];

  const SELECTION_BG_COLORS = [
    "bg-blue-50",
    "bg-green-50",
    "bg-purple-50",
    "bg-orange-50",
    "bg-pink-50",
  ];

  const SELECTION_BORDER_COLORS = [
    "border-blue-200",
    "border-green-200",
    "border-purple-200",
    "border-orange-200",
    "border-pink-200",
  ];

  // Helper to get color index
  const getGlossaryColorIndex = (id: string) => {
    const index = selectedGlossaries.indexOf(id);
    return index !== -1 ? index : -1;
  };

  // Fetch details logic
  const fetchDetailsIfNeeded = async (ids: string[]) => {
    const missingIds = ids.filter(
      (id) => !glossaryDetails[id] && !loadingDetails.has(id)
    );
    if (missingIds.length === 0) return;

    setLoadingDetails((prev) => new Set([...prev, ...missingIds]));

    try {
      const results = await Promise.all(
        missingIds.map((id) =>
          GlossaryService.getGlossaryById(id).catch(() => null)
        )
      );

      setGlossaryDetails((prev) => {
        const next = { ...prev };
        results.forEach((g, i) => {
          if (g) next[missingIds[i]] = g;
        });
        return next;
      });
    } finally {
      setLoadingDetails((prev) => {
        const next = new Set(prev);
        missingIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  // Effect to fetch details for selected glossaries
  useEffect(() => {
    if (selectedGlossaries.length > 0) {
      fetchDetailsIfNeeded(selectedGlossaries);
    }
  }, [selectedGlossaries]);

  // Combined terms logic
  const combinedTerms = useMemo(() => {
    if (selectedGlossaries.length === 0 && !viewingGlossaryId) return [];

    // If viewing a single unselected glossary
    if (selectedGlossaries.length === 0 && viewingGlossaryId) {
      const details = glossaryDetails[viewingGlossaryId];
      if (!details?.terms?.items) return [];
      return details.terms.items.map((t) => ({
        ...t,
        glossaryId: viewingGlossaryId,
        colorIndex: -1,
      }));
    }

    // If viewing selection
    return selectedGlossaries.flatMap((gid, index) => {
      const details = glossaryDetails[gid];
      if (!details?.terms?.items) return [];
      return details.terms.items.map((t) => ({
        ...t,
        glossaryId: gid,
        colorIndex: index,
      }));
    });
  }, [selectedGlossaries, viewingGlossaryId, glossaryDetails]);

  // viewingGlossaryData logic for title/header
  const headerData = viewingGlossaryId
    ? glossaries.find((g) => g.id === viewingGlossaryId)
    : selectedGlossaries.length === 1
    ? glossaries.find((g) => g.id === selectedGlossaries[0])
    : null;

  // Modal State
  const [isCreatingOpen, setIsCreatingOpen] = useState(false);
  const [editingGlossaryId, setEditingGlossaryId] = useState<string | null>(
    null
  );

  const handleToggleGlossary = async (id: string, checked: boolean) => {
    if (checked) {
      if (selectedGlossaries.length >= 5) return;

      setValidatingId(id);
      try {
        // 1. Ensure details are fetched for the new glossary
        let details = glossaryDetails[id];
        if (!details) {
          details = await GlossaryService.getGlossaryById(id);
          // Update cache immediately to avoid re-fetch
          setGlossaryDetails((prev) => ({ ...prev, [id]: details }));
        }

        // 2. Check for duplicates against ALREADY SELECTED glossaries
        const existingSources = new Set(
          combinedTerms.map((t) => t.source.toLowerCase().trim())
        );
        const newTerms = details.terms?.items || [];
        const duplicates = newTerms.filter((t) =>
          existingSources.has(t.source.toLowerCase().trim())
        );

        if (duplicates.length > 0) {
          // CONFLICT FOUND -> Prompt User
          setPendingSelectionId(id);
          setConflictData({
            count: duplicates.length,
            examples: duplicates.slice(0, 3).map((t) => t.source),
          });
        } else {
          // NO CONFLICT -> Select immediately
          setSelectedGlossaries([...selectedGlossaries, id]);
          setGlossaryOption("existing");
          setViewingGlossaryId(null);
        }
      } catch (error) {
        console.error("Failed to validate glossary", error);
        // Fallback: select anyway? or show error? Let's select to not block user.
        setSelectedGlossaries([...selectedGlossaries, id]);
        setGlossaryOption("existing");
        setViewingGlossaryId(null);
      } finally {
        setValidatingId(null);
      }
    } else {
      const newSelected = selectedGlossaries.filter((gId) => gId !== id);
      setSelectedGlossaries(newSelected);
      if (newSelected.length === 0) {
        setGlossaryOption("none");
        setViewingGlossaryId(null); // Clear view completely
      }
    }
  };

  const confirmSelection = () => {
    if (pendingSelectionId) {
      setSelectedGlossaries([...selectedGlossaries, pendingSelectionId]);
      setGlossaryOption("existing");
      setViewingGlossaryId(null);

      // Cleanup
      setPendingSelectionId(null);
      setConflictData(null);
    }
  };

  const cancelSelection = () => {
    setPendingSelectionId(null);
    setConflictData(null);
  };

  const handleCreateSuccess = (newGlossary: GlossaryDetailResponse) => {
    setIsCreatingOpen(false);
    onRefresh();
    if (selectedGlossaries.length < 5) {
      setSelectedGlossaries([...selectedGlossaries, newGlossary.id]);
      setGlossaryOption("existing");
      setViewingGlossaryId(null);
    }
  };

  const handleEditSuccess = (updatedGlossary: GlossaryDetailResponse) => {
    setEditingGlossaryId(null);
    onRefresh();
    // Invalidate cache for this glossary to refresh terms
    setGlossaryDetails((prev) => {
      const next = { ...prev };
      delete next[updatedGlossary.id];
      return next;
    });
    // Trigger fetch again if selected
    if (selectedGlossaries.includes(updatedGlossary.id)) {
      fetchDetailsIfNeeded([updatedGlossary.id]);
    }
  };

  // Filter combined terms
  const filteredCombinedTerms = combinedTerms.filter(
    (t) =>
      t.source.toLowerCase().includes(termQuery.toLowerCase()) ||
      t.target.toLowerCase().includes(termQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-7xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL - Glossary List */}
        <div className="lg:col-span-4">
          <Card className="h-[calc(100vh-280px)] flex flex-col">
            <CardHeader className="pb-0 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Select Glossary
                  <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {selectedGlossaries.length}/5
                  </span>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setIsCreatingOpen(true)}
                  className="h-8"
                >
                  <Plus className="mr-1.5 w-4 h-4" />
                  Create New
                </Button>
              </div>

              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search glossaries..."
                  className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-2 pt-0">
              <div className="pb-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Glossary List
                </h3>
              </div>

              {filteredGlossaries.map((glossary) => {
                const isSelected = selectedGlossaries.includes(glossary.id);
                const colorIndex = getGlossaryColorIndex(glossary.id);
                const isValidating = validatingId === glossary.id;

                return (
                  <TooltipProvider key={glossary.id}>
                    <Tooltip delayDuration={500}>
                      <TooltipTrigger asChild>
                        <div
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!isValidating)
                              setEditingGlossaryId(glossary.id);
                          }}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition flex items-center justify-between gap-3 relative overflow-hidden select-none group",
                            isSelected
                              ? cn(
                                  "border-transparent ring-1 ring-inset",
                                  SELECTION_BG_COLORS[colorIndex],
                                  "ring-" +
                                    SELECTION_COLORS[colorIndex].replace(
                                      "bg-",
                                      ""
                                    )
                                )
                              : "hover:bg-secondary/50",
                            isValidating && "opacity-70 pointer-events-none"
                          )}
                        >
                          {isSelected && (
                            <div
                              className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                SELECTION_COLORS[colorIndex]
                              )}
                            />
                          )}

                          <div className="flex-1 min-w-0 pl-1">
                            <p className="font-medium text-sm truncate flex items-center gap-2">
                              {glossary.name}
                              {isValidating && (
                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {getLanguageName(glossary.sourceLanguage)} →{" "}
                              {getLanguageName(glossary.targetLanguage)} •{" "}
                              {glossary.termCount} terms
                            </p>
                          </div>

                          {/* Inline Edit Button */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGlossaryId(glossary.id);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleToggleGlossary(
                                  glossary.id,
                                  checked as boolean
                                )
                              }
                              disabled={
                                (!isSelected &&
                                  selectedGlossaries.length >= 5) ||
                                isValidating
                              }
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "h-5 w-5 border-2",
                                isSelected
                                  ? cn(
                                      "border-transparent text-white",
                                      SELECTION_COLORS[colorIndex]
                                    )
                                  : "border-primary/50"
                              )}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Double-click to view details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}

              {filteredGlossaries.length === 0 && searchQuery && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No glossaries found
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL - Combined Detail View */}
        <div className="lg:col-span-8">
          <Card className="h-[calc(100vh-280px)] flex flex-col">
            {selectedGlossaries.length > 0 ? (
              <>
                <CardHeader className="pb-3 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                          Combined Term Preview
                        </div>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold">
                          {filteredCombinedTerms.length}
                        </span>{" "}
                        terms from{" "}
                        <span className="font-semibold">
                          {selectedGlossaries.length}
                        </span>{" "}
                        glossaries
                      </p>
                    </div>

                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={termQuery}
                        onChange={(e) => setTermQuery(e.target.value)}
                        placeholder="Search terms..."
                        className="h-8 w-full rounded-md border border-border bg-muted/20 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedGlossaries.map((gid, idx) => {
                      const g = glossaries.find((g) => g.id === gid);
                      return (
                        <div
                          key={gid}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1.5",
                            SELECTION_BG_COLORS[idx],
                            SELECTION_BORDER_COLORS[idx]
                          )}
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              SELECTION_COLORS[idx]
                            )}
                          />
                          <span className="font-medium truncate max-w-[100px]">
                            {g?.name || "Loading..."}
                          </span>
                          <button
                            onClick={() => handleToggleGlossary(gid, false)}
                            className="ml-1 opacity-50 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50/50">
                  {/* Table Header */}
                  <div className="grid grid-cols-[auto_1fr_24px_1fr] gap-4 px-6 py-2 bg-white border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <div className="w-1"></div>
                    <div>Source</div>
                    <div></div>
                    <div>Target</div>
                  </div>

                  {filteredCombinedTerms.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-50 mt-10">
                      <Book className="w-10 h-10 mb-2 stroke-1" />
                      <p className="text-sm">No terms to display</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredCombinedTerms.map((term, index) => {
                        const colorIndex =
                          term.colorIndex !== -1 ? term.colorIndex : 0;
                        const isCombined = selectedGlossaries.length > 0;

                        return (
                          <div
                            key={`${term.glossaryId}-${term.id}-${index}`}
                            className="grid grid-cols-[auto_1fr_24px_1fr] gap-4 px-6 py-3 items-center bg-white hover:bg-muted/30 transition-colors group"
                          >
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                isCombined
                                  ? SELECTION_COLORS[colorIndex]
                                  : "bg-primary/30"
                              )}
                            />
                            <div className="text-sm font-medium text-foreground">
                              {term.source}
                            </div>
                            <MoveRight className="w-3.5 h-3.5 text-muted-foreground/30" />
                            <div className="text-sm text-primary font-medium">
                              {term.target}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <Info className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No glossary selected
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Choose one or more glossaries from the list to view their
                      terms
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>

      {/* Create Modal */}
      <CreateGlossaryDialog
        open={isCreatingOpen}
        onOpenChange={setIsCreatingOpen}
        onSuccess={handleCreateSuccess}
        defaultSourceLanguage={sourceLanguage}
        defaultTargetLanguage={targetLanguage}
      />

      {/* Edit Modal - Only accessible via Detail Page now or specific action. Removed valid button for now in combined view */}
      <EditGlossaryDialog
        open={!!editingGlossaryId}
        onOpenChange={(open) => !open && setEditingGlossaryId(null)}
        glossaryId={editingGlossaryId}
        onSuccess={handleEditSuccess}
      />

      {/* Conflict Validation Dialog */}
      <AlertDialog
        open={!!pendingSelectionId}
        onOpenChange={(open) => !open && cancelSelection()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Duplicate Terms Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This glossary contains <strong>{conflictData?.count}</strong>{" "}
                terms that overlap with your current selection.
              </span>
              {conflictData?.examples && conflictData.examples.length > 0 && (
                <span className="block bg-muted/50 p-2 rounded text-xs font-mono text-muted-foreground">
                  Example: {conflictData.examples.join(", ")}...
                </span>
              )}
              <span className="block">
                If you proceed, these duplicate terms will override or be
                ignored based on priority (Last Selected wins).{" "}
                <strong>Do you want to include this glossary?</strong>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSelection}>
              Exclude
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelection}>
              Include Glossary
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
