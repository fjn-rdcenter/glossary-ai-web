"use client";

import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  FileText,
  Upload,
  Search,
  MoveRight,
  Settings2,
  List,
  Book,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { GlossaryService } from "@/api/services";
import { GlossaryDetailResponse } from "@/api/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface CreateGlossaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (glossary: GlossaryDetailResponse) => void;
  defaultSourceLanguage?: string;
  defaultTargetLanguage?: string;
}

type TempTerm = {
  id: string;
  source: string;
  target: string;
};

export function CreateGlossaryDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultSourceLanguage = "jp",
  defaultTargetLanguage = "vn",
}: CreateGlossaryDialogProps) {
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [terms, setTerms] = useState<TempTerm[]>([]);

  // UI State
  const [entryMode, setEntryMode] = useState<"manual" | "import">("manual");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Reset when opening
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setSourceLanguage(defaultSourceLanguage);
      setTargetLanguage(defaultTargetLanguage);
      setTerms([]);
      setEntryMode("manual");
      setSearchQuery("");
      setNewTermSource("");
      setNewTermTarget("");
      setIsTargetEdited(false);
    }
  }, [open, defaultSourceLanguage, defaultTargetLanguage]);

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
      const isDuplicate = terms.some((t) => t.source === trimmedSource);

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Term",
          description: `The term "${trimmedSource}" already exists in this glossary!`,
        });
        return;
      }

      // Default target to source if empty
      const effectiveTarget = newTermTarget.trim() || trimmedSource;

      const newTerm: TempTerm = {
        id: `new-${Date.now()}`,
        source: newTermSource.trim(),
        target: effectiveTarget,
      };

      setTerms((prev) => [...prev, newTerm]);
      setRecentlyAddedTermId(newTerm.id);
      setNewTermSource("");
      setNewTermTarget("");
      setIsTargetEdited(false);

      // Focus back on source for rapid entry
      sourceInputRef.current?.focus();

      // Scroll to bottom of preview list
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

  const removeTerm = (id: string) => {
    setTerms(terms.filter((t) => t.id !== id));
  };

  const handleTermEdit = (
    id: string,
    field: "source" | "target",
    value: string
  ) => {
    setTerms(terms.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
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
            };
          }
          return null;
        })
        .filter(Boolean) as TempTerm[];

      if (newTerms.length > 0) {
        // Check for duplicates
        const existingSources = new Set(
          terms.map((t) => t.source.toLowerCase().trim())
        );
        const uniqueNewTerms: TempTerm[] = [];
        let duplicateCount = 0;

        newTerms.forEach((term) => {
          if (existingSources.has(term.source.toLowerCase().trim())) {
            duplicateCount++;
          } else {
            existingSources.add(term.source.toLowerCase().trim());
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
            text: `All ${newTerms.length} terms already exist in the glossary.`,
            type: "error",
          });
          setTimeout(() => setImportMessage(null), 3000);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);

    try {
      const created = await GlossaryService.createGlossary({
        name,
        description,
        sourceLanguage,
        targetLanguage,
      });

      if (!created?.id) throw new Error("Failed to create glossary");

      if (terms.length > 0) {
        await GlossaryService.upsertTerms(
          created.id,
          terms.map((t) => ({ source: t.source, target: t.target }))
        );
      }

      const result: GlossaryDetailResponse = {
        ...created,
        terms: {
          items: [],
          total: terms.length,
          page: 1,
          size: 100,
          pages: 1,
        },
      };

      onSuccess(result);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to create glossary",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasDuplicates = terms.some(
    (t, index) =>
      terms.findIndex((t2) => t2.source.trim() === t.source.trim()) !== index
  );
  const isValid = name.trim().length > 0 && terms.length > 0 && !hasDuplicates;

  // Helper to identify duplicates for highlighting
  const getDuplicateStatus = (termSource: string, termId: string) => {
    // It's a duplicate if it appears more than once in the source list
    return (
      terms.filter((t) => t.source.trim() === termSource.trim()).length > 1
    );
  };

  const filteredTerms = terms.filter(
    (t) =>
      t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Increased max-width and height */}
      <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[75vw] w-full h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 bg-white shadow-2xl overflow-hidden sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create New Glossary
          </DialogTitle>
          <DialogDescription>
            Configure your glossary settings and add initial terms.
          </DialogDescription>
        </DialogHeader>

        {/* Main Split Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full">
          {/* LEFT PANEL: Settings & Input */}
          <div className="w-full md:w-[500px] lg:w-[550px] flex flex-col border-b md:border-b-0 md:border-r bg-white shrink-0 overflow-y-auto">
            {/* 1. Glossary Details Section */}
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
                  placeholder="e.g. Finance Terminology"
                  className="bg-muted/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">
                    Source
                  </Label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={setSourceLanguage}
                  >
                    <SelectTrigger className="bg-muted/30 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">
                    Target
                  </Label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger className="bg-muted/30 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.filter(
                        (l) => l.code !== sourceLanguage
                      ).map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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

            {/* 2. Add Term Input Section */}
            <div className="p-6 flex-1 flex flex-col bg-slate-50/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-4">
                <Plus className="w-4 h-4" />
                Add Terms
              </div>

              {/* Duplicate Warning */}
              {hasDuplicates && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 mb-4 animate-in fade-in slide-in-from-top-1">
                  <Settings2 className="w-4 h-4 ml-1 rotate-180" />
                  <span className="font-medium">
                    Duplicate source terms detected. Please resolve them to
                    create.
                  </span>
                </div>
              )}

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
                        // Mirror to target if target hasn't been manually edited or is empty
                        if (!isTargetEdited || !newTermTarget) {
                          setNewTermTarget(val);
                        }
                      }}
                      placeholder="Source text..."
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === "Enter" && newTermSource.trim()) {
                          e.preventDefault();
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
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewTerm();
                        }
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

          {/* RIGHT PANEL: Preview & List */}
          <div className="flex-1 flex flex-col bg-slate-50/80 h-full overflow-hidden relative min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Preview Terms</h3>
                <span className="bg-muted px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground">
                  {terms.length}
                </span>
              </div>

              {entryMode === "manual" && (
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-muted/30"
                    placeholder="Search added terms..."
                  />
                </div>
              )}
            </div>

            {/* List Content */}
            {entryMode === "import" ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100">
                <div
                  className="w-full max-w-lg bg-white rounded-lg p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                >
                  <input
                    type="file"
                    id="file-upload"
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
                  <div>Source ({sourceLanguage})</div>
                  <div></div>
                  <div>Target ({targetLanguage})</div>
                  <div></div>
                </div>

                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-2"
                >
                  {filteredTerms.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                      <Book className="w-12 h-12 mb-2 stroke-1" />
                      <p className="text-sm">No terms added yet</p>
                    </div>
                  ) : (
                    filteredTerms.map((term) => {
                      const isNewlyAdded = term.id === recentlyAddedTermId;
                      const isDuplicate = getDuplicateStatus(
                        term.source,
                        term.id
                      );

                      return (
                        <div
                          key={term.id}
                          className={cn(
                            "grid grid-cols-[1fr_24px_1fr_auto] gap-4 items-center p-3 rounded-lg border bg-white transition-all duration-500",
                            isNewlyAdded &&
                              "ring-2 ring-green-500/50 bg-green-50",
                            isDuplicate
                              ? "bg-red-50 border-red-200 ring-1 ring-red-200"
                              : !isNewlyAdded && "hover:border-primary/30"
                          )}
                        >
                          <Input
                            value={term.source}
                            onChange={(e) =>
                              handleTermEdit(term.id, "source", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.preventDefault();
                            }}
                            className={cn(
                              "h-8 text-sm border-transparent focus:border-input bg-transparent hover:bg-muted/50 focus:bg-white px-2",
                              isDuplicate && "text-red-700 font-medium"
                            )}
                          />
                          <MoveRight className="w-3.5 h-3.5 text-muted-foreground/30 mx-auto" />
                          <Input
                            value={term.target}
                            onChange={(e) =>
                              handleTermEdit(term.id, "target", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.preventDefault();
                            }}
                            className="h-8 text-sm font-medium text-primary border-transparent focus:border-input bg-transparent hover:bg-muted/50 focus:bg-white px-2"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTerm(term.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-white border-t shrink-0 z-20">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="px-8 min-w-[140px]"
          >
            {isSaving ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Create Glossary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
