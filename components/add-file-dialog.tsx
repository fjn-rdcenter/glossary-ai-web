"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  AlertTriangle,
  Cloud,
  Search,
  ChevronLeft,
  ChevronRight,
  FileImage,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DocumentService, TranslationService } from "@/api/services";
import { SourceDocumentResponse } from "@/lib/types";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AddFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxFiles: number;
  currentFileCount: number;
  onFilesAdded: (files: Array<{ documentId: string; metadata: { name: string; size: number; type: string } }>) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(type: string) {
  if (type.includes("pdf")) return FileText;
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("csv")
  )
    return FileSpreadsheet;
  if (type.includes("image")) return FileImage;
  return File;
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : direction < 0 ? -30 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 30 : direction > 0 ? -30 : 0,
    opacity: 0,
  }),
};

export function AddFileDialog({
  open,
  onOpenChange,
  maxFiles,
  currentFileCount,
  onFilesAdded,
}: AddFileDialogProps) {
  const trmlCommon = useTranslations("Common");
  const trmlTranslate = useTranslations("Translate");
  const trmlDashboard = useTranslations("Dashboard");

  const PAGE_SIZE = 5;
  const remainingSlots = maxFiles - currentFileCount;
  const canAddMore = remainingSlots > 0;

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [browseLoading, setBrowseLoading] = useState(false);
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocumentResponse[]>([]);
  const [sourceDocumentCache, setSourceDocumentCache] = useState<Record<string, SourceDocumentResponse>>({});
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [browseError, setBrowseError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [browseTab, setBrowseTab] = useState("upload");
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [browseTotalItems, setBrowseTotalItems] = useState(0);

  const [displayedPage, setDisplayedPage] = useState(1);
  const [pageDocuments, setPageDocuments] = useState<Record<number, SourceDocumentResponse[]>>({});
  const [direction, setDirection] = useState(0);

  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const loadSourceDocuments = useCallback(async (page: number, query: string) => {
    setBrowseLoading(true);
    setBrowseError("");
    try {
      const response = await DocumentService.getSourceDocuments(page, PAGE_SIZE, "uploadedAt", "desc", query || undefined);
      const items = response.items || [];
      setSourceDocuments(items);
      setBrowseTotalPages(response.pages || 1);
      setBrowseTotalItems(response.total || items.length);
      setSourceDocumentCache((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          next[item.id] = item;
        });
        return next;
      });
      setPageDocuments((prev) => ({ ...prev, [page]: items }));
      setDisplayedPage(page);
    } catch (error) {
      const message = getErrorMessage(error);
      setBrowseError(message);
      setErrorDialog({ open: true, message });
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && browseTab === "browse") {
      loadSourceDocuments(browsePage, searchQuery);
    }
  }, [open, browseTab, browsePage, searchQuery, loadSourceDocuments]);

  useEffect(() => {
    if (!open) {
      setBrowseTab("upload");
      setBrowsePage(1);
      setDisplayedPage(1);
      setPageDocuments({});
      setDirection(0);
      setSearchInput("");
      setSearchQuery("");
      setBrowseError("");
      setUploadError("");
      setUploadFiles([]);
      setSelectedDocuments(new Set());
    }
  }, [open]);

  const handleTabChange = (value: string) => {
    setBrowseTab(value);
    if (value === "browse") {
      setBrowsePage(1);
      setDisplayedPage(1);
      setPageDocuments({});
      setDirection(0);
    }
  };

  const applySearch = () => {
    setBrowsePage(1);
    setDisplayedPage(1);
    setPageDocuments({});
    setDirection(0);
    setSearchQuery(searchInput.trim());
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((f) => {
        const maxSize = 50 * 1024 * 1024;
        if (f.size > maxSize) {
          setUploadError(`File ${f.name} is too large. Maximum size is 50MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length + uploadFiles.length > remainingSlots) {
        setUploadError(`You can only add ${remainingSlots} more file(s). Please remove some files or select fewer.`);
        return;
      }

      setUploadFiles((prev) => [...prev, ...validFiles]);
      setUploadError("");
    },
    maxSize: 50 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff', '.tif'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
  });

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    setUploading(true);
    setUploadError("");

    try {
      const uploadedFiles = [];

      for (const file of uploadFiles) {
        try {
          const response = await TranslationService.uploadDocument(file, "jp", "vn");

          uploadedFiles.push({
            documentId: response.id,
            metadata: {
              name: response.name,
              size: response.size,
              type: response.type,
            },
          });
        } catch (error) {
          console.error(`Failed to upload ${file.name}`, error);
          setUploadError(`Failed to upload ${file.name}: ${getErrorMessage(error)}`);
        }
      }

      if (uploadedFiles.length > 0) {
        onFilesAdded(uploadedFiles);
        setUploadFiles([]);
        onOpenChange(false);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleBrowseSelect = () => {
    if (selectedDocuments.size === 0) return;

    const selectedDocs = Object.values(sourceDocumentCache).filter((doc) =>
      selectedDocuments.has(doc.id)
    );

    const filesToAdd = selectedDocs.map((doc) => ({
      documentId: doc.id,
      metadata: {
        name: doc.name,
        size: doc.size,
        type: doc.type,
      },
    }));

    onFilesAdded(filesToAdd);
    setSelectedDocuments(new Set());
    onOpenChange(false);
  };

  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else if (newSelected.size < remainingSlots) {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const currentDocs = pageDocuments[displayedPage] || [];
  const filteredDocuments = currentDocs.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBrowsePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > browseTotalPages || nextPage === browsePage) return;
    setDirection(nextPage > browsePage ? 1 : -1);
    setBrowsePage(nextPage);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[min(96vw,72rem)] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{trmlTranslate("addMoreFiles") || "Add More Files"}</DialogTitle>
            <DialogDescription>
              {remainingSlots > 0 ? (
                <>{trmlTranslate("filesRemaining", { remaining: remainingSlots }) || `You can add up to ${remainingSlots} more file(s).`}</>
              ) : (
                <>{trmlTranslate("maxFilesReached") || "You have reached the maximum number of files."}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {canAddMore ? (
            <Tabs value={browseTab} onValueChange={handleTabChange} className="w-full flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  {trmlTranslate("uploadNew") || "Upload New"}
                </TabsTrigger>
                <TabsTrigger value="browse">
                  <FileText className="w-4 h-4 mr-2" />
                  {trmlTranslate("browseExisting") || "Browse Existing"}
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                {browseTab === "upload" ? (
                  <TabsContent
                    value="upload"
                    forceMount
                    key="upload"
                    className="space-y-4 mt-4 flex-1 min-h-0 overflow-hidden outline-none"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${isDragActive
                          ? "border-primary bg-primary/5 scale-[0.99]"
                          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-slate-50/30"
                          }`}
                      >
                        <input {...getInputProps()} />
                        <Cloud className={`w-8 h-8 mb-2 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-sm font-medium">
                          {trmlDashboard("dropFile") || "Drag and drop files here"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {trmlCommon("or") || "or"} <span className="text-primary font-semibold">{trmlCommon("browseFiles") || "browse"}</span>
                        </p>
                      </div>

                      {uploadError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-destructive">{uploadError}</p>
                        </div>
                      )}

                      {uploadFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            {trmlCommon("selected")} ({uploadFiles.length})
                          </Label>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {uploadFiles.map((file, index) => {
                              const Icon = getFileIcon(file.type);
                              const extension = getFileExtension(file.name);

                              return (
                                <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="relative flex-shrink-0">
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                                        <Icon className="w-4 h-4 text-primary" />
                                      </div>
                                      <div className="absolute -bottom-1 -right-1 px-0.5 py-0.25 rounded-md text-[7px] font-bold bg-primary text-primary-foreground">
                                        {extension}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{file.name}</p>
                                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeUploadFile(index)}>
                                    ✕
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </TabsContent>
                ) : (
                  <TabsContent
                    value="browse"
                    forceMount
                    key="browse"
                    className="space-y-4 mt-4 flex-1 min-h-0 overflow-hidden outline-none"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                    >
                      {browseError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-destructive">{browseError}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={trmlCommon("search") || "Search files..."}
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              applySearch();
                            }
                          }}
                          className="h-9 bg-white/80 border-border/60 shadow-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={applySearch}
                          disabled={browseLoading}
                          aria-label={trmlCommon("search") || "Search"}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="relative min-h-[310px] overflow-hidden">
                        {browseLoading && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] transition-opacity duration-200">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}

                        <AnimatePresence mode="wait" initial={false} custom={direction}>
                          <motion.div
                            key={displayedPage}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.18, ease: "easeInOut" }}
                            className="space-y-2"
                          >
                            {filteredDocuments.length > 0 ? (
                              <div className="space-y-2">
                                {filteredDocuments.map((doc) => {
                                  const Icon = getFileIcon(doc.type || "");
                                  const extension = getFileExtension(doc.name);
                                  const isSelected = selectedDocuments.has(doc.id);

                                  return (
                                    <div
                                      key={doc.id}
                                      className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-primary/20 bg-white/50 hover:bg-primary/5 hover:border-primary/40",
                                        isSelected && "bg-primary/10 border-primary shadow-md shadow-primary/10 ring-1 ring-primary/30"
                                      )}
                                      onClick={() => toggleDocumentSelection(doc.id)}
                                      title={doc.name}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                        className="h-5 w-5"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <div className="relative flex-shrink-0">
                                        <div className={cn(
                                          "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                                          isSelected ? "bg-background/80" : "bg-primary/10"
                                        )}>
                                          <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-primary")} />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 px-0.5 py-0.25 rounded-md text-[7px] font-bold bg-primary text-primary-foreground">
                                          {extension}
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium whitespace-normal break-all leading-snug pr-2">
                                          {doc.name}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-12 text-muted-foreground">
                                {trmlTranslate("noDocuments") || "No documents found"}
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {browseTotalItems > 0 ? (browsePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(browsePage * PAGE_SIZE, browseTotalItems)} of {browseTotalItems}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={browseLoading || browsePage <= 1}
                            onClick={() => handleBrowsePageChange(browsePage - 1)}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-xs font-medium min-w-[48px] text-center">
                            {browsePage} / {browseTotalPages}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={browseLoading || browsePage >= browseTotalPages}
                            onClick={() => handleBrowsePageChange(browsePage + 1)}
                            aria-label="Next page"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </TabsContent>
                )}
              </AnimatePresence>
            </Tabs>
          ) : (
            <div className="py-8 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-yellow-600" />
              <p className="text-sm text-muted-foreground">
                {trmlTranslate("maxFilesReached") || "You have reached the maximum number of files (5)."}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {trmlCommon("cancel") || "Cancel"}
            </Button>
            {browseTab === "upload" && canAddMore ? (
              <Button onClick={handleUpload} disabled={uploadFiles.length === 0 || uploading}>
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? trmlCommon("uploading") || "Uploading..." : trmlTranslate("addFiles") || "Add Files"}
              </Button>
            ) : browseTab === "browse" && canAddMore ? (
              <Button onClick={handleBrowseSelect} disabled={selectedDocuments.size === 0}>
                {trmlTranslate("addSelected", { count: selectedDocuments.size }) || `Add Selected (${selectedDocuments.size})`}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}