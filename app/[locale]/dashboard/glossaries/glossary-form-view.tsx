"use client";

import {
  ArrowRight,
  Check,
  FileText,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {useLocale} from "next-intl";
import {useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode} from "react";
import {useDropzone} from "react-dropzone";
import {GlossaryService} from "@/api";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Skeleton} from "@/components/ui/skeleton";
import {Link, useRouter} from "@/i18n/routing";
import {SUPPORTED_LANGUAGES, type SupportedLanguageCode} from "@/lib/constants";
import type {GlossaryResponse, GlossaryTermResponse} from "@/lib/types";
import {
  glossaryCopy,
  normalizeGlossaryLanguage,
  resolveGlossaryLocale,
} from "./glossary-copy";
import {GlossaryLanguage, GlossaryPageFrame} from "./glossary-shared";

type GlossaryFormMode = "create" | "edit";

type EditableTerm = {
  id?: string;
  isNew?: boolean;
  key: string;
  source: string;
  target: string;
};

export type GlossaryFormInitialValues = {
  description?: string;
  name?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  terms?: Array<{source: string; target: string}>;
};

type GlossaryFormViewProps = {
  embedded?: boolean;
  glossaryId?: string;
  initialValues?: GlossaryFormInitialValues;
  lockLanguages?: boolean;
  mode: GlossaryFormMode;
  onCancel?: () => void;
  onSaved?: (glossary: GlossaryResponse) => void;
};

function GlossaryFormFrame({
  children,
  embedded,
  localePath,
}: {
  children: ReactNode;
  embedded: boolean;
  localePath: `dashboard/glossaries${string}`;
}) {
  if (embedded) return <div className="relative">{children}</div>;
  return <GlossaryPageFrame localePath={localePath} pageType="form">{children}</GlossaryPageFrame>;
}

function GlossaryFormSkeleton({embedded, label}: {embedded: boolean; label: string}) {
  return (
    <div aria-label={label} aria-live="polite" role="status">
      <span className="sr-only">{label}</span>
      {!embedded ? (
        <>
          <Skeleton className="h-3 w-44" />
          <Skeleton className="mt-5 h-9 w-full max-w-[420px]" />
          <Skeleton className="mt-2 h-3 w-full max-w-[560px]" />
        </>
      ) : null}

      <div className={(embedded ? "mt-0" : "mt-7") + " rounded-[8px] border border-[#d9d3e1] bg-white/92 p-5 sm:p-6"}>
        <Skeleton className="h-3 w-32" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_.85fr_.85fr]">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <Skeleton className="mb-2 h-2.5 w-24" />
              <Skeleton className="h-11 w-full rounded-[7px]" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-20 w-full rounded-[7px]" />

        <div className="mt-5 min-h-[565px] border-t border-[#e7e2ed] pt-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-10 w-64 rounded-[7px]" />
          <div className="mt-4 h-[398px] overflow-hidden rounded-[8px] border border-[#ddd8e5]">
            <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)_46px] bg-[#f6f3f8] px-4 py-3">
              <Skeleton className="h-2.5 w-28" />
              <span />
              <Skeleton className="h-2.5 w-28" />
              <span />
            </div>
            {Array.from({length: 4}, (_, index) => (
              <div className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)_46px] items-center border-t border-[#ebe7ef] px-4 py-2" key={index}>
                <Skeleton className="h-8 w-full rounded-[5px]" />
                <Skeleton className="mx-auto size-4 rounded-full" />
                <Skeleton className="h-8 w-full rounded-[5px]" />
                <Skeleton className="mx-auto size-8 rounded-[6px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-[7px]" />
        <Skeleton className="h-10 w-36 rounded-[7px]" />
      </div>
    </div>
  );
}

let termSequence = 0;

function createEditableTerm(source = "", target = "", id?: string, isNew = false): EditableTerm {
  termSequence += 1;
  return {
    id,
    isNew,
    key: id || "local-term-" + Date.now() + "-" + termSequence,
    source,
    target,
  };
}

function serializeGlossaryFormState({
  description,
  name,
  sourceLanguage,
  targetLanguage,
  terms,
}: {
  description: string;
  name: string;
  sourceLanguage: SupportedLanguageCode | "";
  targetLanguage: SupportedLanguageCode | "";
  terms: EditableTerm[];
}) {
  return JSON.stringify({
    description: description.trim(),
    name: name.trim(),
    sourceLanguage,
    targetLanguage,
    terms: terms.map((term) => ({
      id: term.id ?? null,
      source: term.source.trim(),
      target: term.target.trim(),
    })),
  });
}

function parseDelimitedLine(line: string): string[] {
  const delimiter = line.includes("\t") ? "\t" : line.includes(",") ? "," : line.includes(";") ? ";" : null;
  if (!delimiter) return [line.trim()];

  const fields: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === delimiter && !inQuotes) {
      fields.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  fields.push(value.trim());
  return fields;
}

function isHeaderRow(columns: string[]) {
  const normalized = columns.join(" ").toLocaleLowerCase();
  return /source|target|từ_gốc|từ_đích|thuật ngữ gốc|thuật ngữ đích/.test(normalized);
}

function parseGlossaryFile(text: string) {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseDelimitedLine);

  if (rows.length > 0 && isHeaderRow(rows[0])) rows.shift();

  return rows
    .map((columns) => ({
      source: (columns[0] || "").trim(),
      target: (columns[1] || "").trim(),
    }))
    .filter((term) => term.source.length > 0);
}

export function GlossaryFormView({
  embedded = false,
  mode,
  glossaryId,
  initialValues,
  lockLanguages = false,
  onCancel,
  onSaved,
}: GlossaryFormViewProps) {
  const rawLocale = useLocale();
  const locale = resolveGlossaryLocale(rawLocale);
  const copy = glossaryCopy[locale];
  const router = useRouter();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [sourceLanguage, setSourceLanguage] = useState<SupportedLanguageCode | "">(
    normalizeGlossaryLanguage(initialValues?.sourceLanguage ?? "") || "",
  );
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguageCode | "">(
    normalizeGlossaryLanguage(initialValues?.targetLanguage ?? "") || "",
  );
  const [terms, setTerms] = useState<EditableTerm[]>(() =>
    (initialValues?.terms ?? []).map((term) => createEditableTerm(term.source, term.target)),
  );
  const [removedTermIds, setRemovedTermIds] = useState<string[]>([]);
  const [draftSource, setDraftSource] = useState("");
  const [draftTarget, setDraftTarget] = useState("");
  const [entryMode, setEntryMode] = useState<"manual" | "file">("manual");
  const [manualSearch, setManualSearch] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileError, setFileError] = useState("");
  const [isGlobalDragActive, setIsGlobalDragActive] = useState(false);
  const [pendingScrollTermKey, setPendingScrollTermKey] = useState<string | null>(null);
  const [initialEditSnapshot, setInitialEditSnapshot] = useState<string | null>(null);
  const termsViewportRef = useRef<HTMLDivElement | null>(null);
  const autoCopiedTargetTermKeysRef = useRef<Set<string>>(new Set());
  const manuallyEditedTargetTermKeysRef = useRef<Set<string>>(new Set());
  const draftTargetWasEditedRef = useRef(false);
  const newTermLabel = locale === "vi" ? "Mới" : locale === "ja" ? "新規" : "New";

  useEffect(() => {
    if (mode !== "edit" || !glossaryId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadGlossary = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const firstPage = await GlossaryService.getGlossaryById(glossaryId, {
          page: 1,
          size: 100,
          sort: "source:asc",
        });
        const pageCount = Math.max(1, firstPage.terms.pages || 1);
        const remainingPages = pageCount > 1
          ? await Promise.all(
              Array.from({length: pageCount - 1}, (_, index) =>
                GlossaryService.getGlossaryById(glossaryId, {
                  page: index + 2,
                  size: 100,
                  sort: "source:asc",
                }),
              ),
            )
          : [];

        if (!isMounted) return;

        const allTerms: GlossaryTermResponse[] = [
          ...(firstPage.terms.items || []),
          ...remainingPages.flatMap((pageResponse) => pageResponse.terms.items || []),
        ];
        const loadedSourceLanguage = normalizeGlossaryLanguage(firstPage.sourceLanguage) || "";
        const loadedTargetLanguage = normalizeGlossaryLanguage(firstPage.targetLanguage) || "";
        const loadedTerms = allTerms.map((term) => createEditableTerm(term.source, term.target, term.id));

        setName(firstPage.name);
        setDescription(firstPage.description || "");
        setSourceLanguage(loadedSourceLanguage);
        setTargetLanguage(loadedTargetLanguage);
        setTerms(loadedTerms);
        setRemovedTermIds([]);
        autoCopiedTargetTermKeysRef.current.clear();
        manuallyEditedTargetTermKeysRef.current.clear();
        draftTargetWasEditedRef.current = false;
        setInitialEditSnapshot(serializeGlossaryFormState({
          description: firstPage.description || "",
          name: firstPage.name,
          sourceLanguage: loadedSourceLanguage,
          targetLanguage: loadedTargetLanguage,
          terms: loadedTerms,
        }));
      } catch (error) {
        console.error("Failed to load glossary form", error);
        if (isMounted) setErrorMessage(copy.form.loadError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadGlossary();

    return () => {
      isMounted = false;
    };
  }, [copy.form.loadError, glossaryId, mode]);

  const visibleTerms = useMemo(() => {
    const query = manualSearch.trim().toLocaleLowerCase();
    if (mode !== "edit" || !query) return terms;

    return terms.filter(
      (term) =>
        term.source.toLocaleLowerCase().includes(query) ||
        term.target.toLocaleLowerCase().includes(query),
    );
  }, [manualSearch, mode, terms]);

  const currentFormSnapshot = useMemo(
    () => serializeGlossaryFormState({
      description,
      name,
      sourceLanguage,
      targetLanguage,
      terms,
    }),
    [description, name, sourceLanguage, targetLanguage, terms],
  );
  const hasFormChanges =
    mode === "create" ||
    (initialEditSnapshot !== null && currentFormSnapshot !== initialEditSnapshot);

  useEffect(() => {
    if (!pendingScrollTermKey || entryMode !== "manual") return;

    const animationFrame = window.requestAnimationFrame(() => {
      const viewport = termsViewportRef.current;
      if (!viewport) return;

      viewport.scrollTo({
        behavior: "smooth",
        top: viewport.scrollHeight,
      });
      setPendingScrollTermKey(null);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [entryMode, pendingScrollTermKey, visibleTerms.length]);

  const handleAddRow = () => {
    const source = draftSource.trim();
    const target = draftTarget.trim();

    if (!source || !target) {
      setErrorMessage(copy.form.incompleteTermsError);
      return;
    }

    const duplicate = terms.some(
      (term) => term.source.trim().toLocaleLowerCase() === source.toLocaleLowerCase(),
    );

    if (!duplicate) {
      const newTerm = createEditableTerm(source, target, undefined, true);
      setManualSearch("");
      setTerms((current) => [...current, newTerm]);
      setPendingScrollTermKey(newTerm.key);
    }

    setDraftSource("");
    setDraftTarget("");
    draftTargetWasEditedRef.current = false;
    setErrorMessage("");
  };

  const handleRemoveTerm = (term: EditableTerm) => {
    setTerms((current) => current.filter((item) => item.key !== term.key));
    autoCopiedTargetTermKeysRef.current.delete(term.key);
    manuallyEditedTargetTermKeysRef.current.delete(term.key);
    if (term.id) {
      setRemovedTermIds((current) => (current.includes(term.id as string) ? current : [...current, term.id as string]));
    }
  };

  const updateTerm = (key: string, field: "source" | "target", value: string) => {
    if (field === "target") {
      manuallyEditedTargetTermKeysRef.current.add(key);
      autoCopiedTargetTermKeysRef.current.delete(key);
      setTerms((current) =>
        current.map((term) => (term.key === key ? {...term, target: value} : term)),
      );
      return;
    }

    setTerms((current) =>
      current.map((term) => {
        if (term.key !== key) return term;

        const shouldAutoCopyTarget =
          !manuallyEditedTargetTermKeysRef.current.has(key) &&
          (term.target.trim().length === 0 || autoCopiedTargetTermKeysRef.current.has(key));

        if (shouldAutoCopyTarget) {
          autoCopiedTargetTermKeysRef.current.add(key);
          return {...term, source: value, target: value};
        }

        return {...term, source: value};
      }),
    );
  };

  const handleDraftSourceChange = (value: string) => {
    setDraftSource(value);
    if (!draftTargetWasEditedRef.current) {
      setDraftTarget(value);
    }
  };

  const handleDraftTargetChange = (value: string) => {
    draftTargetWasEditedRef.current = true;
    setDraftTarget(value);
  };

  const handleDroppedFiles = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const extension = file.name.split(".").pop()?.toLocaleLowerCase();
      if (extension !== "csv" && extension !== "txt") {
        setFileError(copy.form.invalidFile);
        return;
      }

      setFileError("");

      try {
        const parsedTerms = parseGlossaryFile(await file.text());
        if (parsedTerms.length === 0) {
          setFileError(copy.form.emptyFile);
          return;
        }

        const existingSources = new Set(
          terms.map((term) => term.source.trim().toLocaleLowerCase()).filter(Boolean),
        );
        const newTerms: EditableTerm[] = [];

        parsedTerms.forEach((term) => {
          const normalizedSource = term.source.toLocaleLowerCase();
          if (!existingSources.has(normalizedSource)) {
            existingSources.add(normalizedSource);
            newTerms.push(createEditableTerm(term.source, term.target, undefined, true));
          }
        });

        setTerms((current) => [...current, ...newTerms]);
        setPendingScrollTermKey(newTerms.at(-1)?.key ?? null);
        setImportFileName(file.name);
        setImportedCount(newTerms.length);
      } catch (error) {
        console.error("Failed to parse glossary file", error);
        setFileError(copy.form.parseError);
      }
    },
    [copy.form.emptyFile, copy.form.invalidFile, copy.form.parseError, terms],
  );

  const {
    getInputProps,
    getRootProps,
    isDragActive,
    open: openFilePicker,
  } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    multiple: false,
    noClick: true,
    noDragEventsBubbling: true,
    onDrop: (acceptedFiles) => {
      setIsGlobalDragActive(false);
      setEntryMode("file");
      void handleDroppedFiles(acceptedFiles);
    },
    onDropRejected: () => {
      setIsGlobalDragActive(false);
      setFileError(copy.form.invalidFile);
    },
  });

  useEffect(() => {
    let dragDepth = 0;

    const containsFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const handleDragEnter = (event: DragEvent) => {
      if (!containsFiles(event) || isLoading || isSaving) return;
      event.preventDefault();
      dragDepth += 1;
      setIsGlobalDragActive(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!containsFiles(event) || isLoading || isSaving) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!containsFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsGlobalDragActive(false);
    };

    const handleGlobalDrop = (event: DragEvent) => {
      if (!containsFiles(event) || isLoading || isSaving) return;
      event.preventDefault();
      dragDepth = 0;
      setIsGlobalDragActive(false);
      setEntryMode("file");
      void handleDroppedFiles(Array.from(event.dataTransfer?.files ?? []));
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleGlobalDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleGlobalDrop);
    };
  }, [handleDroppedFiles, isLoading, isSaving]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    if (mode === "edit" && !hasFormChanges) return;

    const normalizedName = name.trim();
    if (!normalizedName || !sourceLanguage || !targetLanguage) {
      setErrorMessage(copy.form.requiredError);
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setErrorMessage(copy.form.sameLanguageError);
      return;
    }

    const normalizedTerms = terms.map((term) => ({
      ...term,
      source: term.source.trim(),
      target: term.target.trim(),
    }));

    if (normalizedTerms.some((term) => !term.source || !term.target)) {
      setErrorMessage(copy.form.incompleteTermsError);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      let savedGlossaryId = glossaryId;
      let savedGlossary: GlossaryResponse | null = null;

      if (mode === "create") {
        const created = await GlossaryService.createGlossary({
          name: normalizedName,
          description: description.trim() || undefined,
          sourceLanguage,
          targetLanguage,
        });
        savedGlossaryId = created.id;
        savedGlossary = created;

        if (normalizedTerms.length > 0) {
          await GlossaryService.upsertTerms(
            created.id,
            normalizedTerms.map(({source, target}) => ({source, target})),
          );
        }
      } else if (glossaryId) {
        savedGlossary = await GlossaryService.updateGlossary(glossaryId, {
          name: normalizedName,
          description: description.trim() || undefined,
        });

        await Promise.all([
          ...removedTermIds.map((termId) => GlossaryService.deleteTerm(glossaryId, termId)),
          ...normalizedTerms
            .filter((term) => term.id)
            .map((term) =>
              GlossaryService.updateTerm(glossaryId, term.id as string, {
                source: term.source,
                target: term.target,
              }),
            ),
        ]);

        const newTerms = normalizedTerms.filter((term) => !term.id);
        if (newTerms.length > 0) {
          await GlossaryService.upsertTerms(
            glossaryId,
            newTerms.map(({source, target}) => ({source, target})),
          );
        }
      }

      if (savedGlossary && onSaved) {
        onSaved(savedGlossary);
      } else if (savedGlossaryId) {
        router.push("/dashboard/glossaries/" + savedGlossaryId);
      }
    } catch (error) {
      console.error("Failed to save glossary", error);
      setErrorMessage(copy.form.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelHref = mode === "edit" && glossaryId
    ? "/dashboard/glossaries/" + glossaryId
    : "/dashboard/glossaries";
  const localePath = (mode === "edit" && glossaryId
    ? `dashboard/glossaries/${glossaryId}/edit`
    : "dashboard/glossaries/new") as `dashboard/glossaries${string}`;

  return (
    <GlossaryFormFrame embedded={embedded} localePath={localePath}>
      {isGlobalDragActive ? (
        <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center border-2 border-dashed border-[#f06317] bg-[#21175c]/24 p-6 backdrop-blur-[2px]">
          <div className="flex min-h-36 w-full max-w-[520px] flex-col items-center justify-center rounded-[8px] border border-[#f06317] bg-white px-6 text-center shadow-[0_24px_70px_rgba(33,23,92,0.24)]">
            <Upload className="size-8 text-[#f06317]" />
            <p className="mt-3 text-[15px] font-bold text-[#21175c]">{copy.form.dropActive}</p>
            <p className="mt-1 text-[11px] text-[#716b79]">{copy.form.fileSupport}</p>
          </div>
        </div>
      ) : null}
      {isLoading ? (
        <GlossaryFormSkeleton embedded={embedded} label={copy.form.loading} />
      ) : (
        <form className="content-reveal" onSubmit={handleSubmit}>
          {!embedded ? (
            <>
              <nav className="flex items-center gap-2 text-[11px]">
                <Link className="font-semibold text-[#f06317] hover:text-[#21175c]" href="/dashboard/glossaries">
                  {copy.common.backToGlossaries}
                </Link>
                <span className="text-[#9a94a1]">/</span>
                <span className="text-[#716b79]">
                  {mode === "create" ? copy.form.createBreadcrumb : copy.form.editBreadcrumb}
                </span>
              </nav>

              <div className="mt-4">
                <h1 className="text-[30px] font-bold leading-tight text-[#21175c]">
                  {mode === "create" ? copy.form.createTitle : copy.form.editTitle}
                </h1>
                <p className="mt-1.5 text-[12px] leading-5 text-[#716b79]">
                  {mode === "create" ? copy.form.createDescription : copy.form.editDescription}
                </p>
              </div>
            </>
          ) : null}

          <section className={`${embedded ? "mt-0" : "mt-7"} rounded-[8px] border border-[#d9d3e1] bg-white/92 p-5 shadow-[0_10px_26px_rgba(33,23,92,0.04)] sm:p-6`}>
            <h2 className="text-[11px] font-bold uppercase text-[#f06317]">{copy.form.basicInfo}</h2>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_.85fr_.85fr]">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-[#21175c]">{copy.form.name}</span>
                <input
                  className="h-11 w-full rounded-[7px] border border-[#d8d2e1] bg-white px-3 text-[12px] outline-none focus:border-[#21175c] focus:ring-2 focus:ring-[#21175c]/10"
                  onChange={(event) => setName(event.target.value)}
                  placeholder={copy.form.namePlaceholder}
                  value={name}
                />
              </label>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-[#21175c]">{copy.form.sourceLanguage}</span>
                <Select
                  disabled={mode === "edit" || lockLanguages}
                  onValueChange={(value) => setSourceLanguage(value as SupportedLanguageCode)}
                  value={sourceLanguage}
                >
                  <SelectTrigger className="h-11 w-full rounded-[7px] border-[#d8d2e1] bg-white text-[12px] disabled:bg-[#f1eff4]">
                    <SelectValue placeholder={copy.form.chooseLanguage}>
                      {sourceLanguage ? (
                        <span className="flex items-center gap-2">
                          <GlossaryLanguage language={sourceLanguage} locale={locale} />
                          {mode === "edit" || lockLanguages ? <LockKeyhole className="size-3.5 text-[#918a98]" /> : null}
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-[#d8d2e1] bg-white">
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <GlossaryLanguage language={language.code} locale={locale} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="block min-w-0">
                <span className="mb-1.5 block text-[11px] font-semibold text-[#21175c]">{copy.form.targetLanguage}</span>
                <Select
                  disabled={mode === "edit" || lockLanguages}
                  onValueChange={(value) => setTargetLanguage(value as SupportedLanguageCode)}
                  value={targetLanguage}
                >
                  <SelectTrigger className="h-11 w-full rounded-[7px] border-[#d8d2e1] bg-white text-[12px] disabled:bg-[#f1eff4]">
                    <SelectValue placeholder={copy.form.chooseLanguage}>
                      {targetLanguage ? (
                        <span className="flex items-center gap-2">
                          <GlossaryLanguage language={targetLanguage} locale={locale} />
                          {mode === "edit" || lockLanguages ? <LockKeyhole className="size-3.5 text-[#918a98]" /> : null}
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-[#d8d2e1] bg-white">
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <GlossaryLanguage language={language.code} locale={locale} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-semibold text-[#21175c]">{copy.form.description}</span>
              <textarea
                className="min-h-20 w-full resize-y rounded-[7px] border border-[#d8d2e1] bg-white px-3 py-3 text-[12px] leading-5 outline-none focus:border-[#21175c] focus:ring-2 focus:ring-[#21175c]/10"
                onChange={(event) => setDescription(event.target.value)}
                placeholder={copy.form.descriptionPlaceholder}
                value={description}
              />
            </label>

            <div className="mt-5 border-t border-[#e7e2ed] pt-5">
              <h2 className="text-[11px] font-bold uppercase text-[#f06317]">{copy.form.addTerms}</h2>

              <div className="mt-3 inline-grid grid-cols-2 rounded-[7px] bg-[#f0edf4] p-1">
                <button
                  className={"h-9 min-w-32 rounded-[5px] px-4 text-[12px] font-semibold transition-colors " + (
                    entryMode === "manual" ? "bg-white text-[#21175c] shadow-sm" : "text-[#716b79]"
                  )}
                  onClick={() => setEntryMode("manual")}
                  type="button"
                >
                  {copy.form.manual}
                </button>
                <button
                  className={"h-9 min-w-32 rounded-[5px] px-4 text-[12px] font-semibold transition-colors " + (
                    entryMode === "file" ? "bg-white text-[#21175c] shadow-sm" : "text-[#716b79]"
                  )}
                  onClick={() => setEntryMode("file")}
                  type="button"
                >
                  {copy.form.importFile}
                </button>
              </div>

              {entryMode === "manual" ? (
                <div className="mt-4 min-h-[460px]">
                  {mode === "edit" ? (
                    <label className="mb-3 flex h-11 w-full max-w-[520px] items-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white px-3 focus-within:border-[#21175c] focus-within:ring-2 focus-within:ring-[#21175c]/10">
                      <Search className="size-4 shrink-0 text-[#777080]" />
                      <input
                        aria-label={copy.detail.searchPlaceholder}
                        className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9a94a1]"
                        onChange={(event) => setManualSearch(event.target.value)}
                        placeholder={copy.detail.searchPlaceholder}
                        type="search"
                        value={manualSearch}
                      />
                    </label>
                  ) : null}
                  <div className="overflow-hidden rounded-[8px] border border-[#ddd8e5]">
                    <div className="overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="glossary-term-list h-[340px] overflow-y-auto [scrollbar-gutter:stable]" ref={termsViewportRef}>
                          <div className="sticky top-0 z-20 grid min-h-10 grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)_46px] items-center bg-[#f6f3f8] px-4 py-3 text-[10px] font-semibold uppercase text-[#6f6877]">
                            <span>{copy.common.source}</span>
                            <span aria-hidden="true" />
                            <span>{copy.common.target}</span>
                            <span aria-hidden="true" />
                          </div>
                          {visibleTerms.length > 0 ? (
                            visibleTerms.map((term) => (
                              <div
                                className={`grid min-h-[58px] grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)_46px] items-center border-t border-[#ebe7ef] px-4 py-2 first:border-t-0 ${
                                  term.isNew ? "glossary-new-term-row" : ""
                                }`}
                                data-term-key={term.key}
                                key={term.key}
                              >
                                <div className="relative min-w-0">
                                  <input
                                    aria-label={copy.common.source}
                                    className={`h-10 w-full min-w-0 rounded-[5px] border border-transparent bg-transparent px-2 py-2 text-[12px] font-semibold text-[#21175c] outline-none hover:border-[#ddd8e5] focus:border-[#21175c] focus:bg-white ${
                                      term.isNew ? "pr-14" : ""
                                    }`}
                                    onChange={(event) => updateTerm(term.key, "source", event.target.value)}
                                    value={term.source}
                                  />
                                  {term.isNew ? (
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#fff0e7] px-2 py-0.5 text-[8px] font-bold uppercase text-[#d9570d]">
                                      {newTermLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <ArrowRight className="mx-auto size-4 text-[#8a8391]" />
                                <input
                                  aria-label={copy.common.target}
                                  className="h-10 w-full min-w-0 rounded-[5px] border border-transparent bg-transparent px-2 py-2 text-[12px] text-[#2f2b34] outline-none hover:border-[#ddd8e5] focus:border-[#21175c] focus:bg-white"
                                  onChange={(event) => updateTerm(term.key, "target", event.target.value)}
                                  placeholder={copy.form.targetPlaceholder}
                                  value={term.target}
                                />
                                <button
                                  aria-label={copy.form.removeRow}
                                  className="mx-auto grid size-8 place-items-center rounded-[6px] border border-[#ffaaa1] text-[#d92d20] transition-colors hover:bg-[#fff1ef]"
                                  onClick={() => handleRemoveTerm(term)}
                                  title={copy.form.removeRow}
                                  type="button"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="flex min-h-[300px] items-center justify-center text-[12px] text-[#777080]">
                              {terms.length > 0 ? copy.detail.empty : copy.form.noTerms}
                            </div>
                          )}
                        </div>
                        <div className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)_46px] items-center overflow-y-auto border-t border-[#ddd8e5] bg-[#fcfbfd] px-4 py-2 [scrollbar-gutter:stable]">
                          <input
                            aria-label={copy.form.sourcePlaceholder}
                            className="h-10 w-full min-w-0 rounded-[7px] border border-[#d8d2e1] bg-white px-3 text-[12px] outline-none focus:border-[#21175c] focus:ring-2 focus:ring-[#21175c]/10"
                            onChange={(event) => handleDraftSourceChange(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAddRow();
                              }
                            }}
                            placeholder={copy.form.sourcePlaceholder}
                            value={draftSource}
                          />
                          <ArrowRight className="mx-auto size-4 text-[#8a8391]" />
                          <input
                            aria-label={copy.form.targetPlaceholder}
                            className="h-10 w-full min-w-0 rounded-[7px] border border-[#d8d2e1] bg-white px-3 text-[12px] outline-none focus:border-[#21175c] focus:ring-2 focus:ring-[#21175c]/10"
                            onChange={(event) => handleDraftTargetChange(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAddRow();
                              }
                            }}
                            placeholder={copy.form.targetPlaceholder}
                            value={draftTarget}
                          />
                          <button
                            aria-label={copy.form.addRow}
                            className="mx-auto grid size-8 place-items-center rounded-[6px] border border-[#21175c] text-[#21175c] transition-colors hover:bg-[#21175c] hover:text-white"
                            onClick={handleAddRow}
                            title={copy.form.addRow}
                            type="button"
                          >
                            <Plus aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 min-h-[460px]">
                  <div
                    {...getRootProps()}
                    className={"rounded-[8px] border border-[#ddd8e5] bg-[#fbfaff] p-4 transition-colors " + (
                      isDragActive ? "border-[#f06317] bg-[#fff6f1]" : ""
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="rounded-[7px] border border-dashed border-[#cfc8da] bg-white/80 px-5 py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-[#fff1ea] text-[#f06317]">
                          <Upload className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-[#21175c]">
                            {isDragActive ? copy.form.dropActive : copy.form.dropTitle}
                          </p>
                          <p className="mt-1 text-[11px] text-[#777080]">{copy.form.fileSupport}</p>
                          {importFileName ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf9f1] px-3 py-1.5 font-semibold text-[#087443]">
                                <FileText className="size-3.5" />
                                {importFileName}
                              </span>
                              <span className="text-[#5f5968]">{importedCount} {copy.form.importedRows}</span>
                              <Check className="size-4 text-[#0f8277]" />
                            </div>
                          ) : null}
                        </div>
                        <button
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] border border-[#d8d2e1] bg-white px-4 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                          onClick={openFilePicker}
                          type="button"
                        >
                          <Upload className="size-4" />
                          {copy.form.chooseFile}
                        </button>
                      </div>

                      <div className="mt-5 rounded-[8px] border border-[#bfd7ff] bg-[#f4f8ff]">
                        <h3 className="flex items-center gap-2 border-b border-[#d7e5ff] px-4 py-3 text-[12px] font-bold text-[#21175c]">
                          <Lightbulb className="size-4 text-[#f0a000]" />
                          {copy.form.fileGuideTitle}
                        </h3>
                        <div className="grid gap-4 p-4 md:grid-cols-2">
                          <div className="px-3">
                            <p className="text-center text-[11px] font-semibold text-[#21175c]">{copy.form.pairedFormat}</p>
                            <div className="mt-2 rounded-[7px] border border-[#2b8cff] bg-white px-3 py-2 text-[11px]">
                              <code className="block text-center text-[#1769d2]">{copy.form.pairedColumns}</code>
                              <p className="mt-2 text-[#716b79]">
                                Example: <span className="rounded bg-[#dff8e8] px-1.5 py-0.5 text-[#087443]">{copy.form.pairedExample}</span>
                              </p>
                            </div>
                          </div>
                          <div className="border-l-2 border-[#f0a000] pl-3">
                            <p className="text-center text-[11px] font-semibold text-[#21175c]">{copy.form.singleFormat}</p>
                            <div className="mt-2 rounded-[7px] border border-[#2b8cff] bg-white px-3 py-2 text-[11px]">
                              <code className="block text-center text-[#1769d2]">{copy.form.singleColumns}</code>
                              <p className="mt-2 text-[#716b79]">
                                Example: <span className="rounded bg-[#fff0c8] px-1.5 py-0.5 text-[#a15c00]">{copy.form.singleExample}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1 border-t border-[#d7e5ff] px-4 py-3 text-center text-[10px] italic text-[#5570a0]">
                          <p>{copy.form.noHeader}</p>
                          <p>{copy.form.singleNote}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-[#777080]">{copy.form.duplicateNote}</p>
                  {fileError ? (
                    <p className="mt-3 rounded-[7px] border border-[#f4b4ae] bg-[#fff4f2] px-3 py-2 text-[12px] text-[#b42318]">
                      {fileError}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {errorMessage ? (
            <p className="mt-4 rounded-[7px] border border-[#f4b4ae] bg-[#fff4f2] px-3 py-2 text-[12px] text-[#b42318]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-3">
            {onCancel ? (
              <button
                className="inline-flex h-10 min-w-24 items-center justify-center rounded-[7px] border border-[#d8d2e1] bg-white px-4 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                onClick={onCancel}
                type="button"
              >
                {copy.common.cancel}
              </button>
            ) : (
              <Link
                className="inline-flex h-10 min-w-24 items-center justify-center rounded-[7px] border border-[#d8d2e1] bg-white px-4 text-[12px] font-bold text-[#21175c] transition-colors hover:border-[#f06317] hover:text-[#f06317]"
                href={cancelHref}
              >
                {copy.common.cancel}
              </Link>
            )}
            <button
              className="inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-[7px] bg-[#21175c] px-5 text-[12px] font-bold text-white transition-colors hover:bg-[#f06317] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isSaving || (mode === "edit" && !hasFormChanges)}
              type="submit"
            >
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : mode === "create" ? <Plus className="size-4" /> : <Check className="size-4" />}
              {isSaving ? copy.form.saving : mode === "create" ? copy.form.create : copy.form.save}
            </button>
          </div>
        </form>
      )}
    </GlossaryFormFrame>
  );
}
