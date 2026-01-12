"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TranslationService, GlossaryService } from "@/api/services";
import {
  Upload,
  FileText,
  BookOpen,
  History,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { FileCard } from "@/components/file-card";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [stats, setStats] = useState({
    totalTranslations: 0,
    activeGlossaries: 0,
    translationsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch stats on load
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [jobs, glossaries] = await Promise.all([
          TranslationService.getTranslationHistory(),
          GlossaryService.getGlossaries(),
        ]);

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const jobsThisMonth = jobs.filter((job) => {
          const dateStr = job.submittedAt || job.startedAt;
          if (!dateStr) return false;
          const jobDate = new Date(dateStr);
          return (
            jobDate.getMonth() === thisMonth &&
            jobDate.getFullYear() === thisYear
          );
        }).length;

        setStats({
          totalTranslations: jobs.length,
          activeGlossaries: glossaries.length,
          translationsThisMonth: jobsThisMonth,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Clear all translation process states when dashboard loads
  useEffect(() => {
    // Clear all translation-related sessionStorage
    sessionStorage.removeItem("uploadedFile");
    sessionStorage.removeItem("pendingUploadFile");
    sessionStorage.removeItem("documentId");
    sessionStorage.removeItem("jobId");
    sessionStorage.removeItem("currentStep");
    sessionStorage.removeItem("sourceLanguage");
    sessionStorage.removeItem("targetLanguage");
    sessionStorage.removeItem("glossaryOption");
    sessionStorage.removeItem("selectedGlossaries");

    // Clear any pending file in global scope
    if (typeof window !== "undefined") {
      delete (window as any).__pendingFile;
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.ms-word.document.macroEnabled.12": [".docm"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template":
        [".dotx"],
      "application/vnd.ms-word.template.macroEnabled.12": [".dotm"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
    },
    multiple: false,
  });

  const handleContinue = () => {
    if (files.length > 0) {
      // Store file metadata and set a flag that we're coming from dashboard with a file
      sessionStorage.setItem(
        "pendingUploadFile",
        JSON.stringify({
          name: files[0].name,
          size: files[0].size,
          type: files[0].type,
        })
      );
      // Store the actual file temporarily in a way the next page can access
      // We'll use a global variable as a workaround since File objects can't be serialized
      if (typeof window !== "undefined") {
        (window as any).__pendingFile = files[0];
      }
      router.push("/dashboard/translate");
    }
  };

  const removeFile = () => {
    setFiles([]);
  };

  const currentStats = [
    {
      label: "Total Translations",
      value: loading ? "..." : stats.totalTranslations.toLocaleString(),
      change: "Lifetime",
      icon: FileText,
      trend: "neutral",
    },
    {
      label: "Active Glossaries",
      value: loading ? "..." : stats.activeGlossaries.toString(),
      change: "Total",
      icon: BookOpen,
      trend: "neutral",
    },
    {
      label: "Translations This Month",
      value: loading ? "..." : stats.translationsThisMonth.toString(),
      change: "This Month",
      icon: Calendar,
      trend: "neutral",
    },
  ];

  return (
    <PageTransition className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your translation activities and performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/dashboard/history">
              <History className="w-4 h-4" />
              Full History
            </Link>
          </Button>
          <Button
            className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800"
            asChild
          >
            <Link href="/dashboard/translate">
              <Upload className="w-4 h-4" />
              New Translation
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {currentStats.map((stat, i) => {
          // Determine the navigation path based on the stat label
          let href = "/dashboard/history";
          if (stat.label === "Active Glossaries") {
            href = "/dashboard/glossaries";
          } else if (stat.label === "Translations This Month") {
            href = "/dashboard/history?filter=month";
          }

          return (
            <SlideUp key={stat.label} delay={i * 0.1}>
              <Link href={href}>
                <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span
                        className={cn(
                          "font-medium",
                          stat.trend === "up"
                            ? "text-green-600"
                            : stat.trend === "down"
                            ? "text-red-600"
                            : "text-zinc-500"
                        )}
                      >
                        {stat.change}
                      </span>{" "}
                      {/* from last month - Removed specific comparison */}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </SlideUp>
          );
        })}
      </div>

      <div className="space-y-6 max-w-full">
        {/* Quick Upload */}
        <Card className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
          <CardHeader>
            <CardTitle>Quick Upload</CardTitle>
            <CardDescription>
              Drag and drop documents here to start a new translation
              immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {files.length === 0 ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div
                    {...getRootProps()}
                    className={cn(
                      "w-full rounded-xl p-10 cursor-pointer flex flex-col items-center justify-center text-center gap-4 min-h-[200px]",
                      "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm",
                      "hover:border-primary/50 hover:shadow-md",
                      isDragActive && "border-primary ring-2 ring-primary/20"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <p className="text-lg font-medium">
                        {isDragActive
                          ? "Drop your files here"
                          : "Click or drag files to upload"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PDF, DOCX, PowerPoint • Up to 50MB per file
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="files"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 max-w-2xl mx-auto"
                >
                  {files.map((file, index) => (
                    <FileCard
                      key={index}
                      name={file.name}
                      size={file.size}
                      type={file.type}
                      status="success"
                      onRemove={() =>
                        setFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                    />
                  ))}

                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleContinue}
                      size="lg"
                      className="min-w-[220px] gap-2"
                    >
                      Translate {files.length} file{files.length > 1 && "s"}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
