"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition, SlideUp } from "@/components/ui/page-transition";
import { GlossaryService } from "@/api/services";
import { GlossaryResponse, GlossaryDetailResponse } from "@/lib/types";
import { GlossaryForm } from "@/components/glossary/glossary-form";
import { RefreshCw } from "lucide-react";
import { getLanguageName } from "@/lib/utils";
import { useTranslations } from 'next-intl';
export const dynamic = "force-dynamic";

export default function EditGlossaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [glossary, setGlossary] = useState<GlossaryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const trmlCommon = useTranslations("Common");
  const trmlGlossaries = useTranslations("Glossaries");

  useEffect(() => {
    const fetchGlossaryData = async () => {
      setLoading(true);
      try {
        // Try to fetch with larger size first
        try {
          const data = await GlossaryService.getGlossaryById(id, { size: 100 });
          setGlossary(data as GlossaryDetailResponse);
        } catch (err) {
          console.warn("Failed to fetch all terms, falling back to default...", err);
          // Fallback to default pagination if large size fails (e.g. backend limit)
          const data = await GlossaryService.getGlossaryById(id);
          setGlossary(data as GlossaryDetailResponse);
        }
      } catch (error) {
        console.error("Failed to fetch glossary", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlossaryData();
  }, [id]);

  const handleSuccess = (updatedGlossary: GlossaryDetailResponse) => {
      router.push(`/dashboard/glossaries/${id}`);
  };

  if (loading) {
      return (
         <div className="container mx-auto px-6 py-10 text-center" suppressHydrationWarning>
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">{trmlGlossaries("loading")}</p>
         </div>
      );
  }

  if (!glossary) {
    return (
      <div className="container mx-auto px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold">{trmlGlossaries("notFound")}</h1>
        <Button className="mt-4" onClick={() => router.push("/dashboard/glossaries")}>
          {trmlGlossaries("backToList")}
        </Button>
      </div>
    );
  }

  return (
    <PageTransition className="container mx-auto px-6 py-10">
      {/* Header */}
      <SlideUp>
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/glossaries/${id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground">{trmlGlossaries("editGlossary")}</h1>
            <p className="mt-1 text-muted-foreground">
              {trmlCommon(glossary.sourceLanguage) ?? glossary.sourceLanguage} → {trmlCommon(glossary.targetLanguage) ?? glossary.targetLanguage}
            </p>
          </div>
        </div>
      </SlideUp>

      <GlossaryForm 
          mode="edit"
          initialData={glossary}
          onSuccess={handleSuccess}
          onCancel={() => router.push(`/dashboard/glossaries/${id}`)}
      />
    </PageTransition>
  )
}
