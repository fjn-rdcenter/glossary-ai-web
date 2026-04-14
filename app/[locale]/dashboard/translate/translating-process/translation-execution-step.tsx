import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  X,
  AlertCircle,
  RotateCcw,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCard } from "@/components/file-card";
import { TranslationStatus } from "../types";
import { useTranslations } from 'next-intl';

interface TranslationExecutionStepProps {
  currentStep: number;
  uploadedFile: {
    name: string;
    size: number;
    type: string;
  } | null;
  sourceLanguage: string;
  targetLanguage: string;
  glossaryOption: "none" | "existing" | "new";
  selectedGlossaryList: any[];
  translateImages: boolean;
  status: TranslationStatus;
  progress: number;
  onBack: () => void;
  onStepChange: (step: number, applyToAll?: boolean) => void;
  onStartTranslation: () => void;
  onCancelTranslation: () => void;
  onDownload: () => void;
  onNewTranslation: () => void;
  onRetry: () => void;
}

export function TranslationExecutionStep({
  currentStep,
  uploadedFile,
  sourceLanguage,
  targetLanguage,
  glossaryOption,
  selectedGlossaryList,
  translateImages,
  status,
  progress,
  onBack,
  onStepChange,
  onStartTranslation,
  onCancelTranslation,
  onDownload,
  onNewTranslation,
  onRetry,
}: TranslationExecutionStepProps) {
  const trmlCommon = useTranslations("Common");
  const trmlTranslationExecution = useTranslations("TranslationExecution");
  // Step 2: Preview Summary
  if (currentStep === 2) {
    return (
      <motion.div
        key="preview"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.15 }}
      >
        <Card className="max-w-2xl mx-auto" data-tour="preview-summary">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              {trmlTranslationExecution("title")}
            </CardTitle>
            <p className="text-muted-foreground">
              {trmlTranslationExecution("description")}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Document Info */}
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-sm text-muted-foreground mb-2">{trmlTranslationExecution("document")}</p>
              {uploadedFile && (
                <FileCard
                  name={uploadedFile.name}
                  size={uploadedFile.size}
                  type={uploadedFile.type}
                />
              )}
            </div>

            {/* Translation Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">
                  {trmlCommon("sourceLanguage")}
                </p>
                <p className="font-medium">
                  {trmlCommon(sourceLanguage)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground mb-1">
                  {trmlCommon("targetLanguage")}
                </p>
                <p className="font-medium">
                  {trmlCommon(targetLanguage)}
                </p>
              </div>
            </div>

            {/* Translate Images Setting */}
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-sm text-muted-foreground mb-1">
                {trmlTranslationExecution("translateImages")}
              </p>
              <p className="font-medium">
                {translateImages ? trmlCommon("yes") : trmlCommon("no")}
              </p>
            </div>

            {/* Glossary Info */}
            <div className="p-3 rounded-xl bg-secondary/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {trmlTranslationExecution("glossariesCount", { count: selectedGlossaryList.length })}
                </p>
              </div>
              {selectedGlossaryList.length === 0 ? (
                <p className="font-medium">{trmlTranslationExecution("noGlossarySelected")}</p>
              ) : (
                <div className="space-y-2">
                  {selectedGlossaryList.map((glossary) => (
                    <div
                      key={glossary.id}
                      className="p-2 rounded-lg bg-white border border-border"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{glossary.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {trmlCommon(glossary.sourceLanguage)} →{" "}
                            {trmlCommon(glossary.targetLanguage)}
                          </p>
                        </div>
                        <div className="text-xs font-medium bg-secondary px-2 py-1 rounded-md">
                          {glossary.termCount} {trmlTranslationExecution("termsCount", { count: glossary.termCount })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-3">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="mr-2 w-4 h-4" />
                {trmlCommon("back")}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onStepChange(3, false)} className="group">
                  {trmlTranslationExecution("applyToThisFile") || "Apply to this file"}
                  <Check className="ml-2 w-4 h-4 transition-transform group-hover:scale-110" />
                </Button>
                <Button onClick={() => onStepChange(3, true)} className="group">
                  {trmlTranslationExecution("applyToAllFiles") || "Apply to all files"}
                  <Check className="ml-2 w-4 h-4 transition-transform group-hover:scale-110" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Step 3: Translation Progress & Result
  return (
    <motion.div
      key="translate"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          {status === "idle" && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                {trmlTranslationExecution("translateTitle")}
              </h2>
              <p className="text-muted-foreground mb-8">
                {trmlTranslationExecution("translateDescription")}
              </p>
              <div className="flex justify-center gap-4">
                <Button size="lg" variant="outline" onClick={onBack}>
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  {trmlCommon("back")}
                </Button>
                <Button
                  size="lg"
                  onClick={onStartTranslation}
                  className="group"
                  data-tour="start-translation"
                >
                  {trmlTranslationExecution("startTranslating")}
                </Button>
              </div>
            </div>
          )}

          {status === "translating" && (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="w-20 h-20 rounded-full border-4 border-secondary border-t-primary mx-auto mb-6"
              />
              <h2 className="text-2xl font-semibold mb-2">
                {trmlTranslationExecution("translating")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {trmlTranslationExecution("processing")}
              </p>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto mb-6">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {Math.round(Math.min(progress, 100))}% {trmlTranslationExecution("complete")}
                </p>
              </div>

              {/* Cancel Button */}
              <Button
                variant="outline"
                onClick={onCancelTranslation}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="mr-2 w-4 h-4" />
                {trmlTranslationExecution("cancel")}
              </Button>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 dark:bg-green-900/20"
              >
                <Check className="w-10 h-10 text-green-600 dark:text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-semibold mb-2">
                {trmlTranslationExecution("successTitle")}
              </h2>
              <p className="text-muted-foreground mb-8">
                {trmlTranslationExecution("successDesc")}
              </p>

              {/* Result File Card */}
              {uploadedFile && (
                <div className="max-w-md mx-auto mb-8">
                  <FileCard
                    name={`${targetLanguage.toUpperCase()}-${uploadedFile.name}`}
                    size={uploadedFile.size}
                    type={uploadedFile.type}
                    status="success"
                  />
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button size="lg" onClick={onDownload}>
                  {trmlTranslationExecution("download")}
                </Button>
                <Button size="lg" variant="outline" onClick={onNewTranslation}>
                  {trmlTranslationExecution("newTranslation")}
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6 dark:bg-red-900/20"
              >
                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-500" />
              </motion.div>
              <h2 className="text-2xl font-semibold mb-2">
                {trmlTranslationExecution("errorTitle")}
              </h2>
              <p className="text-muted-foreground mb-8">
                {trmlTranslationExecution("errorDesc")}
              </p>

              <div className="flex justify-center gap-4">
                <Button size="lg" onClick={onRetry}>
                  <RotateCcw className="mr-2 w-4 h-4" />
                  {trmlTranslationExecution("tryAgain")}
                </Button>
                <Button size="lg" variant="outline" onClick={onNewTranslation}>
                  {trmlTranslationExecution("startOver")}
                </Button>
              </div>
            </div>
          )}

          {status === "cancelled" && (
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6 dark:bg-orange-900/20"
              >
                <Ban className="w-10 h-10 text-orange-600 dark:text-orange-500" />
              </motion.div>
              <h2 className="text-2xl font-semibold mb-2">
                {trmlTranslationExecution("cancelledTitle")}
              </h2>
              <p className="text-muted-foreground mb-8">
                {trmlTranslationExecution("cancelledDesc")}
              </p>

              <div className="flex justify-center gap-4">
                <Button size="lg" onClick={onBack}>
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  {trmlCommon("back")}
                </Button>
                <Button size="lg" variant="outline" onClick={onNewTranslation}>
                  {trmlTranslationExecution("newTranslation")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
