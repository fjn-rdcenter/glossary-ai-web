"use client";

import { useEffect, useState } from "react";
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
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { DocumentService } from "@/api/services";
import { toast } from "sonner";
import { SourceDocumentResponse, SourceDocumentSortField } from "@/lib/types";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
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
  const [isFetching, setIsFetching] = useState(false); 
  
  // Pagination / Filter / Sort State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState<SourceDocumentSortField>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchDocument, setSearchDocument] = useState("");
  const [debouncedSearchDocument, setDebouncedSearchDocument] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchDocument(searchDocument);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchDocument]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchDocument, dateRange]);

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsFetching(true);
      }
      
      // Fetch all documents (simulated with large size) for client-side filtering
      const result = await DocumentService.getSourceDocuments(
        1,
        100, // Large size to fetch "all" (Limit to 100 to avoid backend validation error)
        "uploadedAt",
        "desc"
      );
      setAllData(result.items);
    } catch (error) {
      console.error(error);
      toast.error(t("fetchError"));
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData(true);
  }, []);

  // Client-side Filtering, Sorting, and Pagination
  const filteredData = allData.filter((doc) => {
    const matchesSearch = 
      debouncedSearchDocument === "" ||
      doc.name.toLowerCase().includes(debouncedSearchDocument.toLowerCase());

    let matchesDate = true;
    if (dateRange?.from) {
      const docDate = new Date(doc.uploadedAt);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && docDate >= fromDate;

      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && docDate <= toDate;
      }
    }

    return matchesSearch && matchesDate;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "uploadedAt":
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        break;
      case "size":
        comparison = a.size - b.size;
        break;
      case "usageCount":
        comparison = (a.usageCount || 0) - (b.usageCount || 0);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = sortedData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleSort = (field: SourceDocumentSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      await DocumentService.deleteDocument(documentToDelete);
      toast.success(t("deleteSuccess"));
      fetchData(false);
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

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(false)} disabled={isFetching || loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", (isFetching || loading) ? "animate-spin" : "")} />
            {tCommon("refresh") || "Refresh"}
          </Button>
        </div>
      </div>

      {/* Search Bar matching HistoryPage Style */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full sm:w-[800px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchDocuments")}
            value={searchDocument}
            onChange={(e) => setSearchDocument(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
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
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("noDocuments")}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((doc) => (
                <TableRow key={doc.id} className={isFetching ? "opacity-50 transition-opacity" : "transition-opacity"}>
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
                    {format(new Date(doc.uploadedAt), "MMM d, yyyy HH:mm")}
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

      {/* Pagination matching HistoryPage Style */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
             {t("showing", {
                  start: totalItems === 0 ? 0 : (page - 1) * pageSize + 1,
                  end: Math.min(page * pageSize, totalItems),
                  total: totalItems,
              }) || tCommon("pageOf", { current: page, total: Math.max(totalPages, 1) })}
        </div>
        <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
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
