"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Search,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { GlossaryResponse, GlossaryTermResponse } from "@/api/types";
import { getLanguageName } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";

export const dynamic = "force-dynamic";

export default function GlossaryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const [glossary, setGlossary] = useState<GlossaryResponse | null>(null);
  const [terms, setTerms] = useState<GlossaryTermResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");
  const { toast } = useToast();

  // Selection & Deletion state
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleteAction, setDeleteAction] = useState<"glossary" | "terms" | null>(
    null
  );

  // [NEW] Error Dialog State
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });


  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTerms, setTotalTerms] = useState(0);
  const [myPermission, setMyPermission] = useState<string | null>(null);

  const isOwner = myPermission === "owner" || myPermission === "admin";

  useEffect(() => {
    if (id === "new") {
      router.replace("/dashboard/glossaries/new");
      return;
    }
    fetchGlossaryData();
  }, [id, page, pageSize]); // Add page and pageSize dependencies

  const fetchGlossaryData = async () => {
    setLoading(true);
    try {
      // Fetch Glossary Details and my permission
      const [glossaryData, permissionData] = await Promise.all([
        GlossaryService.getGlossaryById(id, { page, size: pageSize }),
        GlossaryService.getMyPermission(id).catch(() => ({ permission: "view" as const })) // Fallback to view if error
      ]);

      setGlossary(glossaryData);
      setMyPermission(permissionData.permission);

      if (glossaryData.terms) {
        setTerms(glossaryData.terms.items);
        setTotalPages(glossaryData.terms.pages || 1);
        setTotalTerms(glossaryData.terms.total || 0);
      } else {
        setTerms([]);
        setTotalPages(1);
        setTotalTerms(0);
      }

    } catch (error) {
      console.error("Failed to fetch glossary details", error);
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const filteredTerms = terms.filter(
    (term) =>
      term.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.target.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTermSelection = (termId: string) => {
    setSelectedTerms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(termId)) {
        newSet.delete(termId);
      } else {
        newSet.add(termId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTerms.size === filteredTerms.length) {
      setSelectedTerms(new Set());
    } else {
      setSelectedTerms(new Set(filteredTerms.map((t) => t.id)));
    }
  };

  const handleDeleteSelected = () => {
    setDeleteAction("terms");
    setShowDeleteWarning(true);
  };

  const confirmDelete = async () => {
    if (!glossary) return;

    try {
      if (
        deleteAction === "glossary" ||
        (deleteAction === "terms" && selectedTerms.size === terms.length && terms.length > 0)
      ) {
        // Delete entire glossary
        await GlossaryService.deleteGlossary(glossary.id);
        router.push("/dashboard/glossaries");
        toast({
          title: trmlGlossaries("deleted"),
          description: trmlGlossaries("confirmDeleteGlossary", { glossaryName: glossary.name }),
        });
      } else if (deleteAction === "terms") {
        // Delete specific terms
        await Promise.all(
          Array.from(selectedTerms).map(termId =>
            GlossaryService.deleteTerm(glossary.id, termId)
          )
        );

        // Refresh or local update
        setTerms((prev) => prev.filter((t) => !selectedTerms.has(t.id)));
        setSelectedTerms(new Set());

        // Also update glossary term count if possible or refetch
        fetchGlossaryData();

        toast({
          title: trmlGlossaries("deleted"),
          description: trmlGlossaries("confirmDeleteCount", { count: selectedTerms.size }),
        });
      }
    } catch (error) {
      console.error("Delete failed", error);
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setShowDeleteWarning(false);
      setDeleteAction(null);
    }
  };

  if (id === "new") return null;

  if (loading && !glossary) { // Only show full loading if glossary not loaded yet
    return (
      <div className="container mx-auto px-6 py-10 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">{trmlGlossaries("loading")}</p>
      </div>
    );
  }

  if (!glossary) {
    return (
      <div className="container mx-auto px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold">{trmlGlossaries("notFound")}</h1>
        <Button
          className="mt-4"
          onClick={() => router.push("/dashboard/glossaries")}
        >
          {trmlGlossaries("backToList")}
        </Button>
      </div>
    );
  }

  return (
    <PageTransition className="container mx-auto px-6 py-10">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-serif font-semibold text-foreground">
                {glossary.name}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {trmlCommon(glossary.sourceLanguage)} → {trmlCommon(glossary.targetLanguage)} •{" "}
                {glossary.termCount}{" "}{trmlGlossaries("terms")}
              </p>
              {/* Description - moved here */}
              <div className="mt-2 text-sm italic text-muted-foreground/80 max-w-2xl">
                {glossary.description || trmlGlossaries("noDescription")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedTerms.size > 0 && (
              <Button variant="destructive" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 w-4 h-4" />
                {trmlGlossaries("delete")}{" "}{selectedTerms.size}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/glossaries/${id}/edit`)}
              disabled={!isOwner}
            >
              <Edit className="mr-2 w-4 h-4" />
              {trmlGlossaries("edit")}
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive bg-transparent"
              disabled={!isOwner}
              onClick={() => {
                setDeleteAction("glossary");
                setShowDeleteWarning(true);
              }}
            >
              <Trash2 className="mr-2 w-4 h-4" />
              {trmlGlossaries("deleteGlossary")}
            </Button>

            <AlertDialog
              open={showDeleteWarning}
              onOpenChange={setShowDeleteWarning}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {deleteAction === "glossary" ||
                      (deleteAction === "terms" &&
                        selectedTerms.size === terms.length && terms.length > 0)
                      ? trmlGlossaries("deleteGlossaryConfirm")
                      : trmlGlossaries("deleteSelectedTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteAction === "glossary"
                      ? trmlGlossaries("confirmDeleteGlossary", { glossaryName: glossary.name })
                      : selectedTerms.size === terms.length && terms.length > 0
                        ? trmlGlossaries("confirmDeleteAllTerms", { glossaryName: glossary.name })
                        : trmlGlossaries("confirmDeleteCount", { count: selectedTerms.size })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setShowDeleteWarning(false)}
                  >
                    {trmlCommon("cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={confirmDelete}
                  >
                    {trmlGlossaries("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SlideUp>

      {/* Terms Table */}
      <SlideUp delay={0.2}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Terms</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={trmlGlossaries("searchTerms")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedTerms.size === filteredTerms.length &&
                          filteredTerms.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-medium">
                      {trmlCommon(glossary.sourceLanguage) ?? glossary.sourceLanguage}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="font-medium">
                      {trmlCommon(glossary.targetLanguage) ?? glossary.targetLanguage}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTerms.map((term, index) => (
                    <motion.tr
                      key={term.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-border last:border-0 transition-colors"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedTerms.has(term.id)}
                          onCheckedChange={() =>
                            toggleTermSelection(term.id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {term.source}
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>{term.target}</TableCell>
                    </motion.tr>
                  ))}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredTerms.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{trmlGlossaries("noTermsFound")}</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalTerms > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {trmlGlossaries("showing", {
                    start: ((page - 1) * pageSize) + 1,
                    end: Math.min(page * pageSize, totalTerms),
                    total: totalTerms,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={page === 1 || loading}
                  >
                    {trmlCommon("previous")}
                  </Button>
                  <div className="text-sm font-medium">
                    {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={page >= totalPages || loading}
                  >
                    {trmlCommon("next")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </SlideUp>

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
