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
  ChevronDown,
  Book,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { GlossaryService } from "@/api/services";
import { GlossaryResponse, GlossaryTermResponse, GlossaryDetailResponse } from "@/lib/types";
import { getLanguageName } from "@/lib/utils";
import { useTranslations } from 'next-intl';
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { EditGlossaryDialog } from "@/components/glossary/edit-glossary-dialog";

export const dynamic = "force-dynamic";

export default function GlossaryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const [glossary, setGlossary] = useState<GlossaryResponse | null>(null);
  const [terms, setTerms] = useState<GlossaryTermResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Collapsible basic info state
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");
  const { toast } = useToast();

  // Deletion state
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // Error Dialog State
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
  }, [id, page, pageSize]);

  const fetchGlossaryData = async () => {
    setLoading(true);
    try {
      const [glossaryData, permissionData] = await Promise.all([
        GlossaryService.getGlossaryById(id, { page, size: pageSize }),
        GlossaryService.getMyPermission(id).catch(() => ({ permission: "view" as const }))
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

  const confirmDeleteGlossary = async () => {
    if (!glossary) return;

    try {
      await GlossaryService.deleteGlossary(glossary.id);
      router.push("/dashboard/glossaries");
      toast({
        title: trmlGlossaries("deleted"),
        description: trmlGlossaries("confirmDeleteGlossary", { glossaryName: glossary.name }),
      });
    } catch (error) {
      console.error("Delete failed", error);
      setErrorDialog({
        open: true,
        message: getErrorMessage(error),
      });
    } finally {
      setShowDeleteWarning(false);
    }
  };

  const handleEditSuccess = (updatedGlossary: GlossaryDetailResponse) => {
    // Refresh data after edit
    fetchGlossaryData();
  };

  if (id === "new") return null;

  if (loading && !glossary) {
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
    <PageTransition className="container mx-auto px-6">
      {/* Header */}
      <SlideUp>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
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
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
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
                    {trmlGlossaries("deleteGlossaryConfirm")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {trmlGlossaries("confirmDeleteGlossary", { glossaryName: glossary.name })}
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
                    onClick={confirmDeleteGlossary}
                  >
                    {trmlGlossaries("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SlideUp>

      {/* Main Content Grid */}
      <div className="grid gap-6 items-start grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Basic Info + Terms */}
        <div className="space-y-6 lg:col-span-8">
          {/* Terms Table */}
          <SlideUp delay={0.2}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{trmlGlossaries("terms")}</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={trmlGlossaries("searchTerms")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-muted/40 border-border/50 hover:bg-muted/60 focus-visible:bg-background focus-visible:border-primary transition-colors shadow-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                          className="border-b border-border last:border-0 transition-all duration-300 hover:bg-primary/5 hover:shadow-[inset_3px_0_0_0_hsl(var(--primary))] group cursor-default"
                        >
                          <TableCell className="font-medium transition-colors duration-300 group-hover:text-primary">
                            {term.source}
                          </TableCell>
                          <TableCell>
                            <ArrowRight className="w-4 h-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-2 group-hover:text-primary" />
                          </TableCell>
                          <TableCell className="transition-colors duration-300 group-hover:text-primary">{term.target}</TableCell>
                        </motion.tr>
                      ))}
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
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
        </div>

        {/* Right Column: Summary (view-only) */}
        <div className="space-y-6 sticky top-6 lg:col-span-4">
          <SlideUp delay={0.15}>
            <Card className="sticky top-24 border border-border shadow-sm bg-card overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Book className="w-4 h-4 text-primary" />
                  {trmlGlossaries("basicInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {trmlGlossaries("name")}
                  </span>
                  <span className="text-sm font-medium text-foreground leading-snug">
                    {glossary.name}
                  </span>
                </div>

                {/* Language Pair */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" />
                    {trmlGlossaries("languagePair")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 rounded-md border border-border/50 shadow-sm text-sm font-medium text-foreground">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {trmlCommon(glossary.sourceLanguage) || "?"}
                    </div>
                    <span className="text-muted-foreground/60">→</span>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 rounded-md border border-border/50 shadow-sm text-sm font-medium text-foreground">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {trmlCommon(glossary.targetLanguage) || "?"}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {trmlGlossaries("description")}
                  </span>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {glossary.description ? (
                      <span className="line-clamp-3">{glossary.description}</span>
                    ) : (
                      <span className="italic opacity-50">{trmlGlossaries("noDescription") || "No description"}</span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-4 mt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{trmlGlossaries("totalTerms")}</span>
                    <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md text-primary">
                      <span className="text-sm font-bold font-mono">{glossary.termCount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>
        </div>
      </div>

      {/* Edit Glossary Dialog */}
      <EditGlossaryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        glossaryId={glossary.id}
        onSuccess={handleEditSuccess}
      />

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
