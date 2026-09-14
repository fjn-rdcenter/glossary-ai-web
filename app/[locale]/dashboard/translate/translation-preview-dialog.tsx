"use client";

import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FileImage,
  FileText,
  Filter,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { API_CONFIG, apiClient, DocumentService, TranslationService, USE_LEGACY_EXTRACTION_MEDIA } from "@/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileViewerPreview } from "@/components/ui/file-viewer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { TranslationTableResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

type ApplyFilter = "all" | "applied" | "notApplied";
type ContentFilter = "all" | "text" | "image";
type DocumentTab = "translated" | "source";

type PreviewCopy = {
  all: string;
  applied: string;
  appliedCount: string;
  applyAll: string;
  applyStatus: string;
  applyToFile: string;
  close: string;
  contentType: string;
  discard: string;
  filter: string;
  imageContent: string;
  itemsPerPage: string;
  noTableResults: string;
  notApplied: string;
  nextPage: string;
  page: string;
  preview: string;
  previewError: string;
  previewLoading: string;
  previousPage: string;
  regenerate: string;
  regenerating: string;
  searchTranslations: string;
  showingPerPage: string;
  source: string;
  sourceFile: string;
  target: string;
  textContent: string;
  translatedFile: string;
};

type TranslationPreviewDialogProps = {
  copy: PreviewCopy;
  fileName: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  translationId: string | null;
};

type EditableTable = TranslationTableResponse & {
  applyToFile: boolean;
  editedTarget: string;
  rowNumber: number;
};

function getLegacyExtractionImageUrl(path: string, userId: string) {
  const extractionPath = path.replace(/^\/+/, "");
  return `http://localhost:18888/extraction/${encodeURIComponent(userId)}/${extractionPath}`;
}

function getImageName(path: string) {
  const imageName = path.replace(/^\/+/, "").split("/").pop() || "image";
  try {
    return decodeURIComponent(imageName);
  } catch {
    return imageName;
  }
}

function findTextRange(root: HTMLElement, needle: string): Range | null {
  const normalizedNeedle = needle.replace(/\s+/g, " ").trim().toLocaleLowerCase();
  if (!normalizedNeedle) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const characters: Array<{node: Text; offset: number}> = [];
  let normalizedText = "";
  let previousWhitespace = false;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    for (let offset = 0; offset < textNode.data.length; offset += 1) {
      const character = textNode.data[offset];
      const isWhitespace = /\s/.test(character);
      if (isWhitespace) {
        if (!normalizedText || previousWhitespace) continue;
        normalizedText += " ";
        characters.push({node: textNode, offset});
        previousWhitespace = true;
        continue;
      }

      normalizedText += character;
      characters.push({node: textNode, offset});
      previousWhitespace = false;
    }
  }

  const matchStart = normalizedText.toLocaleLowerCase().indexOf(normalizedNeedle);
  if (matchStart < 0 || !characters[matchStart] || !characters[matchStart + normalizedNeedle.length - 1]) return null;

  const start = characters[matchStart];
  const end = characters[matchStart + normalizedNeedle.length - 1];
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset + 1);
  return range;
}

function TranslationPreviewSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 overflow-hidden p-3 lg:grid-cols-2 lg:grid-rows-1 lg:gap-4 lg:p-4 lg:pr-0">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-border/70 bg-card p-3 shadow-[0_2px_12px_rgba(33,23,92,0.05)]">
        <div className="flex shrink-0 gap-3 pb-3">
          <Skeleton className="h-10 min-w-0 flex-1 rounded-lg" />
          <Skeleton className="size-10 shrink-0 rounded-lg" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-1.5 pr-1.5">
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/70">
            <div className="grid h-12 grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_116px] gap-3 border-b bg-accent/60 px-3 py-3">
              <Skeleton className="h-3 w-5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="mx-auto h-3 w-16" />
            </div>
            {Array.from({ length: 8 }, (_, index) => (
              <div className="grid min-h-[52px] grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_116px] items-center gap-3 border-b border-border/50 px-3" key={index}>
                <Skeleton className="mx-auto h-3 w-4" />
                <Skeleton className="h-3 w-[75%]" />
                <Skeleton className="h-3 w-[68%]" />
                <Skeleton className="mx-auto size-4 rounded-[4px]" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </section>
      <section className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-border/70 bg-card shadow-[0_2px_12px_rgba(33,23,92,0.05)]">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-3">
          <Skeleton className="h-9 w-[124px] rounded-lg" />
          <Skeleton className="h-9 w-[124px] rounded-lg" />
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/70 p-6">
          <Skeleton className="h-[78%] w-[72%] rounded-lg" />
        </div>
      </section>
    </div>
  );
}

export function TranslationPreviewDialog({
  copy,
  fileName,
  onOpenChange,
  open,
  sourceLanguage,
  targetLanguage,
  translationId,
}: TranslationPreviewDialogProps) {
  const [activeDocument, setActiveDocument] = useState<DocumentTab>("translated");
  const [applyFilter, setApplyFilter] = useState<ApplyFilter>("all");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [userId, setUserId] = useState("");
  const [tables, setTables] = useState<EditableTable[]>([]);
  const [targetBlob, setTargetBlob] = useState<Blob | null>(null);
  const [targetFileName, setTargetFileName] = useState("");
  const [imagePreview, setImagePreview] = useState<{alt: string; src: string} | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const viewerSectionRef = useRef<HTMLElement | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());

  useEffect(() => {
    if (!open || !translationId) return;

    let isMounted = true;

    const loadPreview = async () => {
      setIsLoading(true);
      setError("");
      setActiveDocument("translated");
      setApplyFilter("all");
      setContentFilter("all");
      setPage(1);
      setPageSize(10);
      setSearch("");
      setEditingTableId(null);
      setSelectedTableId(null);
      setUserId("");
      setSourceBlob(null);
      setTargetBlob(null);
      setSourceFileName("");
      setTargetFileName("");
      setImagePreview(null);
      setImageUrls({});

      try {
        const [firstPage, job] = await Promise.all([
          TranslationService.getTranslationTables(translationId),
          TranslationService.getTranslationStatus(translationId),
        ]);
        if (!job.targetDocument) throw new Error("Translated document is unavailable");

        const [remainingPages, sourceDocument, targetDocument] = await Promise.all([
          Promise.all(
            Array.from({ length: Math.max(0, firstPage.pages - 1) }, (_, index) =>
              TranslationService.getTranslationTables(translationId, index + 2),
            ),
          ),
          DocumentService.downloadDocument(job.sourceDocument),
          DocumentService.downloadDocument(job.targetDocument),
        ]);

        if (!isMounted) return;

        let storedUserId = "";
        try {
          const storedUser = localStorage.getItem("glossaryai_user_info");
          storedUserId = storedUser ? (JSON.parse(storedUser) as { id?: string }).id ?? "" : "";
        } catch {
          storedUserId = "";
        }

        const editableTables = [firstPage, ...remainingPages]
          .flatMap((responsePage) => responsePage.items)
          .map((table, index) => ({
            ...table,
            applyToFile: !table.isSkipped,
            editedTarget: table.feedback ?? table.target ?? "",
            rowNumber: index + 1,
          }));

        setTables(editableTables);
        setSelectedTableId(editableTables[0]?.id ?? null);
        setSourceBlob(sourceDocument);
        setSourceFileName(job.sourceDocumentName || fileName);
        setTargetBlob(targetDocument);
        setTargetFileName(job.targetDocumentName || fileName);
        setUserId(storedUserId);
      } catch (loadError) {
        console.error("Failed to load translation preview", loadError);
        if (isMounted) setError(copy.previewError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [copy.previewError, fileName, open, translationId]);

  useEffect(() => {
    if (USE_LEGACY_EXTRACTION_MEDIA || !userId) {
      setImageUrls({});
      return;
    }

    const paths = Array.from(new Set(
      tables
        .filter((table) => table.path.startsWith("/images"))
        .flatMap((table) => [table.source || table.path, table.editedTarget || table.target || table.path]),
    ));
    let isMounted = true;
    let createdUrls: string[] = [];

    const loadMedia = async () => {
      const entries = await Promise.all(paths.map(async (path) => {
        try {
          const response = await apiClient.get(
            API_CONFIG.ENDPOINTS.MEDIA.GET(path.replace(/^\/+/, "")),
            { responseType: "blob" },
          );
          const url = URL.createObjectURL(response.data);
          createdUrls.push(url);
          return [path, url] as const;
        } catch (mediaError) {
          console.error("Failed to load preview media", mediaError);
          return null;
        }
      }));

      if (!isMounted) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setImageUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
    };

    void loadMedia();

    return () => {
      isMounted = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [tables, userId]);

  const filteredTables = tables.filter((table) => {
    const matchesSearch = !deferredSearch ||
      (table.source ?? "").toLocaleLowerCase().includes(deferredSearch) ||
      table.editedTarget.toLocaleLowerCase().includes(deferredSearch);
    const matchesApply = applyFilter === "all" ||
      (applyFilter === "applied" ? table.applyToFile : !table.applyToFile);
    const isImage = table.path.startsWith("/images");
    const matchesContent = contentFilter === "all" ||
      (contentFilter === "image" ? isImage : !isImage);

    return matchesSearch && matchesApply && matchesContent;
  });
  const totalPages = Math.max(1, Math.ceil(filteredTables.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTables = filteredTables.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const appliedCount = tables.filter((table) => table.applyToFile).length;
  const hasActiveFilters = applyFilter !== "all" || contentFilter !== "all";

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, applyFilter, contentFilter]);

  useEffect(() => {
    if (!open) setIsFullscreen(false);
  }, [open]);

  const saveAndRegenerate = async () => {
    if (!translationId) return;

    const changedTables = tables.filter(
      (table) =>
        table.editedTarget !== (table.feedback ?? table.target ?? "") ||
        table.applyToFile === table.isSkipped,
    );
    if (changedTables.length === 0) return;

    setIsSaving(true);
    setError("");

    try {
      await TranslationService.updateTranslationTables(translationId, {
        items: changedTables.map((table) => ({
          id: table.id,
          feedback: table.editedTarget || null,
          isSkipped: !table.applyToFile,
        })),
      });
      const generated = await TranslationService.generateTranslation(translationId);
      const document = await DocumentService.downloadDocument(generated.targetDocument);

      setTables((currentTables) =>
        currentTables.map((table) => ({
          ...table,
          feedback: table.editedTarget || null,
          isSkipped: !table.applyToFile,
        })),
      );
      setTargetBlob(document);
      setActiveDocument("translated");
    } catch (saveError) {
      console.error("Failed to regenerate translation preview", saveError);
      setError(copy.previewError);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = tables.some(
    (table) =>
      table.editedTarget !== (table.feedback ?? table.target ?? "") ||
      table.applyToFile === table.isSkipped,
  );
  const activeBlob = activeDocument === "translated" ? targetBlob : sourceBlob;
  const activeFileName = activeDocument === "translated" ? targetFileName : sourceFileName;
  const getImageUrl = (path: string) => USE_LEGACY_EXTRACTION_MEDIA
    ? getLegacyExtractionImageUrl(path, userId)
    : imageUrls[path] ?? "";

  useEffect(() => {
    const selectedTable = tables.find((table) => table.id === selectedTableId);
    const searchText = activeDocument === "source"
      ? selectedTable?.source
      : selectedTable?.editedTarget || selectedTable?.target;
    const root = viewerSectionRef.current;
    if (!root || !searchText?.trim() || !activeBlob) return;

    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isActive = true;

    const clearHighlight = () => {
      if (typeof CSS !== "undefined" && "highlights" in CSS) {
        CSS.highlights.delete("translation-preview-match");
      }
    };
    const locateMatch = () => {
      if (!isActive) return;
      const range = findTextRange(root, searchText);
      if (range) {
        if (typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined") {
          CSS.highlights.set("translation-preview-match", new Highlight(range));
        }
        range.startContainer.parentElement?.scrollIntoView({behavior: "smooth", block: "center"});
        return;
      }
      attempts += 1;
      if (attempts < 12) timeoutId = setTimeout(locateMatch, 100);
    };

    clearHighlight();
    locateMatch();

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearHighlight();
    };
  }, [activeBlob, activeDocument, selectedTableId, tables]);
  const formatLanguageCode = (code: string) => {
    const normalizedCode = code.toLowerCase() === "vn" || code.toLowerCase() === "vi" ? "VI" :
      code.toLowerCase() === "jp" || code.toLowerCase() === "ja" ? "JA" : code.toUpperCase();
    return normalizedCode;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <style>{`::highlight(translation-preview-match){background-color:color-mix(in oklab,var(--primary) 30%,transparent);text-decoration:underline;text-decoration-color:var(--primary);}`}</style>
        <DialogContent
          className={cn(
            "h-[min(94dvh,960px)] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-xl border-white/80 bg-surface-container-low p-0 shadow-[0_28px_80px_rgba(33,23,92,0.24)] sm:max-w-[1580px]",
            isFullscreen && "top-0 left-0 h-dvh w-dvw max-w-none translate-x-0 translate-y-0 rounded-none sm:max-w-none",
          )}
          showCloseButton={false}
        >
          <DialogHeader className="w-[calc(100%+1rem)] border-b border-border/60 bg-card px-6 py-[18px] pr-16">
            <DialogTitle className="truncate text-[18px] font-bold tracking-[-0.01em] text-primary">
              {copy.preview}: {fileName}
            </DialogTitle>
            <DialogDescription className="sr-only">{copy.preview}</DialogDescription>
          </DialogHeader>
          {!isSaving ? (
            <>
              <Button
                aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
                className="absolute top-[14px] right-16 grid size-9 place-items-center rounded-lg text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => setIsFullscreen((current) => !current)}
                size="icon"
                variant="ghost"
              >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </Button>
              <DialogClose
                aria-label={copy.close}
                className="absolute top-[14px] right-5 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-4" />
              </DialogClose>
            </>
          ) : null}

          {isLoading ? (
            <TranslationPreviewSkeleton />
          ) : error && tables.length === 0 ? (
            <div className="grid flex-1 place-items-center px-6 text-center text-sm text-destructive">{error}</div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 overflow-hidden p-3 lg:grid-cols-2 lg:grid-rows-1 lg:gap-4 lg:p-4 lg:pr-0">
              <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-border/70 bg-card p-3 shadow-[0_2px_12px_rgba(33,23,92,0.05)]">
                <div className="flex shrink-0 gap-3 pb-3">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[17px] -translate-y-1/2 text-primary/60" />
                    <Input
                      aria-label={copy.searchTranslations}
                      className="h-10 rounded-lg border-border/70 bg-card pl-10 text-[13px] shadow-[0_1px_2px_rgba(33,23,92,0.02)] placeholder:text-muted-foreground/80 hover:border-ring/60"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={copy.searchTranslations}
                      value={search}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={copy.filter}
                        className={cn(
                          "relative size-10 rounded-lg border-border/70 bg-card text-primary shadow-none hover:border-ring/60 hover:bg-accent",
                          hasActiveFilters && "border-ring bg-accent text-primary",
                        )}
                        size="icon"
                        variant="outline"
                      >
                        <Filter className="size-4" />
                        {hasActiveFilters ? <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-secondary" /> : null}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>{copy.applyStatus}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={applyFilter} onValueChange={(value) => setApplyFilter(value as ApplyFilter)}>
                        <DropdownMenuRadioItem value="all">{copy.all}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="applied">{copy.applied}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="notApplied">{copy.notApplied}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>{copy.contentType}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={contentFilter} onValueChange={(value) => setContentFilter(value as ContentFilter)}>
                        <DropdownMenuRadioItem value="all">{copy.all}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="text"><FileText />{copy.textContent}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="image"><FileImage />{copy.imageContent}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="translation-preview-table-scroll min-h-0 flex-1 overflow-auto py-1.5 pr-1.5">
                    <div className="min-h-full min-w-full overflow-hidden rounded-lg border border-[#dcd7e2] bg-card">
                      <div className="sticky top-0 z-10 grid shrink-0 grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_116px] border-b bg-[#e0e0e0] text-[11px] font-bold uppercase tracking-[0.035em] text-primary/75">
                        <span className="flex items-center justify-center px-3 py-[13px] text-center">#</span>
                        <span className="flex items-center border-l border-[#e1dde6] px-4 py-[13px]">{copy.source} ({formatLanguageCode(sourceLanguage)})</span>
                        <span className="flex items-center border-l border-[#e1dde6] px-4 py-[13px]">{copy.target} ({formatLanguageCode(targetLanguage)})</span>
                        <div className="flex min-h-[60px] flex-col items-center justify-center gap-1 border-l border-[#e1dde6] px-2 py-2 text-center">
                          <span>{copy.applyToFile}</span>
                          <span className="flex items-center gap-2 text-[11px] font-medium normal-case tracking-normal text-muted-foreground/65">
                            <span className="tabular-nums">{appliedCount} / {tables.length}</span>
                            <Checkbox
                              aria-label={copy.applyAll}
                              checked={tables.length > 0 && appliedCount === tables.length}
                              indeterminate={appliedCount > 0 && appliedCount < tables.length}
                              onCheckedChange={(checked) => {
                                setTables((currentTables) => currentTables.map((table) => ({
                                  ...table,
                                  applyToFile: checked === true,
                                })));
                              }}
                            />
                          </span>
                        </div>
                      </div>

                      {visibleTables.length > 0 ? visibleTables.map((table) => {
                        const isSelected = selectedTableId === table.id;
                        const isEditing = editingTableId === table.id;
                        const itemNumber = table.rowNumber;

                        return (
                          <div
                            className={cn(
                              "group grid min-h-[38px] grid-cols-[52px_minmax(0,1fr)_minmax(0,1fr)_116px] border-b border-[#e4e0e8] transition-colors",
                              isSelected
                                ? "bg-cyan-50 shadow-[inset_3px_0_0_var(--ring)] font-bold"
                                : "hover:bg-muted/35",
                            )}
                            key={table.id}
                            onClick={() => setSelectedTableId(table.id)}
                          >
                            <span className={cn("flex items-center justify-center px-3 py-3.5 text-center text-[13px]", isSelected ? "font-semibold text-primary" : "text-muted-foreground")}>{itemNumber}</span>
                            <div className="relative flex min-w-0 items-center border-l border-[#e4e0e8] py-3">
                              {table.path.startsWith("/images") && userId ? (
                                (() => {
                                  const imagePath = table.source || table.path;
                                  const imageUrl = getImageUrl(imagePath);
                                  return <button
                                  aria-label={`${copy.source} ${itemNumber}`}
                                  className="m-2 block rounded-md p-1 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
                                  disabled={!imageUrl}
                                  onClick={() => setImagePreview({ alt: imagePath, src: imageUrl })}
                                  type="button"
                                >
                                  {imageUrl ? (
                                    <img alt={imagePath || copy.imageContent} className="max-h-28 max-w-full rounded object-contain object-left" src={imageUrl} />
                                  ) : (
                                    <div className="flex min-h-20 min-w-28 items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                                      <FileImage className="size-5 shrink-0 text-primary/55" />
                                      <span className="max-w-40 truncate">{getImageName(imagePath)}</span>
                                    </div>
                                  )}
                                </button>;
                                })()
                              ) : (
                                <p className={cn("whitespace-pre-wrap px-4 py-3 text-[13px] leading-[1.65] text-foreground", isSelected && "text-primary")}>{table.source ?? ""}</p>
                              )}
                            </div>
                            <div className="relative flex min-w-0 items-center border-l border-[#e4e0e8]">
                              {table.path.startsWith("/images") && userId ? (
                                (() => {
                                  const imagePath = table.editedTarget || table.target || table.path;
                                  const imageUrl = getImageUrl(imagePath);
                                  return <button
                                  aria-label={`${copy.target} ${itemNumber}`}
                                  className="m-2 block rounded-md p-1 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
                                  disabled={!imageUrl}
                                  onClick={() => setImagePreview({ alt: imagePath, src: imageUrl })}
                                  type="button"
                                >
                                  {imageUrl ? (
                                    <img alt={imagePath || copy.imageContent} className="max-h-28 max-w-full rounded object-contain object-left" src={imageUrl} />
                                  ) : (
                                    <div className="flex min-h-20 min-w-28 items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                                      <FileImage className="size-5 shrink-0 text-primary/55" />
                                      <span className="max-w-40 truncate">{getImageName(imagePath)}</span>
                                    </div>
                                  )}
                                </button>;
                                })()
                              ) : (
                                <>
                                  <textarea
                                    aria-label={`${copy.target} ${itemNumber}`}
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    className={cn(
                                      "field-sizing-content h-auto min-h-0 w-full self-center resize-none overflow-hidden bg-transparent px-4 pr-10 text-[13px] leading-6 outline-none transition-[background-color,box-shadow] hover:bg-card/70 focus:bg-card focus:ring-2 focus:ring-inset focus:ring-ring/45",
                                      isEditing ? "font-normal text-foreground" : "font-inherit text-inherit",
                                    )}
                                    onChange={(event) => {
                                      const editedTarget = event.target.value;
                                      setTables((currentTables) => currentTables.map((item) => item.id === table.id ? { ...item, editedTarget } : item));
                                    }}
                                    onFocus={() => {
                                      setSelectedTableId(table.id);
                                      setEditingTableId(table.id);
                                    }}
                                    onBlur={() => setEditingTableId(null)}
                                    spellCheck={false}
                                    value={table.editedTarget}
                                  />
                                  {table.editedTarget !== (table.target ?? "") ? (
                                    <button
                                      aria-label={copy.discard}
                                      className="absolute top-1/2 right-1.5 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-md bg-card/80 text-primary/65 transition-colors hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setTables((currentTables) => currentTables.map((item) => item.id === table.id ? { ...item, editedTarget: item.target ?? "" } : item));
                                      }}
                                      title={copy.discard}
                                      type="button"
                                    >
                                      <RotateCcw className="size-4" />
                                    </button>
                                  ) : null}
                                </>
                              )}
                            </div>
                            <div className="flex items-center justify-center border-l border-[#e4e0e8]">
                              <Checkbox
                                aria-label={`${copy.applyToFile} ${itemNumber}`}
                                checked={table.applyToFile}
                                onCheckedChange={(checked) => {
                                  setTables((currentTables) => currentTables.map((item) =>
                                    item.id === table.id ? { ...item, applyToFile: checked === true } : item,
                                  ));
                                }}
                              />
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="grid h-full min-h-40 place-items-center px-6 text-center text-sm text-muted-foreground">{copy.noTableResults}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        aria-label={`${copy.page} 1`}
                        className="size-9 rounded-lg text-primary shadow-none"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(1)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <ChevronsLeft />
                      </Button>
                      <Button
                        aria-label={copy.previousPage}
                        className="size-9 rounded-lg text-primary shadow-none"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(currentPage - 1)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <ChevronLeft />
                      </Button>
                      <span aria-current="page" className="min-w-[68px] text-center text-[12px] font-medium tabular-nums text-muted-foreground">
                        {copy.page} {currentPage} / {totalPages}
                      </span>
                      <Button
                        aria-label={copy.nextPage}
                        className="size-9 rounded-lg text-primary shadow-none"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(currentPage + 1)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <ChevronRight />
                      </Button>
                      <Button
                        aria-label={`${copy.page} ${totalPages}`}
                        className="size-9 rounded-lg text-primary shadow-none"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(totalPages)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <ChevronsRight />
                      </Button>
                      <div className="ml-4 flex items-center gap-2 text-[12px] text-muted-foreground">
                        <span>{copy.showingPerPage.replace("{count}", String(pageSize))}</span>
                        <Select
                          onValueChange={(value) => {
                            setPage(1);
                            setPageSize(Number(value));
                          }}
                          value={String(pageSize)}
                        >
                          <SelectTrigger aria-label={copy.itemsPerPage} className="h-9 w-[76px] rounded-lg border-border/70 px-2.5 text-[12px] text-primary shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="h-9 rounded-lg px-4 text-[12px] font-semibold shadow-[0_4px_12px_rgba(33,23,92,0.16)]" disabled={!hasChanges || isSaving} onClick={() => void saveAndRegenerate()} size="sm">
                      {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
                      {isSaving ? copy.regenerating : copy.regenerate}
                    </Button>
                  </div>
                  {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
                </div>
              </section>

              <section ref={viewerSectionRef} className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-border/70 bg-card shadow-[0_2px_12px_rgba(33,23,92,0.05)]">
                <div className="relative z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-3 lg:absolute lg:top-0 lg:left-0 lg:border-b-0" role="tablist">
                  <Button
                    aria-selected={activeDocument === "source"}
                    className={cn(
                      "h-9 w-[124px] rounded-lg px-3.5 text-[12px] font-semibold shadow-none",
                      activeDocument === "source"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border/70 bg-card text-muted-foreground hover:border-ring/50 hover:bg-accent hover:text-primary",
                    )}
                    onClick={() => setActiveDocument("source")}
                    role="tab"
                    size="sm"
                    variant={activeDocument === "source" ? "default" : "outline"}
                  >
                    <FileText />
                    {copy.sourceFile}
                  </Button>
                  <Button
                    aria-selected={activeDocument === "translated"}
                    className={cn(
                      "h-9 w-[124px] rounded-lg px-3.5 text-[12px] font-semibold shadow-none",
                      activeDocument === "translated"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border/70 bg-card text-muted-foreground hover:border-ring/50 hover:bg-accent hover:text-primary",
                    )}
                    onClick={() => setActiveDocument("translated")}
                    role="tab"
                    size="sm"
                    variant={activeDocument === "translated" ? "default" : "outline"}
                  >
                    <FileText />
                    {copy.translatedFile}
                  </Button>
                </div>
                {activeBlob ? (
                  <FileViewerPreview
                    key={`${activeDocument}:${activeBlob.size}:${activeBlob.type}`}
                     className="min-h-0 flex-1 border-0 bg-muted/70 [&_[data-slot=viewer-controls]]:relative [&_[data-slot=viewer-controls]]:h-12 [&_[data-slot=viewer-controls]]:border-border/60 [&_[data-slot=viewer-controls]]:bg-card lg:[&_[data-slot=viewer-controls]]:h-14 lg:[&_[data-slot=viewer-position]]:absolute lg:[&_[data-slot=viewer-position]]:top-1/2 lg:[&_[data-slot=viewer-position]]:left-1/2 lg:[&_[data-slot=viewer-position]]:-translate-x-1/2 lg:[&_[data-slot=viewer-position]]:-translate-y-1/2 [&_[data-slot=file-viewer-viewport]]:bg-muted/70"
                    source={{
                      kind: "blob",
                      blob: activeBlob,
                      fileName: activeFileName,
                      identityKey: `${translationId}:${activeDocument}:${activeBlob.size}:${activeBlob.type}`,
                    }}
                  />
                ) : null}
              </section>
            </div>
          )}
          {imagePreview ? (
            <div
              aria-label={imagePreview.alt}
              aria-modal="true"
              className="absolute inset-0 z-30 grid place-items-center bg-black/85 p-6"
              role="dialog"
            >
              <button
                aria-label={copy.close}
                className="absolute top-4 right-4 grid size-10 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                onClick={() => setImagePreview(null)}
                type="button"
              >
                <X className="size-5" />
              </button>
              <img
                alt={imagePreview.alt}
                className="max-h-[calc(100dvh-3rem)] max-w-[calc(100vw-3rem)] rounded-lg object-contain shadow-2xl"
                src={imagePreview.src}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
