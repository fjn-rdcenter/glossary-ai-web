import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GuidanceClient } from "./guidance-client";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const trml = await getTranslations("UserGuidance");
  return {
    title: `${trml("title")} | GlossaryAI`,
    description: trml("description"),
  };
}

export default function UserGuidancePage() {
  return (
    <div className="container mx-auto px-4 pt-10 pb-8 max-w-6xl">
      {/* Header Section */}
      <div className="mb-6 space-y-4">
        <UserGuidanceContent />
      </div>

      <GuidanceClient />
    </div>
  );
}

function UserGuidanceContent() {
  const trml = useTranslations("UserGuidance");

  return (
    <>
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {trml("backToMain")}
      </Link>
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
        {trml("title")}
      </h1>
      <p className="max-w-2xl text-md text-gray-600 dark:text-gray-400">
        {trml("description")}
      </p>
    </>
  );
}
