import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { SUPPORTED_LANGUAGES } from "@/lib/constants";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getLanguageName = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.name || code;
  };

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}
