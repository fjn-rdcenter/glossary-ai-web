"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { TranslationHistoryResponse, StatusEnum } from "@/lib/types";
import { getLanguageName, formatDate } from "@/lib/utils";

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  
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
      a.download = `translated_${filename}`; 
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
    }
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
      a.download = `original_${filename}`;  
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download original failed", error);
    }
  };

  // Client-side filtering and pagination
  const filteredHistory = jobs.filter((job) => {
     const matchesStatus =
       statusFilter === "all" || job.status === statusFilter;
      // Add search logic if needed
      const matchesSearch = searchTerm === "" || (job.sourceDocumentName || job.sourceDocument).toLowerCase().includes(searchTerm.toLowerCase());
     return matchesStatus && matchesSearch;
  });

  const paginatedHistory = filteredHistory.slice(
      (pagination.page - 1) * pagination.size,
      pagination.page * pagination.size
  );

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
            Translation History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage your past translation jobs.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button className="bg-zinc-900 text-white hover:bg-zinc-800">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-950"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-white dark:bg-zinc-950">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="translating">Translating</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
            <TableRow>
              <TableHead className="w-[300px]">Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Languages</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No translations found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedHistory.map((job) => (
                <TableRow key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]" title={job.sourceDocumentName || job.sourceDocument}>
                           {job.sourceDocumentName || job.sourceDocument}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {/* Mock size if not available */}
                          -
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
                        {getLanguageName(job.sourceLanguage)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">
                        {getLanguageName(job.targetLanguage)}
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
                          <DropdownMenuItem onClick={() => window.location.href = `/dashboard/translate?jobId=${job.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadOriginal(job)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download Original File
                          </DropdownMenuItem>
                          {job.status === "completed" && (
                            <DropdownMenuItem onClick={() => handleDownloadTranslated(job)}>
                              <Check className="mr-2 h-4 w-4" />
                              Download Translated File
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
            Showing {(pagination.page - 1) * pagination.size + 1} to {Math.min(pagination.page * pagination.size, pagination.total)} of {pagination.total} translations
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
