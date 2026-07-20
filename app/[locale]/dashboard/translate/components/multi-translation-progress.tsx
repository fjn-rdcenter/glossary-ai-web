import { FileConfigState } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Check, AlertCircle, FileText, Download, RotateCcw, Ban, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface MultiTranslationProgressProps {
  files: FileConfigState[];
  onDownload: (jobId: string, filename: string) => void;
  onRetry: (fileId: string) => void;
  onCancelAll: () => void;
  onCancel?: (fileId: string) => void;
  onNewTranslation: () => void;
  isAllCompleted: boolean;
}

function getFileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

export function MultiTranslationProgress({
  files,
  onDownload,
  onRetry,
  onCancelAll,
  onCancel,
  onNewTranslation,
  isAllCompleted
}: MultiTranslationProgressProps) {
  const trmlTranslate = useTranslations("Translate");
  const trmlCommon = useTranslations("Common");
  const trmlTranslationExecution = useTranslations("TranslationExecution");

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-2xl font-semibold">
            {isAllCompleted
              ? (trmlTranslationExecution("successTitle") || "Translation Completed")
              : (trmlTranslationExecution("translating") || "Translating...")}
          </CardTitle>
          <CardDescription>
            {files.filter(f => f.translationStatus === "success").length} {trmlCommon("of") || "of"} {files.length} {trmlCommon("success") || "Success"}
          </CardDescription>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          {!isAllCompleted && (
            <Button variant="outline" onClick={onCancelAll} className="text-destructive hover:bg-destructive/10">
              <Ban className="w-4 h-4 mr-2" />
              {trmlTranslationExecution("cancelAll") || "Cancel All"}
            </Button>
          )}
          {isAllCompleted && (
            <Button onClick={onNewTranslation}>
              {trmlTranslationExecution("newTranslation") || "New Translation"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="space-y-3">
          {files.map((file) => {
            const extension = getFileExtension(file.metadata.name);
            return (
              <div key={file.id} className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  {/* Left section: Icon and file info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* File Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary text-primary-foreground shadow-sm border border-background">
                        {extension}
                      </div>
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-medium text-foreground truncate text-sm">
                        {file.metadata.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 flex items-center">
                        {trmlCommon(file.sourceLanguage) || file.sourceLanguage.charAt(0).toUpperCase() + file.sourceLanguage.slice(1)} <span className="mx-2 text-muted-foreground/50">→</span> {trmlCommon(file.targetLanguage) || file.targetLanguage.charAt(0).toUpperCase() + file.targetLanguage.slice(1)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {["idle", "translating"].includes(file.translationStatus) && (
                      <div className="flex items-center gap-2">
                        {/* Loader + progress percentage */}
                        {file.translationStatus === "idle" ? (
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <LoaderCircle className="w-4 h-4 animate-spin text-primary/70" /> {trmlTranslationExecution("pending") || "Queued..."}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-primary flex items-center gap-2">
                            <LoaderCircle className="w-4 h-4 animate-spin text-primary" />
                            {Math.round(file.progress)}%
                          </div>
                        )}
                        {/* Cancel button */}
                        {onCancel && (
                          <>
                            <Button size="sm" variant="outline" className="hidden sm:inline-flex border-border/70 text-destructive hover:bg-destructive/10" onClick={() => onCancel(file.id)}>
                              <Ban className="w-4 h-4 mr-2" /> {trmlTranslationExecution("cancel") || "Cancel"}
                            </Button>
                            <Button size="icon" variant="outline" className="sm:hidden border-border/70 text-destructive hover:bg-destructive/10" onClick={() => onCancel(file.id)}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {file.translationStatus === "success" && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                          <Check className="w-4 h-4" /> {trmlCommon("success") || "Success"}
                        </div>
                        <Button size="sm" variant="outline" className="text-foreground hidden sm:inline-flex border-border/70" onClick={() => onDownload(file.jobId!, `${file.targetLanguage.toUpperCase()}-${file.metadata.name}`)}>
                          <Download className="w-4 h-4 mr-2" /> {trmlTranslationExecution("download") || "Download File"}
                        </Button>
                        <Button size="icon" variant="outline" className="text-foreground sm:hidden border-border/70" onClick={() => onDownload(file.jobId!, `${file.targetLanguage.toUpperCase()}-${file.metadata.name}`)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                  {["error", "cancelled"].includes(file.translationStatus) && (
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 text-sm font-medium ${file.translationStatus === "error" ? "text-destructive" : "text-yellow-600 dark:text-yellow-500"}`}>
                        <AlertCircle className="w-4 h-4" /> {file.translationStatus === "error" ? (trmlCommon("error") || "Error") : (trmlCommon("cancelled") || "Cancelled")}
                      </div>
                      <Button size="sm" variant="outline" className="hidden sm:inline-flex border-border/70" onClick={() => onRetry(file.id)}>
                        <RotateCcw className="w-4 h-4 mr-2" /> {trmlTranslationExecution("tryAgain") || "Retry"}
                      </Button>
                      <Button size="icon" variant="outline" className="sm:hidden border-border/70" onClick={() => onRetry(file.id)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  </div>
                </div>

                {/* Progress Bar */}
                {["idle", "translating"].includes(file.translationStatus) && (
                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden mt-4">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: file.translationStatus === "success" ? "100%" : `${Math.min(Math.max(file.progress, 0), 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
