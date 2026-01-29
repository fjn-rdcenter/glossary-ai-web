"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  BookOpen,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { GlossaryService } from "@/api/services";
import { GlossaryResponse } from "@/lib/types";
import { getLanguageName, formatDate } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { useToast } from "@/components/ui/use-toast";
import { getErrorMessage } from "@/lib/error-utils";

export default function GlossariesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGlossaries, setSelectedGlossaries] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // [NEW] Error Dialog State
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");
  const { toast } = useToast();

  const fetchGlossaries = async () => {
    setLoading(true);
    try {
      // Fetch all for now. Backend supports pagination.
      // Might want to implement pagination in UI later.
      const response = await GlossaryService.getGlossaries(); 
      setGlossaries(Array.isArray(response) ? response : []);
    } catch (error) {
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlossaries();
  }, []);

  const filteredGlossaries = (glossaries || []).filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleGlossarySelection = (id: string) => {
    setSelectedGlossaries((prev) => {
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
    if (selectedGlossaries.size === filteredGlossaries.length) {
      setSelectedGlossaries(new Set());
    } else {
      setSelectedGlossaries(new Set(filteredGlossaries.map((g) => g.id)));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await GlossaryService.deleteGlossary(id);
      setGlossaries((prev) => prev.filter((g) => g.id !== id));
      setSelectedGlossaries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast({
        title: trmlGlossaries("deleted"),
        description: trmlGlossaries("deleteSuccess"),
      });
    } catch (error) {
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    }
  };

  const deleteSelectedGlossaries = async () => {
    try {
      // Delete sequentially or parallel
      await Promise.all(
        Array.from(selectedGlossaries).map((id) => GlossaryService.deleteGlossary(id))
      );
      setGlossaries((prev) => prev.filter((g) => !selectedGlossaries.has(g.id)));
      setSelectedGlossaries(new Set());
      setShowDeleteDialog(false);
      
      toast({
        title: trmlGlossaries("deleted"),
        description: trmlGlossaries("deleteSelectedSuccess", { count: selectedGlossaries.size }),
      });
    } catch (error) {
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    }
  };

  return (
    <PageTransition className="container mx-auto px-6 py-10">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">
              {trmlGlossaries("glossariesTitle")}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {trmlGlossaries("glossariesSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchGlossaries} disabled={loading} className="mr-2">
               <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
               {trmlGlossaries("refresh")}
            </Button>
            {selectedGlossaries.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 w-4 h-4" />
                {trmlGlossaries("delete")}{" "}{selectedGlossaries.size}
              </Button>
            )}
            <Button
              onClick={() => router.push("/dashboard/glossaries/new")}
              className="group"
            >
              <Plus className="mr-2 w-4 h-4" />
              {trmlGlossaries("createGlossary")}
              <ArrowRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Button>
          </div>
        </div>
      </SlideUp>

      {/* Search and Select All */}
      <SlideUp delay={0.1}>
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={trmlGlossaries("searchGlossaries")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card"
            />
          </div>
          {filteredGlossaries.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedGlossaries.size === filteredGlossaries.length &&
                  filteredGlossaries.length > 0
                }
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">{trmlGlossaries("selectAll")}</span>
            </div>
          )}
        </div>
      </SlideUp>

      {/* Glossary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
             <div className="col-span-full text-center py-10 text-muted-foreground">{trmlGlossaries("loadingList")}</div>
        ) : filteredGlossaries.map((glossary, index) => (
          <SlideUp key={glossary.id} delay={0.1 + index * 0.05}>
            <Card
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full cursor-pointer"
              onClick={() =>
                router.push(`/dashboard/glossaries/${glossary.id}`)
              }
            >
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedGlossaries.has(glossary.id)}
                      onCheckedChange={() =>
                        toggleGlossarySelection(glossary.id)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/dashboard/glossaries/${glossary.id}`)
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {trmlGlossaries("view")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/dashboard/glossaries/${glossary.id}/edit`
                          )
                        }
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {trmlGlossaries("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(glossary.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {trmlGlossaries("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-semibold text-lg text-foreground mb-1">
                  {glossary.name}
                </h3>
                <div className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 min-h-[40px]">
                  {glossary.description ? (
                    glossary.description
                  ) : (
                    <span className="italic opacity-50">{trmlGlossaries("noDescription")}</span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">
                      {glossary.termCount}
                    </span>{" "}
                    {trmlGlossaries("terms")}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>
                    {trmlCommon(glossary.sourceLanguage)} → {trmlCommon(glossary.targetLanguage)}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {trmlGlossaries("updated")} {formatDate(glossary.updatedAt)}
                </div>
              </CardContent>
            </Card>
          </SlideUp>
        ))}
      </div>

      {/* Empty State */}
      {!loading && filteredGlossaries.length === 0 && (
        <SlideUp delay={0.2}>
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {trmlGlossaries("noResults")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? trmlGlossaries("searchEmptyHint")
                : trmlGlossaries("createFirst")}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push("/dashboard/glossaries/new")}>
                <Plus className="mr-2 w-4 h-4" />
                {trmlGlossaries("create")}
              </Button>
            )}
          </div>
        </SlideUp>
      )}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedGlossaries.size === 1
                ? trmlGlossaries("deleteGlossaryConfirm")
                : trmlGlossaries("deleteGlossariesTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedGlossaries.size === 1 ? (
                trmlGlossaries("confirmDeleteGlossary", {
                  glossaryName: glossaries.find((g) => selectedGlossaries.has(g.id))?.name || "",
                })
              ) : (
                <>
                  {trmlGlossaries("deleteGlossariesConfirm", { count: selectedGlossaries.size })
                    .split(selectedGlossaries.size.toString())
                    .map((part, index, arr) => (
                      <span key={index}>
                        {part}
                        {index < arr.length - 1 && (
                          <span
                            className="font-semibold underline decoration-dotted cursor-help"
                            title={
                              glossaries.filter((g) => selectedGlossaries.has(g.id))
                                .map((g) => g.name)
                                .join("\n")}
                          >
                            {selectedGlossaries.size}
                          </span>
                        )}
                      </span>
                    ))}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{trmlCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteSelectedGlossaries}
            >
              {trmlCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
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
    </PageTransition>
  );
}
