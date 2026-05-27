import type React from "react";
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import "../globals.css";
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from "next-intl";

export const metadata: Metadata = {
  title: "GlossaryAI - Professional Translation Platform",
  description:
    "Premium document translation with custom glossaries and seamless workflow",
};

export const viewport: Viewport = {
  themeColor: "#f5f3ef",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
          :root {
            --font-inter: 'Inter', sans-serif;
            --font-playfair: 'Playfair Display', serif;
            --font-geist-mono: 'Geist', monospace;
          }
        ` }} />
      </head>
      <body suppressHydrationWarning
        className="font-sans antialiased"
      >
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
