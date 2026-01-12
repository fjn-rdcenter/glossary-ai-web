"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { GlossaryService } from "@/api/services";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { GlossaryDetailResponse } from "@/api/types";
import { GlossarySummary } from "@/components/glossary/glossary-summary";

// Internal type for UI management
type UITerm = {
  id: string; // Temporary ID or real ID
  source: string;
  target: string;
  isNew?: boolean; 
};

interface GlossaryFormProps {
  mode: "create" | "edit";
  initialData?: GlossaryDetailResponse;
  onSuccess: (glossary: GlossaryDetailResponse) => void;
  onCancel: () => void;
  // Layout options
  isModal?: boolean;
}

export function GlossaryForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
  isModal = false,
}: GlossaryFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("jp");
  const [targetLanguage, setTargetLanguage] = useState("vn");
  const [activeTab, setActiveTab] = useState("manual");
  const [terms, setTerms] = useState<UITerm[]>([
    { id: "1", source: "", target: "" },
  ]);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  // Track which terms have had their target manually edited (for auto-fill logic)
  const [targetEditedTerms, setTargetEditedTerms] = useState<Set<string>>(
    new Set()
  );
  // Track deleted terms in edit mode
  const [deletedTermIds, setDeletedTermIds] = useState<Set<string>>(new Set());

  // Initialize data
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setSourceLanguage(initialData.sourceLanguage);
      setTargetLanguage(initialData.targetLanguage);
      
      if (initialData.terms && initialData.terms.items) {
        setTerms(initialData.terms.items.map(t => ({
            id: t.id,
            source: t.source,
            target: t.target
        })));
      } else {
         setTerms([]);
      }
    }
  }, [initialData]);

  const addTerm = () => {
    setTerms([...terms, { id: `new-${Date.now()}`, source: "", target: "" }]);
  };

  const removeTerm = (id: string) => {
    // Check if this is the last term (if required) - Only warn in Edit mode
    if (terms.length === 1 && mode === "edit") {
      setShowDeleteWarning(true);
      return;
    }
    setTerms(terms.filter((t) => t.id !== id));
    setSelectedTerms((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    // If identifying real term (not temp/imported), track for deletion
    if (mode === "edit" && !id.toString().startsWith("new-") && !id.toString().startsWith("imported-") && !id.toString().match(/^\d+$/) && id.length > 10) { 
        setDeletedTermIds(prev => new Set(prev).add(id));
    }
  };

  const toggleTermSelection = (id: string) => {
    setSelectedTerms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTerms.size === terms.length) {
      setSelectedTerms(new Set());
    } else {
      setSelectedTerms(new Set(terms.map((t) => t.id)));
    }
  };

  const deleteSelectedTerms = () => {
    if (selectedTerms.size === terms.length && mode === "edit") {
      setShowDeleteWarning(true);
      return;
    }
    
    // Track deletions
    if (mode === "edit") {
        selectedTerms.forEach(id => {
             if (!id.toString().startsWith("new-") && !id.toString().startsWith("imported-") && id !== "1") {
                 setDeletedTermIds(prev => new Set(prev).add(id));
             }
        });
    }

    setTerms(terms.filter((t) => !selectedTerms.has(t.id)));
    setSelectedTerms(new Set());
  };

  const confirmDeleteAllTerms = () => {
    onCancel(); 
  };

  const updateTerm = (
    id: string,
    field: "source" | "target",
    value: string
  ) => {
    const currentTerm = terms.find((t) => t.id === id);

    if (field === "source" && currentTerm) {
      if (!targetEditedTerms.has(id)) {
        setTerms(
          terms.map((t) =>
            t.id === id ? { ...t, source: value, target: value } : t
          )
        );
      } else {
        setTerms(terms.map((t) => (t.id === id ? { ...t, source: value } : t)));
      }
    } else if (field === "target") {
      setTargetEditedTerms((prev) => new Set(prev).add(id));
      setTerms(terms.map((t) => (t.id === id ? { ...t, target: value } : t)));
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "text/plain" || file.type === "text/csv" || file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
      setImportedFile(file);
      // Reset input value to allow re-selecting same file if needed
      e.target.value = "";
    }
  };

  const handleProcessImport = () => {
    if (!importedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/);
        const importedTerms: UITerm[] = lines
          .map((line, index) => {
            if (!line.trim()) return null;
            const parts = line.split(",");
            const source = parts[0].trim();
            const target = parts[1]?.trim();
            
            if (source) {
                return {
                    id: `imported-${Date.now()}-${index}`,
                    source,
                    target: target || source
                };
            }
            return null;
          })
          .filter(Boolean) as UITerm[];

        if (importedTerms.length > 0) {
             setTerms([
                ...terms.filter((t) => t.source || t.target),
                ...importedTerms,
             ]);
             setImportedFile(null);
             setActiveTab("manual");
        } else {
            setImportedFile(null);
        }
    };
    reader.readAsText(importedFile);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        let resultGlossary: GlossaryDetailResponse;

        if (mode === "create") {
            const created = await GlossaryService.createGlossary({
                name,
                sourceLanguage,
                targetLanguage,
            });
            if (!created || !created.id) throw new Error("Failed to create glossary");
            
            resultGlossary = { ...created, terms: { items: [], total: 0, page: 1, size: 100, pages: 0 } };
        } else {
             if (!initialData) throw new Error("No initial data for edit");
             await GlossaryService.updateGlossary(initialData.id, { 
                name,
                description: description || "" // Send empty string if cleared
             }); 
             resultGlossary = { ...initialData, name, description };
             
             // Handle Deletions
             if (deletedTermIds.size > 0) {
                 await Promise.all(Array.from(deletedTermIds).map(tid => 
                     GlossaryService.deleteTerm(initialData.id, tid)
                 ));
             }
        }

        const validTermsToSave = terms.filter(t => t.source.trim() && t.target.trim());
        
        // 1. Separate terms into new/imported vs existing/edited
        const newTermsToUpsert = validTermsToSave.filter(t => t.id.startsWith("new-") || t.id.startsWith("imported-"));
        const existingTermsToUpdate = validTermsToSave.filter(t => !t.id.startsWith("new-") && !t.id.startsWith("imported-"));

        // 2. Batch Upsert New Terms
        if (newTermsToUpsert.length > 0) {
             await GlossaryService.upsertTerms(
                 resultGlossary.id, 
                 newTermsToUpsert.map(t => ({ source: t.source, target: t.target }))
             );
        }

        // 3. Update Existing Terms (Sequentially or Parallel)
        if (existingTermsToUpdate.length > 0) {
             await Promise.all(existingTermsToUpdate.map(t => 
                 GlossaryService.updateTerm(resultGlossary.id, t.id, { 
                     source: t.source, 
                     target: t.target 
                 })
             ));
        }
        
        onSuccess(resultGlossary);

    } catch (error) {
        console.error("Save failed", error);
    } finally {
        setIsSaving(false);
    }
  };

  const validTerms = terms.filter((t) => t.source && t.target);
  
  // Check for duplicates
  const sourceTerms = terms.map(t => t.source.trim()).filter(Boolean);
  const uniqueSourceTerms = new Set(sourceTerms);
  const hasDuplicates = sourceTerms.length !== uniqueSourceTerms.size;

  const isValid = !!name && !!sourceLanguage && !!targetLanguage && validTerms.length > 0 && !hasDuplicates;

  return (
    <div className={cn("grid gap-8 items-start", isModal ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1 lg:grid-cols-12")}>
      {/* Main Form Area */}
      <div className={cn("space-y-6", isModal ? "lg:col-span-8" : "lg:col-span-8")}>
         {/* Basic Info */}
         <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Glossary Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Legal Terms"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 px-3 py-2 text-sm leading-5 box-border overflow-hidden"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Source Language</Label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={setSourceLanguage}
                    disabled={mode === "edit"} 
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Language</Label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                    disabled={mode === "edit"}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES
                        .filter((l) => l.code !== sourceLanguage)
                        .map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

               <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                  <TabsTrigger value="import">Import File</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="space-y-4">
                  {/* Bulk Actions */}
                  {selectedTerms.size > 0 && (
                    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
                      <span className="text-sm font-medium">
                        {selectedTerms.size} term{selectedTerms.size > 1 ? "s" : ""} selected
                      </span>
                      <div className="flex gap-2">
                         <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTerms(new Set())}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={deleteSelectedTerms}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedTerms.size === terms.length && terms.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="font-medium">Source Term</TableHead>
                          <TableHead className="font-medium">Translation</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {terms.map((term) => (
                            <motion.tr
                              key={term.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className={cn(
                                "border-b border-border last:border-0",
                                selectedTerms.has(term.id) && "bg-secondary/30"
                              )}
                            >
                               <TableCell className="p-2">
                                <Checkbox
                                  checked={selectedTerms.has(term.id)}
                                  onCheckedChange={() => toggleTermSelection(term.id)}
                                />
                              </TableCell>
                              <TableCell className="p-2 relative group">
                                <Input
                                  value={term.source}
                                  onChange={(e) => updateTerm(term.id, "source", e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                          e.preventDefault();
                                          // Optional: Move focus or add new term if last one
                                      }
                                  }}
                                  className={cn(
                                    "border-0 bg-transparent focus-visible:ring-1 h-9 px-2 text-sm leading-5 box-border overflow-hidden",
                                    // Highlight if duplicate (Case-Sensitive)
                                    terms.filter(t => t.id !== term.id && t.source.trim() === term.source.trim() && term.source.trim()).length > 0
                                      ? "text-destructive font-medium ring-1 ring-destructive/50 rounded-md bg-destructive/5" 
                                      : ""
                                  )}
                                  placeholder="Enter source..."
                                />
                                {/* Tooltip for duplicate */}
                                {terms.filter(t => t.id !== term.id && t.source.trim() === term.source.trim() && term.source.trim()).length > 0 && (
                                  <div className="absolute left-2 -top-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Duplicate source term
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  value={term.target}
                                  onChange={(e) => updateTerm(term.id, "target", e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                          e.preventDefault();
                                      }
                                  }}
                                  className="border-0 bg-transparent focus-visible:ring-1 h-9 px-2 text-sm leading-5 box-border overflow-hidden"
                                  placeholder="Enter target (defaults to source)..."
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTerm(term.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {hasDuplicates && (
                    <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 mt-2">
                        <AlertTriangle className="w-4 h-4 ml-1" />
                        <span className="font-medium">Duplicate source terms detected. Please remove or fix them to continue.</span>
                    </div>
                  )}

                  <Button variant="outline" onClick={addTerm} className="w-full bg-secondary/50 hover:bg-secondary mt-4">
                    <Plus className="mr-2 w-4 h-4" />
                    Add Another Term
                  </Button>
                </TabsContent>

                <TabsContent value="import" className="space-y-4">
                    <div className={cn("border-2 border-dashed rounded-xl p-6 text-center transition-all", importedFile ? "border-primary bg-secondary/50" : "border-border hover:border-primary/50")}>
                        {importedFile ? (
                           <div className="flex flex-col items-center justify-center gap-4 py-4">
                               <div className="flex items-center gap-3 p-3 bg-background rounded-lg border shadow-sm w-full max-w-sm">
                                   <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                       <FileText className="w-5 h-5 text-primary" />
                                   </div>
                                   <div className="flex-1 text-left min-w-0">
                                       <p className="font-medium text-sm truncate">{importedFile.name}</p>
                                       <p className="text-xs text-muted-foreground">Ready to import</p>
                                   </div>
                                   <Button variant="ghost" size="icon" onClick={() => setImportedFile(null)} className="shrink-0">
                                       <X className="w-4 h-4" />
                                   </Button>
                               </div>
                               
                               <div className="flex gap-2 w-full max-w-sm">
                                   <Button variant="outline" className="flex-1" onClick={() => setImportedFile(null)}>
                                       Cancel
                                   </Button>
                                   <Button className="flex-1" onClick={handleProcessImport}>
                                       Import Terms
                                   </Button>
                               </div>
                           </div>
                        ) : (
                           <div className="py-4">
                               <Upload className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                               <p className="text-sm font-medium mb-1">Upload Terms File</p>
                               <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                                   Supports .txt or .csv files with "source, target" format
                               </p>
                               <input type="file" accept=".txt, .csv" onChange={handleFileImport} className="hidden" id="file-import-modal" />
                               <Button asChild variant="default" size="sm">
                                   <label htmlFor="file-import-modal" className="cursor-pointer">Select File</label>
                               </Button>
                           </div>
                        )}
                    </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
      </div>

      {/* Sidebar Summary */}
      <div className={cn("space-y-6 sticky top-6", isModal ? "lg:col-span-4" : "lg:col-span-4")}>
          <GlossarySummary 
             name={name}
             sourceLanguage={sourceLanguage}
             targetLanguage={targetLanguage}
             termCount={validTerms.length}
             isValid={isValid}
             isSaving={isSaving}
             mode={mode}
             onSave={handleSave}
             onCancel={onCancel}
          />
      </div>

      {/* Delete Warning */}
      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete All Terms?
            </AlertDialogTitle>
            <AlertDialogDescription>
               Removing all terms might invalidate the glossary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAllTerms} className="bg-destructive text-destructive-foreground">
               Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
