# API Integration Framework

This document provides examples of how to use the API services in your components.

## Import Services

```typescript
// Import specific services
import { GlossaryService, TranslationService, AuthService } from "@/api";

// Import types
import type { GlossaryResponse, CreateGlossaryRequest } from "@/api";

// Import config if needed
import { API_CONFIG } from "@/api";
```

## Usage Examples

### Authentication

```typescript
// Login (OAuth2 password grant flow)
try {
  const result = await AuthService.login({
    username: "duong-cq",
    password: "admin",
  });
  console.log("Logged in:", result.user);
} catch (error) {
  console.error("Login failed:", error.message);
}

// Get current user
try {
  const user = await AuthService.getCurrentUser();
  console.log("Current user:", user);
} catch (error) {
  console.error("Failed to get user:", error.message);
}
```

### Glossaries

```typescript
// Get all glossaries
try {
  const glossaries = await GlossaryService.getGlossaries();
  console.log("Glossaries:", glossaries);
} catch (error) {
  console.error("Failed to fetch glossaries:", error.message);
}

// Create new glossary
try {
  const newGlossary = await GlossaryService.createGlossary({
    name: "Medical Terms",
    description: "Medical terminology",
    sourceLanguage: "English",
    targetLanguage: "Spanish",
  });
  console.log("Created:", newGlossary);
} catch (error) {
  console.error("Failed to create glossary:", error.message);
}

// Add term to glossary
try {
  const term = await GlossaryService.addTerm("glossary-id", {
    source: "Hello",
    target: "Hola",
  });
  console.log("Added term:", term);
} catch (error) {
  console.error("Failed to add term:", error.message);
}
```

### Translations

```typescript
// Upload and start translation
try {
  // 1. Upload document
  const uploadResult = await TranslationService.uploadDocument(
    file, // File object from input
    "English",
    "Spanish"
  );

  // 2. Start translation
  const translationJob = await TranslationService.startTranslation({
    documentId: uploadResult.documentId,
    sourceLanguage: "English",
    targetLanguage: "Spanish",
    glossaryIds: ["glossary-1", "glossary-2"], // optional
  });

  console.log("Translation started:", translationJob.jobId);

  // 3. Poll for status
  const checkStatus = async () => {
    const status = await TranslationService.getTranslationStatus(
      translationJob.jobId
    );

    console.log("Progress:", status.progress);

    if (status.status === "completed") {
      // Download result
      const blob = await TranslationService.downloadTranslatedDocument(
        translationJob.jobId
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "translated-document.docx";
      a.click();
    }
  };

  // Check status every 2 seconds
  const interval = setInterval(checkStatus, 2000);
} catch (error) {
  console.error("Translation failed:", error.message);
}
```

## React Component Example

```typescript
"use client";

import { useState, useEffect } from "react";
import { GlossaryService } from "@/api";
import type { GlossaryResponse } from "@/api";

export function GlossaryList() {
  const [glossaries, setGlossaries] = useState<GlossaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGlossaries = async () => {
      try {
        setLoading(true);
        const data = await GlossaryService.getGlossaries();
        setGlossaries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchGlossaries();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {glossaries.map((glossary) => (
        <div key={glossary.id}>
          <h3>{glossary.name}</h3>
          <p>{glossary.description}</p>
        </div>
      ))}
    </div>
  );
}
```

## Customizing Endpoints

Update the endpoint paths in `api/config.ts` to match your backend:

```typescript
export const API_CONFIG = {
  BASE_URL: "http://192.168.137.218:18000",
  ENDPOINTS: {
    GLOSSARIES: {
      BASE: "/your/actual/endpoint",
      // ... update other paths
    },
  },
};
```

## Error Handling

All services use the centralized error handler. Errors are automatically:

- Logged to console
- Converted to user-friendly messages
- Thrown as Error objects

You can catch and handle them in your components as shown in the examples above.
