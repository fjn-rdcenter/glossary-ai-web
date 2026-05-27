"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  Trash2,
  FileText,
  ArrowUpDown,
  Search,
  Filter,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { DocumentService } from "@/api/services";
import { toast } from "sonner";
import { SourceDocumentResponse, SourceDocumentSortField } from "@/lib/types";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
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
import { formatBytes, cn } from "@/lib/utils";

export function SourceDocumentTable() {
  const t = useTranslations("Documents");
  const tCommon = useTranslations("Common");

  // State for all data and display data
  const [allData, setAllData] = useState<SourceDocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
    totalPages: 0,
  });

  // Pagination / Filter / Sort State
  const [sortField, setSortField] = useState<SourceDocumentSortField>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchDocument, setSearchDocument] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const lastFiltersRef = useRef({ search: searchQuery, dateRange });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchDocument);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      let uploadedFrom: string | undefined = undefined;
      let uploadedTo: string | undefined = undefined;

      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        uploadedFrom = fromDate.toISOString();
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        uploadedTo = toDate.toISOString();
      }

      const result = await DocumentService.getSourceDocuments(
        pagination.page,
        pagination.size,
        sortField,
        sortOrder,
        searchQuery || undefined,
        uploadedFrom,
        uploadedTo
      );

      setAllData(result.items || []);
      setPagination((prev) => ({
        ...prev,
        total: result.total || 0,
        totalPages: result.pages || 1,
      }));
    } catch (error) {
      console.error(error);
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtersChanged =
      lastFiltersRef.current.search !== searchQuery ||
      lastFiltersRef.current.dateRange?.from !== dateRange?.from ||
      lastFiltersRef.current.dateRange?.to !== dateRange?.to;

    if (filtersChanged) {
      lastFiltersRef.current = { search: searchQuery, dateRange };
      if (pagination.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }));
        return;
      }
    }

    fetchData();
  }, [pagination.page, pagination.size, sortField, sortOrder, searchQuery, dateRange]);

  const handleSort = (field: SourceDocumentSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on sort change
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await DocumentService.deleteDocument(documentToDelete);
      toast.success(t("deleteSuccess"));
      // Refetch current page after deletion
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(t("deleteError"));
    } finally {
      setDocumentToDelete(null);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const blob = await DocumentService.downloadDocument(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      toast.error(t("downloadError"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("description")}
        backUrl="/dashboard"
        onRefresh={() => fetchData()}
        refreshLoading={loading}
        refreshLabel={tCommon("refresh") || "Refresh"}
      />

      {/* Search Bar matching HistoryPage Style */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm w-full">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-[800px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchDocuments")}
              value={searchDocument}
              onChange={(e) => setSearchDocument(e.target.value)}
              className="pl-9 pr-9 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 w-full"
              aria-label={t("searchDocuments")}
            />
            {searchDocument && (
              <button
                type="button"
                onClick={() => {
                  setSearchDocument("");
                  setSearchQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                title={tCommon("clear")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="default" className="shrink-0">
            {tCommon("search")}
          </Button>
        </form>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          {dateRange && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDateRange(undefined)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title={tCommon("clear")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%] min-w-[300px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 p-0 font-medium hover:bg-transparent text-muted-foreground hover:text-foreground"
                >
                  {t("columns.name")}
                  <ArrowUpDown className={cn("h-4 w-4", sortField === "name" ? "opacity-100" : "opacity-30")} />
                </Button>
              </TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("uploadedAt")}
                  className="flex items-center gap-1 p-0 font-medium hover:bg-transparent text-muted-foreground hover:text-foreground"
                >
                  {t("columns.uploadedAt")}
                  <ArrowUpDown className={cn("h-4 w-4", sortField === "uploadedAt" ? "opacity-100" : "opacity-30")} />
                </Button>
              </TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("size")}
                  className="flex items-center gap-1 p-0 font-medium hover:bg-transparent text-muted-foreground hover:text-foreground"
                >
                  {t("columns.size")}
                  <ArrowUpDown className={cn("h-4 w-4", sortField === "size" ? "opacity-100" : "opacity-30")} />
                </Button>
              </TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("usageCount")}
                  className="flex items-center gap-1 p-0 font-medium hover:bg-transparent text-muted-foreground hover:text-foreground"
                >
                  {t("columns.usageCount")}
                  <ArrowUpDown className={cn("h-4 w-4", sortField === "usageCount" ? "opacity-100" : "opacity-30")} />
                </Button>
              </TableHead>
              <TableHead className="w-[70px] text-right">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {tCommon("loading")}...
                </TableCell>
              </TableRow>
            ) : allData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("noDocuments")}
                </TableCell>
              </TableRow>
            ) : (
              allData.map((doc) => (
                <TableRow key={doc.id} className="transition-opacity">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="truncate max-w-[400px]" title={doc.name}>
                        {doc.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }).format(new Date(doc.uploadedAt))}
                  </TableCell>
                  <TableCell>{formatBytes(doc.size)}</TableCell>
                  <TableCell>{doc.usageCount}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{tCommon("openMenu")}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleDownload(doc.id, doc.name)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {tCommon("download")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDocumentToDelete(doc.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {t("showing", {
            start: pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.size + 1,
            end: Math.min(pagination.page * pagination.size, pagination.total),
            total: pagination.total,
          }) || tCommon("pageOf", { current: pagination.page, total: Math.max(pagination.totalPages, 1) })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            {tCommon("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            {tCommon("next")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog
        open={!!documentToDelete}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
