"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Search,
  MoveRight,
  Book,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GlossaryService } from "@/api/services";
import { GlossaryResponse, TermResponse } from "@/lib/types";
import { useTranslations } from "next-intl";

interface GlossaryPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  glossaryId: string | null;
}

export function GlossaryPreviewDialog({
  open,
  onOpenChange,
  glossaryId,
}: GlossaryPreviewDialogProps) {
  const trmlCommon = useTranslations("Common");
  const trmlGlossarySelection = useTranslations("GlossarySelection");

  const [loading, setLoading] = useState(false);
  const [glossary, setGlossary] = useState<GlossaryResponse | null>(null);
  const [terms, setTerms] = useState<TermResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (!open || !glossaryId) {
      setGlossary(null);
      setTerms([]);
      setSearchQuery("");
      setCurrentPage(1);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchFullGlossary = async (id: string) => {
      try {
        const firstPage = await GlossaryService.getGlossaryById(id, { size: 100, page: 1 });
        if (!isMounted) return;

        let allTerms = firstPage.terms?.items || [];
        const totalPages = firstPage.terms?.pages || 1;

        if (totalPages > 1) {
          const pagePromises = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(GlossaryService.getGlossaryById(id, { size: 100, page: p }));
          }
          const restPages = await Promise.all(pagePromises);
          if (!isMounted) return;

          allTerms = [
            ...allTerms,
            ...restPages.flatMap((p) => p.terms?.items || []),
          ];
        }

        setGlossary(firstPage);
        setTerms(allTerms);
      } catch (err) {
        console.error("Failed to load glossary preview:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullGlossary(glossaryId);

    return () => {
      isMounted = false;
    };
  }, [open, glossaryId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return terms;
    const query = searchQuery.toLowerCase().trim();
    return terms.filter(
      (t) =>
        t.source.toLowerCase().includes(query) ||
        t.target.toLowerCase().includes(query)
    );
  }, [terms, searchQuery]);

  const totalItems = filteredTerms.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const pagedTerms = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTerms.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTerms, currentPage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-full max-h-[85vh] flex flex-col p-6 gap-0 bg-white shadow-2xl overflow-hidden sm:rounded-xl">
        <DialogHeader className="pb-3 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            {glossary?.name || trmlGlossarySelection("termsPreview")}
          </DialogTitle>
          {glossary && (
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {trmlCommon(glossary.sourceLanguage || "")} → {trmlCommon(glossary.targetLanguage || "")} • {terms.length} terms
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Search */}
        <div className="relative my-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            name="preview-term-search"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={trmlGlossarySelection("termsSearchPlaceholder")}
            className="h-9 w-full rounded-md border border-border bg-muted/20 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-colors"
          />
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 rounded-xl border border-primary/10 p-3 flex flex-col justify-between">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs">{trmlCommon("loading")}</p>
            </div>
          ) : filteredTerms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
              <Book className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-xs italic">{trmlGlossarySelection("noTermsDisplay")}</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {pagedTerms.map((term, idx) => (
                <div
                  key={term.id || idx}
                  className="px-4 py-2.5 rounded-xl border bg-card border-primary/20 hover:border-primary/45 hover:bg-slate-50/50 grid grid-cols-[1fr_24px_1fr] gap-4 items-center transition-all shadow-sm"
                >
                  <div className="font-semibold text-xs text-foreground truncate" title={term.source}>
                    {term.source}
                  </div>
                  <MoveRight className="w-3.5 h-3.5 text-muted-foreground/30 mx-auto" />
                  <div className="text-primary font-semibold text-xs truncate text-right md:text-left" title={term.target}>
                    {term.target}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination & Footer */}
        {!loading && totalItems > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
            <span className="text-xs text-muted-foreground">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium min-w-[48px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
