import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GuidanceClient } from "./guidance-client";

export const metadata: Metadata = {
  title: "User Guidance | TranslateSphere",
  description: "Guidance and help for using TranslateSphere",
};

export default function UserGuidancePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Section */}
      <div className="mb-10 space-y-4">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Main Page
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          User Guidance
        </h1>
        <p className="max-w-2xl text-md text-gray-600 dark:text-gray-400">
          Master TranslateSphere with our step-by-step guides for translation,
          history tracking, and glossary management.
        </p>
      </div>

      <GuidanceClient />
    </div>
  );
}
