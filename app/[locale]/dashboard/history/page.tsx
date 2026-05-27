"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  ArrowUpDown,
  FileText,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/ui/page-transition";
import { PageHeader } from "@/components/ui/page-header";
import { TranslationService } from "@/api/services";
import { TranslationJobResponse, TranslationHistoryResponse, StatusEnum } from "@/lib/types";
import { getLanguageName, formatDate } from "@/lib/utils";
import { TranslationDetailDialog } from "@/components/history/translation-detail-dialog";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useTranslations } from 'next-intl';

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<TranslationJobResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortField, setSortField] = useState<"name" | "status" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const trmlCommon = useTranslations("Common");
  const trmlHistory = useTranslations("History");
  
  // Real data states
  const [jobs, setJobs] = useState<TranslationHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
    total: 0,
    totalPages: 0,
  });

  const lastFiltersRef = useRef({ search: searchQuery, status: statusFilter, dateRange });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm);
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let startedFrom: string | undefined = undefined;
      let startedTo: string | undefined = undefined;

      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        startedFrom = fromDate.toISOString();
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        startedTo = toDate.toISOString();
      }

      const getApiSortField = (field: "name" | "status" | "date") => {
        switch (field) {
          case "name":
            return "sourceDocumentName";
          case "status":
            return "status";
          case "date":
            return "startedAt";
        }
      };

      const apiSort = `${getApiSortField(sortField)}:${sortOrder}`;

      const response = await TranslationService.getTranslationHistory({
        page: pagination.page,
        size: pagination.size,
        sort: apiSort,
        search: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        startedFrom,
        startedTo,
      });

      setJobs(response.items || []);
      setPagination((prev) => ({
        ...prev,
        total: response.total || 0,
        totalPages: response.pages || 1,
      }));
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtersChanged =
      lastFiltersRef.current.search !== searchQuery ||
      lastFiltersRef.current.status !== statusFilter ||
      lastFiltersRef.current.dateRange?.from !== dateRange?.from ||
      lastFiltersRef.current.dateRange?.to !== dateRange?.to;

    if (filtersChanged) {
      lastFiltersRef.current = { search: searchQuery, status: statusFilter, dateRange };
      if (pagination.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }));
        return;
      }
    }

    fetchJobs();
  }, [pagination.page, pagination.size, sortField, sortOrder, searchQuery, statusFilter, dateRange]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const handleDownloadTranslated = async (job: TranslationHistoryResponse) => {
    if (job.status !== "completed") return;
    try {
      const blob = await TranslationService.downloadTranslatedDocument(job.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.href = url;
      // Use sourceDocumentName for filename if available, else ID
      const filename = job.sourceDocumentName || job.sourceDocument;
      a.download = `${job.targetLanguage.toUpperCase()}-${filename}`; 
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const handleView = (job: TranslationJobResponse) => {
    setSelectedJob(job);
    setDetailOpen(true);
  };

  const handleDownloadOriginal = async (job: TranslationHistoryResponse) => {
    try {
      // Use sourceDocument if available, otherwise fallback to id (less reliable but usually unrelated)
      // Actually sourceDocument alias is present in the interface
      const docId = job.sourceDocument || job.id; 
      const blob = await TranslationService.downloadOriginalDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = job.sourceDocumentName || job.sourceDocument;
      a.download = `${filename}`;  
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download original failed", error);
    }
  };

  const handleSort = (field: "name" | "status" | "date") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      setPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      setSortField(field);
      setSortOrder("asc");
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100/80";
      case "translating":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100/80";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100/80";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100/80";
      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-100/80";
    }
  };

  return (
    <PageTransition className="space-y-6">
      <PageHeader
        title={trmlHistory("historyTitle")}
        subtitle={trmlHistory("historySubtitle")}
        backUrl="/dashboard"
        onRefresh={fetchJobs}
        refreshLoading={loading}
        refreshLabel={trmlHistory("refresh")}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm w-full">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-[800px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={trmlHistory("searchDocuments")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 w-full"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSearchQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                title={trmlCommon("clear")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" variant="default" className="shrink-0">
            {trmlCommon("search")}
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
              title={trmlCommon("clear")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder={trmlHistory("status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{trmlHistory("allStatus")}</SelectItem>
              <SelectItem value="completed">{trmlHistory("statusCompleted")}</SelectItem>
              <SelectItem value="translating">{trmlHistory("statusTranslating")}</SelectItem>
              <SelectItem value="pending">{trmlHistory("statusPending")}</SelectItem>
              <SelectItem value="failed">{trmlHistory("statusFailed")}</SelectItem>
            </SelectContent>
          </Select>
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
                  {trmlHistory("colDocument")}
                  <ArrowUpDown className={`h-4 w-4 ${sortField === "name" ? "opacity-100" : "opacity-30"}`} />
                </Button>
              </TableHead>
              <TableHead className="w-[120px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("status")}
                  className="flex items-center gap-1 p-0 font-medium hover:bg-transparent text-muted-foreground hover:text-foreground"
                >
                  {trmlHistory("status")}
                  <ArrowUpDown className={`h-4 w-4 ${sortField === "status" ? "opacity-100" : "opacity-30"}`} />
                </Button>
              </TableHead>
              <TableHead className="w-[200px]">{trmlHistory("colLanguages")}</TableHead>
              <TableHead className="w-[150px]">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("date")}
                  className="flex items-center gap-1 p-0 font-medium hover:bg-transparent text-muted-foreground hover:text-foreground"
                >
                  {trmlHistory("colDate")}
                  <ArrowUpDown className={`h-4 w-4 ${sortField === "date" ? "opacity-100" : "opacity-30"}`} />
                </Button>
              </TableHead>
              <TableHead className="w-[70px] text-right">{trmlHistory("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {trmlHistory("loading")}
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {trmlHistory("noHistory")}
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[400px]" title={job.sourceDocumentName || job.sourceDocument}>
                           {job.sourceDocumentName || job.sourceDocument}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getStatusColor(
                        job.status
                      )} border-0 font-medium`}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">
                        {trmlCommon(job.sourceLanguage)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">
                        {trmlCommon(job.targetLanguage)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                       {formatDate(job.startedAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleView(job)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {trmlHistory("viewDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadOriginal(job)}>
                              <Download className="mr-2 h-4 w-4" />
                              {trmlHistory("downloadOriginal")}
                          </DropdownMenuItem>
                          {job.status === "completed" && (
                            <DropdownMenuItem onClick={() => handleDownloadTranslated(job)}>
                              <Check className="mr-2 h-4 w-4" />
                              {trmlHistory("downloadTranslated")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

       {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-xs text-muted-foreground">
            {trmlHistory("showing", {
              start: pagination.total > 0 ? (pagination.page - 1) * pagination.size + 1 : 0,
              end: Math.min(pagination.page * pagination.size, pagination.total),
              total: pagination.total,
            })}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium min-w-[48px] text-center">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {selectedJob && (
        <TranslationDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          job={selectedJob}
          onDownloadTranslated={() => handleDownloadTranslated(selectedJob)}
          onDownloadOriginal={() => handleDownloadOriginal(selectedJob)}
        />
      )}
    </PageTransition>
  );
}
