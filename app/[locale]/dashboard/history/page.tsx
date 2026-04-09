"use client";

import { useState, useEffect, use } from "react";
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
  RefreshCw,
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
import { TranslationService } from "@/api/services";
import { TranslationJobResponse, TranslationHistoryResponse, StatusEnum } from "@/lib/types";
import { getLanguageName, formatDate } from "@/lib/utils";
import { TranslationDetailDialog } from "@/components/history/translation-detail-dialog";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useTranslations } from 'next-intl';

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
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

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await TranslationService.getTranslationHistory();
      // Client-side pagination since API is currently non-paginated array
      setJobs(response);
      setPagination({
        ...pagination,
        total: response.length,
        totalPages: Math.ceil(response.length / pagination.size),
      });
    } catch (error) {
      console.error("Failed to fetch jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchTerm, statusFilter, dateRange]);

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
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Client-side filtering and pagination
  const filteredHistory = jobs
    .filter((job) => {
      const matchesStatus =
        statusFilter === "all" || job.status === statusFilter;
      // Add search logic if needed
      const matchesSearch =
        searchTerm === "" ||
        (job.sourceDocumentName || job.sourceDocument)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateRange?.from) {
        const jobDate = new Date(job.startedAt);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        matchesDate = matchesDate && jobDate >= fromDate;
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && jobDate <= toDate;
        }
      }

      return matchesStatus && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          const nameA = a.sourceDocumentName || a.sourceDocument;
          const nameB = b.sourceDocumentName || b.sourceDocument;
          comparison = nameA.localeCompare(nameB);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "date":
          const dateA = new Date(a.startedAt).getTime();
          const dateB = new Date(b.startedAt).getTime();
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const paginatedHistory = filteredHistory.slice(
      (pagination.page - 1) * pagination.size,
      pagination.page * pagination.size
  );

  const filteredTotal = filteredHistory.length;
  const filteredTotalPages = Math.ceil(filteredTotal / pagination.size);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {trmlHistory("historyTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {trmlHistory("historySubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {trmlHistory("refresh")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full sm:w-[800px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={trmlHistory("searchDocuments")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700"
          />
        </div>
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
                <TableCell colSpan={6} className="h-24 text-center">
                  {trmlHistory("loading")}
                </TableCell>
              </TableRow>
            ) : paginatedHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {trmlHistory("noHistory")}
                </TableCell>
              </TableRow>
            ) : (
              paginatedHistory.map((job) => (
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
            {trmlHistory("showing", {
              start: filteredTotal > 0 ? (pagination.page - 1) * pagination.size + 1 : 0,
              end: Math.min(pagination.page * pagination.size, filteredTotal),
              total: filteredTotal,
            })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            {trmlHistory("prev")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= filteredTotalPages}
          >
            {trmlHistory("next")}
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
