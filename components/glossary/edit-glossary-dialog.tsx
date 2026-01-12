"use client";

import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  Search,
  MoveRight,
  Settings2,
  List,
  Book,
  RotateCcw,
  Save,
  AlertCircle,
  FileText,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { GlossaryService } from "@/api/services";
import { GlossaryDetailResponse } from "@/api/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getLanguageName } from "@/lib/utils";

interface EditGlossaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  glossaryId: string | null;
  onSuccess: (glossary: GlossaryDetailResponse) => void;
}

type TermItem = {
  id: string;
  source: string;
  target: string;
  isNew?: boolean;
  isDeleted?: boolean;
  isEdited?: boolean;
};

export function EditGlossaryDialog({
  open,
  onOpenChange,
  glossaryId,
  onSuccess,
}: EditGlossaryDialogProps) {
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [glossary, setGlossary] = useState<GlossaryDetailResponse | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // UI State
  const [entryMode, setEntryMode] = useState<"manual" | "import">("manual");
  const [importMessage, setImportMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Input State
  const [newTermSource, setNewTermSource] = useState("");
  const [newTermTarget, setNewTermTarget] = useState("");
  const [isTargetEdited, setIsTargetEdited] = useState(false);
  const [recentlyAddedTermId, setRecentlyAddedTermId] = useState<string | null>(
    null
  );

  // Status
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  useEffect(() => {
    if (open && glossaryId) {
      setLoading(true);
      GlossaryService.getGlossaryById(glossaryId)
        .then((data) => {
          setGlossary(data);
          setName(data.name);
          setDescription(data.description || "");
          if (data.terms?.items) {
            setTerms(
              data.terms.items.map((t) => ({
                id: t.id,
                source: t.source,
                target: t.target,
              }))
            );
          } else {
            setTerms([]);
          }
        })
        .catch((err) => {
          console.error(err);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load glossary",
          });
        })
        .finally(() => setLoading(false));
    } else if (!open) {
      setGlossary(null);
      setTerms([]);
      setName("");
      setDescription("");
      setSearchQuery("");
      setNewTermSource("");
      setNewTermTarget("");
      setIsTargetEdited(false);
      setEntryMode("manual");
    }
  }, [open, glossaryId]);

  // Clear highlight
  useEffect(() => {
    if (recentlyAddedTermId) {
      const timer = setTimeout(() => setRecentlyAddedTermId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [recentlyAddedTermId]);

  const handleAddNewTerm = () => {
    const trimmedSource = newTermSource.trim();
    if (trimmedSource) {
      // Check for duplicates
      const isDuplicate = terms.some(
        (t) => !t.isDeleted && t.source === trimmedSource
      );

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Term",
          description: `The term "${trimmedSource}" already exists.`,
        });
        return;
      }

      // Default target to source if empty
      const effectiveTarget = newTermTarget.trim() || trimmedSource;

      const newTerm: TermItem = {
        id: `new-${Date.now()}`,
        source: newTermSource.trim(),
        target: effectiveTarget,
        isNew: true,
      };

      setTerms((prev) => [...prev, newTerm]);
      setRecentlyAddedTermId(newTerm.id);

      // Reset Input
      setNewTermSource("");
      setNewTermTarget("");
      setIsTargetEdited(false);

      // Focus back
      sourceInputRef.current?.focus();

      // Scroll to bottom
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const newTerms = content
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(",");
          const source = parts[0].trim();
          const target = parts[1]?.trim();

          if (source) {
            return {
              id: `imported-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              source,
              target: target || source,
              isNew: true,
            };
          }
          return null;
        })
        .filter(Boolean) as TermItem[];

      if (newTerms.length > 0) {
        // Filter out duplicates (both against existing and within the new batch)
        const uniqueNewTerms: TermItem[] = [];
        let duplicateCount = 0;
        // Only check against non-deleted terms for duplication
        const seenSources = new Set(
          terms
            .filter((t) => !t.isDeleted)
            .map((t) => t.source.toLowerCase().trim())
        );

        newTerms.forEach((term) => {
          const normalizedSource = term.source.toLowerCase().trim();
          if (seenSources.has(normalizedSource)) {
            duplicateCount++;
          } else {
            seenSources.add(normalizedSource);
            uniqueNewTerms.push(term);
          }
        });

        if (uniqueNewTerms.length > 0) {
          setTerms((prev) => [...prev, ...uniqueNewTerms]);
          setEntryMode("manual");
          event.target.value = "";

          // Scroll to bottom to show imported terms
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth",
              });
            }
          }, 100);
        } else {
          // All duplicates - show error
          event.target.value = "";
          setImportMessage({
            text: `All ${newTerms.length} terms already exist in the glossary!`,
            type: "error",
          });
          setTimeout(() => setImportMessage(null), 3000);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleTermEdit = (
    id: string,
    field: "source" | "target",
    value: string
  ) => {
    setTerms(
      terms.map((t) =>
        t.id === id ? { ...t, [field]: value, isEdited: !t.isNew } : t
      )
    );
  };

  const markAsDeleted = (termId: string) => {
    setTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, isDeleted: true } : t))
    );
  };

  const undoDelete = (termId: string) => {
    setTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, isDeleted: false } : t))
    );
  };

  const handleSave = async () => {
    if (!glossaryId || !glossary) return;
    if (!name.trim()) return;

    setIsSaving(true);

    try {
      // 1. Update Details if changed
      if (name !== glossary.name || description !== glossary.description) {
        await GlossaryService.updateGlossary(glossaryId, {
          name,
          description: description, // Pass as is, allowing empty string to clear it
        });
      }

      // 2. Handle Terms
      // Deletions
      const deleted = terms.filter((t) => t.isDeleted && !t.isNew);
      if (deleted.length > 0) {
        await Promise.all(
          deleted.map((t) => GlossaryService.deleteTerm(glossaryId, t.id))
        );
      }

      // Additions (New terms that aren't deleted)
      const newTerms = terms.filter((t) => t.isNew && !t.isDeleted);
      if (newTerms.length > 0) {
        await GlossaryService.upsertTerms(
          glossaryId,
          newTerms.map((t) => ({ source: t.source, target: t.target }))
        );
      }

      // Updates (Edited existing terms)
      const edited = terms.filter(
        (t) => t.isEdited && !t.isNew && !t.isDeleted
      );
      if (edited.length > 0) {
        await Promise.all(
          edited.map((t) =>
            GlossaryService.updateTerm(glossaryId, t.id, {
              source: t.source,
              target: t.target,
            })
          )
        );
      }

      const updated = await GlossaryService.getGlossaryById(glossaryId);
      onSuccess(updated);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save changes",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter visible terms (including deleted ones so we can undo)
  const filteredTerms = terms.filter(
    (t) =>
      t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasChanges =
    (glossary &&
      (name !== glossary.name ||
        description !== (glossary.description || ""))) ||
    terms.some((t) => t.isNew || t.isDeleted || t.isEdited);

  // Counts
  const activeCount = terms.filter((t) => !t.isDeleted).length;
  const deletedCount = terms.filter((t) => t.isDeleted).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[75vw] w-full h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 bg-white shadow-2xl overflow-hidden sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                Edit Glossary
                {hasChanges && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    Unsaved Changes
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Modify glossary details and manage terms.
              </DialogDescription>
            </div>
            {/* Quick Stats or Actions could go here */}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            Loading Glossary Data...
          </div>
        ) : (
          /* Main Split Layout */
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full">
            {/* LEFT PANEL: Settings & Input */}
            <div className="w-full md:w-[500px] lg:w-[550px] flex flex-col border-b md:border-b-0 md:border-r bg-white shrink-0 overflow-y-auto">
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                  <Settings2 className="w-4 h-4" />
                  Glossary Settings
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="glossary-name"
                    className="text-xs uppercase font-bold text-muted-foreground"
                  >
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="glossary-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>

                {/* Read-only Language Display */}
                {glossary && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">
                        Source Lang
                      </Label>
                      <div className="h-10 px-3 py-2 text-sm bg-muted/50 rounded-md border text-muted-foreground flex items-center">
                        {getLanguageName(glossary.sourceLanguage)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">
                        Target Lang
                      </Label>
                      <div className="h-10 px-3 py-2 text-sm bg-muted/50 rounded-md border text-muted-foreground flex items-center">
                        {getLanguageName(glossary.targetLanguage)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label
                    htmlFor="description"
                    className="text-xs uppercase font-bold text-muted-foreground"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional context..."
                    className="bg-muted/30 min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <Separator />

              {/* Add Term Section */}
              <div className="p-6 flex-1 flex flex-col bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-4">
                  <Plus className="w-4 h-4" />
                  Add New Terms
                </div>

                <div className="space-y-4 p-4 border rounded-xl bg-white shadow-sm">
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Source
                      </Label>
                      <Input
                        ref={sourceInputRef}
                        value={newTermSource}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTermSource(val);
                          if (!isTargetEdited || !newTermTarget) {
                            setNewTermTarget(val);
                          }
                        }}
                        placeholder="Source text..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTermSource.trim()) {
                            targetInputRef.current?.focus();
                          }
                        }}
                        className="border-primary/20 focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Target
                      </Label>
                      <Input
                        ref={targetInputRef}
                        value={newTermTarget}
                        onChange={(e) => {
                          setNewTermTarget(e.target.value);
                          setIsTargetEdited(true);
                        }}
                        placeholder="Translation..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddNewTerm();
                        }}
                        className="border-primary/20 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleAddNewTerm}
                    disabled={!newTermSource.trim()}
                  >
                    Add to List
                    <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                      ENTER
                    </kbd>
                  </Button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-3">- OR -</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={() =>
                      setEntryMode(entryMode === "manual" ? "import" : "manual")
                    }
                  >
                    {entryMode === "manual"
                      ? "Import from File"
                      : "Back to Manual Entry"}
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Term List or Import UI */}
            <div className="flex-1 flex flex-col bg-slate-50/80 h-full overflow-hidden relative min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-6 py-3 border-b bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Terms</h3>
                  <div className="flex gap-1">
                    <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground">
                      {activeCount} Active
                    </span>
                    {deletedCount > 0 && (
                      <span className="bg-red-100 px-2 py-0.5 rounded-full text-[10px] font-medium text-red-600">
                        {deletedCount} Deleted
                      </span>
                    )}
                  </div>
                </div>

                {entryMode === "manual" && (
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-muted/30"
                      placeholder="Search terms..."
                    />
                  </div>
                )}
              </div>

              {/* Content Area */}
              {entryMode === "import" ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100">
                  <div
                    className="w-full max-w-lg bg-white rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() =>
                      document.getElementById("edit-file-upload")?.click()
                    }
                  >
                    <input
                      type="file"
                      id="edit-file-upload"
                      className="hidden"
                      accept=".txt, .csv"
                      onChange={handleFileUpload}
                    />
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-6">
                      <Upload className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Click to upload .txt or .csv file
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Files must follow the format:
                    </p>
                    <p className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1 rounded mb-4">
                      source term, target term
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Max file size: 5MB</span>
                    </div>
                  </div>

                  {/* Import Message */}
                  {importMessage && (
                    <div
                      className={`mt-4 p-3 rounded-md text-sm font-medium italic text-center animate-in fade-in slide-in-from-top-1 max-w-lg w-full ${
                        importMessage.type === "error"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {importMessage.text}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="grid grid-cols-[1fr_24px_1fr_40px] gap-4 px-6 py-2 bg-muted/20 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div>Source</div>
                    <div></div>
                    <div>Target</div>
                    <div></div>
                  </div>

                  <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-2"
                  >
                    {filteredTerms.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Book className="w-12 h-12 mb-2 stroke-1" />
                        <p className="text-sm">No terms found</p>
                      </div>
                    ) : (
                      filteredTerms.map((term) => {
                        const isNewlyAdded = term.id === recentlyAddedTermId;
                        const isDeleted = term.isDeleted;
                        const isEdited = term.isEdited;

                        return (
                          <div
                            key={term.id}
                            className={cn(
                              "grid grid-cols-[1fr_24px_1fr_auto] gap-4 items-center p-3 rounded-lg border bg-white transition-all duration-300 relative",
                              isNewlyAdded
                                ? "ring-2 ring-green-500/50 bg-green-50"
                                : "",
                              isDeleted
                                ? "opacity-60 bg-red-50/50 border-red-200"
                                : "hover:border-primary/30",
                              isEdited && !isDeleted
                                ? "border-amber-400/50 bg-amber-50/20"
                                : ""
                            )}
                          >
                            <div className="relative w-full">
                              <Input
                                value={term.source}
                                onChange={(e) =>
                                  handleTermEdit(
                                    term.id,
                                    "source",
                                    e.target.value
                                  )
                                }
                                disabled={isDeleted}
                                className={cn(
                                  "h-8 text-sm border-transparent focus:border-input bg-transparent hover:bg-muted/50 focus:bg-white px-2",
                                  isDeleted &&
                                    "line-through text-muted-foreground"
                                )}
                              />
                            </div>

                            <MoveRight
                              className={cn(
                                "w-3.5 h-3.5 text-muted-foreground/30 mx-auto",
                                isDeleted && "opacity-50"
                              )}
                            />

                            <div className="relative w-full">
                              <Input
                                value={term.target}
                                onChange={(e) =>
                                  handleTermEdit(
                                    term.id,
                                    "target",
                                    e.target.value
                                  )
                                }
                                disabled={isDeleted}
                                className={cn(
                                  "h-8 text-sm font-medium text-primary border-transparent focus:border-input bg-transparent hover:bg-muted/50 focus:bg-white px-2",
                                  isDeleted && "line-through text-primary/50"
                                )}
                              />
                            </div>

                            {isDeleted ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => undoDelete(term.id)}
                                className="h-8 w-8 text-red-600 hover:text-green-600 hover:bg-green-50"
                                title="Undo delete"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsDeleted(term.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                title="Delete term"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Status Indicator */}
                            {isEdited && !isDeleted && (
                              <div
                                className="absolute right-12 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"
                                title="Modified"
                              />
                            )}
                            {term.isNew && !isDeleted && (
                              <div
                                className="absolute right-12 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-500"
                                title="New"
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="p-4 bg-white border-t shrink-0 z-20">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {hasChanges && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 font-medium">
                    Unsaved changes pending
                  </span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || loading}
                className="px-8 min-w-[140px]"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
