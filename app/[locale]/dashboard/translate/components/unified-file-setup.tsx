import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  MoveRight,
  Edit2,
  Book,
  Eye,
  ArrowRightLeft,
  Loader2,
  Check,
  Globe,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GlossaryResponse } from "@/lib/types";
import { GlossaryService } from "@/api/services";
import { CreateGlossaryDialog } from "@/components/glossary/create-glossary-dialog";
import { EditGlossaryDialog } from "@/components/glossary/edit-glossary-dialog";
import { GlossaryPreviewDialog } from "@/components/glossary/glossary-preview-dialog";
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
import { useTranslations } from 'next-intl';
import { getErrorMessage } from "@/lib/error-utils";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { FileConfigState } from "../types";

interface UnifiedFileSetupProps {
  editingFile: FileConfigState;
  onUpdateFile: (updates: Partial<FileConfigState>) => void;
  glossaries: GlossaryResponse[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  termQuery: string;
  setTermQuery: (query: string) => void;
  isCreatingOpen: boolean;
  onCreatingOpenChange: (open: boolean) => void;
  onRefreshGlossaries: () => void;
}

export function UnifiedFileSetup({
  editingFile,
  onUpdateFile,
  glossaries,
  searchQuery,
  setSearchQuery,
  termQuery,
  setTermQuery,
  isCreatingOpen,
  onCreatingOpenChange,
  onRefreshGlossaries,
}: UnifiedFileSetupProps) {
  const trmlCommon = useTranslations("Common");
  const trmlDocumentSetup = useTranslations("DocumentSetup");
  const trmlGlossarySelection = useTranslations("GlossarySelection");
  const { toast } = useToast();

  const isImage = useMemo(() => {
    return editingFile.metadata.type?.includes("image") ||
      /\.(jpg|jpeg|png|gif|bmp|webp|heic|heif|tiff|tif)$/i.test(editingFile.metadata.name);
  }, [editingFile.metadata.type, editingFile.metadata.name]);


  // Local state for dialogs and preview drawer
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const [viewingGlossaryId, setViewingGlossaryId] = useState<string | null>(null);
  const [glossaryDetails, setGlossaryDetails] = useState<Record<string, GlossaryResponse>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  // Conflict handling state
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<{
    count: number;
    examples: string[];
  } | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingGlossaryId, setEditingGlossaryId] = useState<string | null>(null);
  
  const [isRecommending, setIsRecommending] = useState(false);
  const [suggestedTerms, setSuggestedTerms] = useState<{source: string, target: string}[]>([]);

  // Local search input state (committed on Enter or button click)
  const [localSearchInput, setLocalSearchInput] = useState(searchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination state
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [pagedGlossaries, setPagedGlossaries] = useState<GlossaryResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPagedGlossaries, setLoadingPagedGlossaries] = useState(false);

  // Fetch paginated glossaries from the backend API
  const fetchPagedGlossaries = async (page: number, search: string) => {
    setLoadingPagedGlossaries(true);
    try {
      const response = await GlossaryService.getGlossaries({
        page,
        size: ITEMS_PER_PAGE,
        search: search || undefined,
      });
      setPagedGlossaries(response.items || []);
      setTotalItems(response.total || 0);
      setTotalPages(response.pages || 1);
    } catch (error) {
      console.error("Failed to fetch paged glossaries", error);
    } finally {
      setLoadingPagedGlossaries(false);
    }
  };

  const prevSearchQueryRef = useRef(searchQuery);

  useEffect(() => {
    const isSearchChanged = prevSearchQueryRef.current !== searchQuery;
    prevSearchQueryRef.current = searchQuery;

    if (isSearchChanged && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    fetchPagedGlossaries(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const handleCommitSearch = () => {
    setSearchQuery(localSearchInput);
  };

  const selectedGlossariesList = useMemo(() => {
    return editingFile.selectedGlossaries.map((id) => {
      // Find in local loaded pagedGlossaries first
      const foundInPaged = pagedGlossaries.find((g) => g.id === id);
      if (foundInPaged) return foundInPaged;

      // Find in parent list
      const foundInParent = glossaries.find((g) => g.id === id);
      if (foundInParent) return foundInParent;

      // Find in fetched details
      const foundInDetails = glossaryDetails[id];
      if (foundInDetails) return foundInDetails;

      // Fallback placeholder
      return {
        id,
        name: "Loading...",
        description: "",
        sourceLanguage: "",
        targetLanguage: "",
        termCount: 0,
        createdAt: "",
        updatedAt: "",
      } as GlossaryResponse;
    });
  }, [editingFile.selectedGlossaries, pagedGlossaries, glossaries, glossaryDetails]);

  // Helper: Fetch all terms recursively
  const fetchFullGlossary = async (id: string): Promise<GlossaryResponse | null> => {
    try {
      const firstPage = await GlossaryService.getGlossaryById(id, { size: 100, page: 1 });
      if (!firstPage.terms || firstPage.terms.pages <= 1) {
        return firstPage;
      }

      const totalPages = firstPage.terms.pages;
      const pagePromises = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(GlossaryService.getGlossaryById(id, { size: 100, page: p }));
      }

      const restPages = await Promise.all(pagePromises);
      const allTerms = [
        ...(firstPage.terms.items || []),
        ...restPages.flatMap((p) => p.terms?.items || []),
      ];

      return {
        ...firstPage,
        terms: {
          ...firstPage.terms,
          items: allTerms,
          size: allTerms.length,
        }
      };
    } catch (e) {
      console.error(`Failed to fetch full glossary ${id}`, e);
      setErrorDialog({
        open: true,
        message: getErrorMessage(e),
      });
      return null;
    }
  };

  // Fetch glossary details when selected or previewed
  const fetchDetailsIfNeeded = async (ids: string[]) => {
    const missingIds = ids.filter(
      (id) => !glossaryDetails[id] && !loadingDetails.has(id)
    );
    if (missingIds.length === 0) return;

    setLoadingDetails((prev) => new Set([...prev, ...missingIds]));

    try {
      const results = await Promise.all(
        missingIds.map((id) => fetchFullGlossary(id))
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

  useEffect(() => {
    const idsToFetch = [...editingFile.selectedGlossaries];
    if (viewingGlossaryId) {
      idsToFetch.push(viewingGlossaryId);
    }
    if (idsToFetch.length > 0) {
      fetchDetailsIfNeeded(idsToFetch);
    }
  }, [editingFile.selectedGlossaries, viewingGlossaryId]);

  // Combined terms logic for conflict checking
  const combinedTerms = useMemo(() => {
    if (editingFile.selectedGlossaries.length === 0 && !viewingGlossaryId) return [];

    if (editingFile.selectedGlossaries.length === 0 && viewingGlossaryId) {
      const details = glossaryDetails[viewingGlossaryId];
      if (!details?.terms?.items) return [];
      return details.terms.items.map((t) => ({
        ...t,
        glossaryId: viewingGlossaryId,
      }));
    }

    return editingFile.selectedGlossaries.flatMap((gid) => {
      const details = glossaryDetails[gid];
      if (!details?.terms?.items) return [];
      return details.terms.items.map((t) => ({
        ...t,
        glossaryId: gid,
      }));
    });
  }, [editingFile.selectedGlossaries, viewingGlossaryId, glossaryDetails]);

  // Terms filtered for the preview drawer
  const filteredTerms = useMemo(() => {
    if (!viewingGlossaryId) return [];
    const details = glossaryDetails[viewingGlossaryId];
    const items = details?.terms?.items || [];
    return items.filter(
      (t) =>
        t.source.toLowerCase().includes(termQuery.toLowerCase()) ||
        t.target.toLowerCase().includes(termQuery.toLowerCase())
    );
  }, [viewingGlossaryId, glossaryDetails, termQuery]);

  // Viewing glossary metadata for preview title
  const headerData = useMemo(() => {
    return viewingGlossaryId
      ? glossaries.find((g) => g.id === viewingGlossaryId)
      : editingFile.selectedGlossaries.length === 1
        ? glossaries.find((g) => g.id === editingFile.selectedGlossaries[0])
        : null;
  }, [viewingGlossaryId, glossaries, editingFile.selectedGlossaries]);

  // Toggle selection of a glossary
  const handleToggleGlossary = async (id: string, checked: boolean) => {
    if (checked) {
      setValidatingId(id);
      try {
        let details = glossaryDetails[id];
        if (!details) {
          const fullGlossary = await fetchFullGlossary(id);
          if (!fullGlossary) {
            throw new Error("Failed to fetch glossary details");
          }
          details = fullGlossary;
          setGlossaryDetails((prev) => ({ ...prev, [id]: details }));
        }

        const existingSources = new Set(
          combinedTerms.map((t) => t.source.toLowerCase().trim())
        );
        const newTerms = details.terms?.items || [];
        const duplicates = newTerms.filter((t) =>
          existingSources.has(t.source.toLowerCase().trim())
        );

        if (duplicates.length > 0) {
          setPendingSelectionId(id);
          setConflictData({
            count: duplicates.length,
            examples: duplicates.slice(0, 3).map((t) => t.source),
          });
        } else {
          onUpdateFile({
            selectedGlossaries: [...editingFile.selectedGlossaries, id],
            glossaryOption: "existing"
          });
          setViewingGlossaryId(null);
        }
      } catch (error) {
        console.error("Failed to validate glossary", error);
        setErrorDialog({
          open: true,
          message: getErrorMessage(error),
        });
      } finally {
        setValidatingId(null);
      }
    } else {
      const newSelected = editingFile.selectedGlossaries.filter((gId) => gId !== id);
      onUpdateFile({
        selectedGlossaries: newSelected,
        glossaryOption: newSelected.length === 0 ? "none" : "existing"
      });
      setViewingGlossaryId(null);
    }
  };

  const confirmSelection = () => {
    if (pendingSelectionId) {
      onUpdateFile({
        selectedGlossaries: [...editingFile.selectedGlossaries, pendingSelectionId],
        glossaryOption: "existing"
      });
      setViewingGlossaryId(null);
      setPendingSelectionId(null);
      setConflictData(null);
    }
  };

  const cancelSelection = () => {
    setPendingSelectionId(null);
    setConflictData(null);
  };

  const handleCreateSuccess = (newGlossary?: GlossaryResponse) => {
    onRefreshGlossaries();
    fetchPagedGlossaries(currentPage, searchQuery);
    setSuggestedTerms([]);
    
    if (newGlossary && newGlossary.id) {
      onUpdateFile({
        selectedGlossaries: [...editingFile.selectedGlossaries, newGlossary.id],
        glossaryOption: "existing"
      });
    }
  };

  const handleEditSuccess = () => {
    onRefreshGlossaries();
    fetchPagedGlossaries(currentPage, searchQuery);
  };

  const handleRecommendGlossary = async () => {
    setIsRecommending(true);
    try {
      const response = await GlossaryService.recommendGlossary(editingFile.documentId);
      if (response.terms && response.terms.length > 0) {
        setSuggestedTerms(response.terms);
        onCreatingOpenChange(true);
      } else {
        toast({
          title: "No suggestions",
          description: "No terms were suggested for this document.",
        });
      }
    } catch (error) {
      console.error("Failed to recommend glossary", error);
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setIsRecommending(false);
    }
  };

  return (
    <motion.div
      key="unified-setup"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col"
    >
      {/* Setup Content */}
      <div className="flex-1 space-y-4">

        {/* CARD 1: TRANSLATION OPTIONS (Languages + Image toggle side by side) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm">{trmlDocumentSetup("translationOptions")}</h3>
          </div>

          <div className="flex items-stretch gap-4">
            {/* Language selectors */}
            <div id="tour-language-options" className="flex-1 bg-background rounded-lg border border-border p-3 flex flex-col justify-center">
              <div className="flex items-center gap-3">
                {/* Source language */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{trmlCommon("sourceLanguage")}</Label>
                  <Select
                    value={editingFile.sourceLanguage}
                    onValueChange={(val) => onUpdateFile({ sourceLanguage: val })}
                  >
                    <SelectTrigger className="h-9 bg-card text-sm" aria-label="Source Language">
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {trmlCommon(lang.code) ?? lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Swap Button */}
                <div className="pt-5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-secondary/30 border shadow-sm hover:bg-secondary transition-colors"
                    aria-label={trmlCommon("swapLanguages") || "Swap languages"}
                    onClick={() => {
                      if (!editingFile.sourceLanguage || !editingFile.targetLanguage) return;
                      onUpdateFile({
                        sourceLanguage: editingFile.targetLanguage,
                        targetLanguage: editingFile.sourceLanguage,
                      });
                    }}
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </Button>
                </div>

                {/* Target language */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">{trmlCommon("targetLanguage")}</Label>
                  <Select
                    value={editingFile.targetLanguage}
                    onValueChange={(val) => onUpdateFile({ targetLanguage: val })}
                  >
                    <SelectTrigger className="h-9 bg-card text-sm" aria-label="Target Language">
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.filter(
                        (l) => l.code !== editingFile.sourceLanguage
                      ).map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {trmlCommon(lang.code) ?? lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Translate Images toggle */}
            {!isImage && (
              <div id="tour-translate-images" className="shrink-0 flex items-center justify-between gap-3 bg-background rounded-lg border border-border p-3 w-[240px]">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
                    <Label
                      htmlFor="translate-images"
                      className="text-xs font-semibold leading-none cursor-pointer"
                    >
                      {trmlDocumentSetup("translateImages")}
                    </Label>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight whitespace-normal break-words">
                    {trmlDocumentSetup("translateImagesDescription")}
                  </p>
                </div>
                <Switch
                  id="translate-images"
                  checked={editingFile.translateImages}
                  onCheckedChange={(checked) => onUpdateFile({ translateImages: checked })}
                  className="shrink-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: SELECT GLOSSARY */}
        <div id="tour-glossary-section" className="space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Book className="w-4 h-4 text-primary" />
            <h3 className="text-sm">{trmlGlossarySelection("selectGlossary")}</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Left Column: Selected Glossaries */}
            <div className="space-y-3 bg-card rounded-xl border border-border/80 p-4 flex flex-col h-full min-h-[380px] shadow-sm">
              <div className="h-7 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    {trmlCommon("selected")} ({selectedGlossariesList.length})
                  </span>
                </div>
                {selectedGlossariesList.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => {
                      onUpdateFile({
                        selectedGlossaries: [],
                        glossaryOption: "none",
                      });
                    }}
                  >
                    {trmlDocumentSetup("clearAll")}
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[365px] pr-1 space-y-2 flex flex-col">
                {selectedGlossariesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-2.5 p-4">
                    <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
                      <Book className="w-6 h-6 text-primary/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {trmlDocumentSetup("noGlossarySelected")}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-[300px] mx-auto mt-1 leading-normal mb-4">
                        {trmlDocumentSetup("noGlossarySelectedDetail")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="shimmer-button border-primary/50 text-primary hover:bg-primary/5 shadow-sm"
                      onClick={handleRecommendGlossary}
                      disabled={isRecommending}
                    >
                      {isRecommending ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          {trmlDocumentSetup("generating")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {trmlDocumentSetup("recommendGlossary")}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    {selectedGlossariesList.map((glossary) => {
                      const isPlaceholder = glossary.name === "Loading...";
                      const displayTermCount = glossaryDetails[glossary.id]?.termCount ?? glossary.termCount;
                      return (
                        <div
                          key={glossary.id}
                          className="px-3.5 py-2.5 rounded-xl border border-primary/50 bg-secondary/50 hover:bg-primary/5/30 transition flex items-center justify-between gap-3 relative group"
                        >
                          <div className="flex-1 min-w-0 pl-1">
                            <p className="font-semibold text-xs text-foreground truncate">
                              {glossary.name}
                            </p>
                            {!isPlaceholder && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {trmlCommon(glossary.sourceLanguage)} →{" "}
                                {trmlCommon(glossary.targetLanguage)} •{" "}
                                {trmlDocumentSetup("termsCount", { count: displayTermCount })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Preview Button */}
                            {!isPlaceholder && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingGlossaryId(glossary.id);
                                  setPreviewDialogOpen(true);
                                }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleGlossary(glossary.id, false);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 rotate-45" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex flex-col items-center justify-center text-center p-4 flex-1">
                      <Button
                        variant="outline"
                        className="shimmer-button border-primary/50 text-primary hover:bg-primary/5 shadow-sm"
                        onClick={handleRecommendGlossary}
                        disabled={isRecommending}
                      >
                        {isRecommending ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                            {trmlDocumentSetup("generating")}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {trmlDocumentSetup("recommendGlossary")}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Select Glossary (Search, List, Pagination) */}
            <div className="space-y-3 bg-background rounded-xl border border-border/80 p-4 flex flex-col justify-between shadow-sm">
              <div className="space-y-3 flex-1">
                {/* Search row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      name="glossary-search"
                      autoComplete="off"
                      value={localSearchInput}
                      onChange={(e) => setLocalSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitSearch();
                      }}
                      placeholder={trmlGlossarySelection("searchGlossary")}
                      className="h-9 w-full rounded-md border border-border bg-background pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={handleCommitSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Search glossaries"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={() => onCreatingOpenChange(true)}
                    className="h-9 shrink-0 gap-1.5 text-sm"
                    data-tour="create-glossary-btn"
                  >
                    <Plus className="w-4 h-4" />
                    {trmlGlossarySelection("newGlossary")}
                  </Button>
                </div>

                {/* Glossary list — 5 per page, no scroll */}
                <div className="space-y-2">
                  {loadingPagedGlossaries ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 border border-dashed rounded-xl bg-secondary/5">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Loading glossaries...</p>
                    </div>
                  ) : pagedGlossaries.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 border border-dashed rounded-xl bg-secondary/5">
                      <Book className="w-8 h-8 text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {searchQuery
                            ? trmlGlossarySelection("noGlossaryFound")
                            : trmlGlossarySelection("noGlossariesCreatedTitle")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {!searchQuery && trmlGlossarySelection("noGlossariesCreatedDescription")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {pagedGlossaries.map((glossary) => {
                        const isSelected = editingFile.selectedGlossaries.includes(glossary.id);
                        const isValidating = validatingId === glossary.id;
                        const displayTermCount = glossaryDetails[glossary.id]?.termCount ?? glossary.termCount;

                        return (
                          <TooltipProvider key={glossary.id}>
                            <Tooltip delayDuration={500}>
                              <TooltipTrigger asChild>
                                <div
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    if (!isValidating) {
                                      setViewingGlossaryId(glossary.id);
                                      setPreviewDialogOpen(true);
                                    }
                                  }}
                                  className={cn(
                                    "px-4 py-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-4 relative select-none group",
                                    isSelected
                                      ? "bg-primary/5 border-primary/50"
                                      : "bg-card border-primary/20 hover:border-primary/45 hover:bg-slate-50/50",
                                    isValidating && "opacity-70 pointer-events-none"
                                  )}
                                >
                                  <div className="flex-1 min-w-0 pl-1">
                                    <p className="font-semibold text-xs truncate flex items-center gap-1.5">
                                      {glossary.name}
                                      {isValidating && (
                                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                      )}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {trmlCommon(glossary.sourceLanguage)} →{" "}
                                      {trmlCommon(glossary.targetLanguage)} •{" "}
                                      {trmlDocumentSetup("termsCount", { count: displayTermCount })}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {/* Preview Button */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingGlossaryId(glossary.id);
                                        setPreviewDialogOpen(true);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>

                                    {/* Edit Button */}
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

                                    {/* Selection Checkbox */}
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleToggleGlossary(glossary.id, checked as boolean)
                                      }
                                      disabled={isValidating}
                                      onClick={(e) => e.stopPropagation()}
                                      className={cn(
                                        "h-5 w-5 border-2 rounded",
                                        isSelected
                                          ? "border-transparent bg-primary text-primary-foreground"
                                          : "border-primary/50"
                                      )}
                                    />
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>{trmlGlossarySelection("termTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalItems > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between pt-2 border-t mt-3">
                  <span className="text-xs text-muted-foreground">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage === 1 || loadingPagedGlossaries}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-medium min-w-[48px] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage === totalPages || loadingPagedGlossaries}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* DIALOGS & SHEET PREVIEWS */}
      <CreateGlossaryDialog
        open={isCreatingOpen}
        onOpenChange={(open) => {
          onCreatingOpenChange(open);
          if (!open) setSuggestedTerms([]);
        }}
        onSuccess={handleCreateSuccess}
        defaultSourceLanguage={editingFile.sourceLanguage}
        defaultTargetLanguage={editingFile.targetLanguage}
        initialTerms={suggestedTerms}
      />

      <EditGlossaryDialog
        open={!!editingGlossaryId}
        onOpenChange={(open) => !open && setEditingGlossaryId(null)}
        glossaryId={editingGlossaryId}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog
        open={!!pendingSelectionId}
        onOpenChange={(open) => !open && cancelSelection()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {trmlGlossarySelection("duplicatedTerms")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block text-sm">
                {trmlGlossarySelection.rich('duplicatedTermsMessage', {
                  count: conflictData?.count || 0,
                  bold: (chunks) => <strong>{chunks}</strong>
                })}
              </span>
              {conflictData?.examples && conflictData.examples.length > 0 && (
                <span className="block bg-muted/65 p-2 rounded text-xs font-mono text-muted-foreground">
                  {trmlGlossarySelection("duplicatedTermsExample")}: {conflictData.examples.join(", ")}…
                </span>
              )}
              <span className="block text-sm">
                {trmlGlossarySelection.rich('duplicatedTermsInstruction', {
                  bold: (chunks) => <strong>{chunks}</strong>
                })}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSelection}>
              {trmlGlossarySelection("duplicatedTermsExclude")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelection}>
              {trmlGlossarySelection("duplicatedTermsInclude")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
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

      <GlossaryPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        glossaryId={viewingGlossaryId}
      />
    </motion.div>
  );
}
