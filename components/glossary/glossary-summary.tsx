"use client";

import { motion } from "framer-motion";
import { Check, CheckCircle2, AlertCircle, Languages, Book, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

interface GlossarySummaryProps {
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  termCount: number;
  isValid: boolean;
  isSaving: boolean;
  mode: "create" | "edit";
  onSave: () => void;
  onCancel: () => void;
  className?: string; // Allow custom styling/positioning
}

export function GlossarySummary({
  name,
  sourceLanguage,
  targetLanguage,
  termCount,
  isValid,
  isSaving,
  mode,
  onSave,
  onCancel,
  className,
}: GlossarySummaryProps) {
  
  const sourceLangName = SUPPORTED_LANGUAGES.find(l => l.code === sourceLanguage)?.name || sourceLanguage;
  const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;

  return (
    <Card className={cn("sticky top-24 border-none shadow-md bg-secondary/30", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
           <Book className="w-5 h-5 text-primary" />
           Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Indicator */}
        <div className={cn(
            "p-3 rounded-lg border flex items-start gap-3 transition-colors",
            isValid 
               ? "bg-green-50/50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
               : "bg-amber-50/50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
        )}>
            {isValid ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            )}
            <div className="text-sm">
                <p className="font-medium">
                    {isValid 
                       ? (mode === "create" ? "Ready to Create" : "Ready to Save")
                       : "Missing Information"
                    }
                </p>
                {!isValid && (
                   <ul className="mt-1 list-disc list-inside text-xs opacity-90 space-y-0.5">
                       {!name && <li>Glossary name is required</li>}
                       {!termCount && <li>At least one term is required</li>}
                       {(!sourceLanguage || !targetLanguage) && <li>Languages must be selected</li>}
                   </ul>
                )}
            </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-4">
             {/* Name Preview */}
             <div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Name</p>
                 <p className="font-medium text-sm truncate pl-1 border-l-2 border-primary/50">
                     {name || <span className="text-muted-foreground italic">Untitled</span>}
                 </p>
             </div>

             {/* Language Pair */}
             <div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                     <Languages className="w-3 h-3" />
                     Language Pair
                 </p>
                 <div className="flex items-center gap-2 text-sm pl-1 border-l-2 border-primary/50">
                     <span className="font-medium">{sourceLangName || "?"}</span>
                     <span className="text-muted-foreground">→</span>
                     <span className="font-medium">{targetLangName || "?"}</span>
                 </div>
             </div>

             {/* Stats */}
             <div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Statistics</p>
                 <div className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/50">
                     <span className="text-sm">Total Terms</span>
                     <span className="font-bold font-mono text-primary">{termCount}</span>
                 </div>
             </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-3">
          <Button 
            className="w-full h-11 shadow-sm transition-all hover:shadow-md" 
            disabled={!isValid || isSaving} 
            onClick={onSave}
          >
            {isSaving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
            ) : (
              <>
                {mode === "create" ? <Plus className="mr-2 w-4 h-4" /> : <Save className="mr-2 w-4 h-4" />}
                {mode === "create" ? "Create Glossary" : "Save Changes"}
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
