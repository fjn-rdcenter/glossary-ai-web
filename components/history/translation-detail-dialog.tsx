"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Calendar, 
  ArrowRight, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download
} from "lucide-react";
import { TranslationJobResponse, GlossaryResponse } from "@/lib/types";
import { formatDate, getLanguageName } from "@/lib/utils";
import { GlossaryService } from "@/api/services";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from 'next-intl';

interface TranslationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: TranslationJobResponse | null;
  onDownloadTranslated?: (job: TranslationJobResponse) => void;
  onDownloadOriginal?: (job: TranslationJobResponse) => void;
}

export function TranslationDetailDialog({
  open,
  onOpenChange,
  job,
  onDownloadTranslated,
  onDownloadOriginal,
}: TranslationDetailDialogProps) {
  const trmlCommon = useTranslations("Common");
  const trmlHistory = useTranslations("History");
  
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);
  const [loadingGlossaries, setLoadingGlossaries] = useState(false);

  useEffect(() => {
    if (open && job && job.glossaries && job.glossaries.length > 0) {
      // Fetch glossaries to resolve names
      // Optimization: In a real app, we might want to cache this or fetch only specific IDs.
      // For now, fetching all (paginated) is acceptable given the likely scale.
      setLoadingGlossaries(true);
      GlossaryService.getGlossaries()
        .then((items) => {
          setGlossaries(items);
        })
        .catch((err) => console.error("Failed to load glossaries", err))
        .finally(() => setLoadingGlossaries(false));
    }
  }, [open, job]);

  if (!job) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "processing":
      case "translating":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 mr-1" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 mr-1" />;
      default:
        return <Clock className="w-4 h-4 mr-1" />;
    }
  };

  // Resolve glossary names
  const jobGlossaries = job.glossaries?.map(id => {
    const found = glossaries.find(g => g.id === id);
    return found ? found.name : id; // Fallback to ID if name not found yet
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <div className="space-y-1 text-left">
              <span className="text-lg font-semibold leading-none tracking-tight">Translation Details</span>
              <p className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                ID: <span className="font-mono text-xs">{job.id.substring(0, 8)}...</span>
              </p>
            </div>
            <Badge variant="outline" className={getStatusColor(job.status)}>
              {getStatusIcon(job.status)}
              <span className="capitalize">{job.status}</span>
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            
            {/* Document Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center text-slate-900 dark:text-slate-100">
                <FileText className="w-4 h-4 mr-2" />
                {trmlHistory("docInfo")}
              </h4>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">{trmlHistory("fileName")}</span>
                    <span className="text-sm font-medium break-all">{job.sourceDocumentName || job.sourceDocument}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Language & Config Section */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{trmlHistory("langPair")}</h4>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
                        <Badge variant="secondary" className="text-xs uppercase">{job.sourceLanguage}</Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs uppercase">{job.targetLanguage}</Badge>
                    </div>
                </div>
                 <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2" />
                        {trmlHistory("usedGlossaries")}
                    </h4>
                     <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 min-h-[58px]">
                        {jobGlossaries.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {jobGlossaries.map((name, idx) => (
                                    <Badge key={idx} variant="outline" className="text-[10px] bg-white dark:bg-slate-800">
                                        {name}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground italic">{trmlHistory("noneUsed")}</span>
                        )}
                    </div>
                </div>
            </div>

            <Separator />

             {/* Timeline Section */}
             <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center text-slate-900 dark:text-slate-100">
                    <Calendar className="w-4 h-4 mr-2" />
                    {trmlHistory("timeline")}
                </h4>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <div>
                        <span className="text-xs text-muted-foreground block">{trmlHistory("timeStarted")}</span>
                        <span className="text-sm">{job.startedAt ? formatDate(job.startedAt) : "-"}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">{trmlHistory("timeCompleted")}</span>
                        <span className="text-sm">{job.completedAt ? formatDate(job.completedAt) : "-"}</span>
                    </div>
                </div>
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex gap-2 w-full sm:w-auto">
             {job.status === 'completed' && onDownloadTranslated && (
                 <Button className="flex-1 sm:flex-none" size="sm" onClick={() => onDownloadTranslated(job)}>
                    <Download className="w-4 h-4 mr-2" />
                    {trmlHistory("labelTranslated")}
                 </Button>
             )}
              {onDownloadOriginal && (
                 <Button variant="outline" className="flex-1 sm:flex-none" size="sm" onClick={() => onDownloadOriginal(job)}>
                    <Download className="w-4 h-4 mr-2" />
                    {trmlHistory("labelOriginal")}
                 </Button>
             )}
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{trmlHistory("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
