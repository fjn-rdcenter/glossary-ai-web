"use client";

import {useEffect, useState} from "react";
import {API_CONFIG, apiClient, USE_LEGACY_EXTRACTION_MEDIA} from "@/api";

const isAbsoluteMediaSource = (src: string) =>
  src.startsWith("http://") ||
  src.startsWith("https://") ||
  src.startsWith("//") ||
  src.startsWith("data:") ||
  src.startsWith("blob:");

function getMediaStoragePath(mediaStorage: string) {
  try {
    return new URL(mediaStorage).pathname.replace(/^\/+/, "");
  } catch {
    return mediaStorage;
  }
}

function joinMediaPath(root: string, path: string) {
  return `${root.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function useMediaUrl(mediaStorage: string, src?: string) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!src) {
      setUrl(undefined);
      return;
    }

    if (isAbsoluteMediaSource(src)) {
      setUrl(src);
      return;
    }

    const mediaPath = joinMediaPath(getMediaStoragePath(mediaStorage), src);
    if (USE_LEGACY_EXTRACTION_MEDIA) {
      setUrl(joinMediaPath(mediaStorage, src));
      return;
    }

    let isMounted = true;
    let objectUrl: string | undefined;
    setUrl(undefined);

    void apiClient
      .get<Blob>(API_CONFIG.ENDPOINTS.MEDIA.GET(mediaPath), {responseType: "blob"})
      .then((response) => {
        const redirectPath = response.headers["x-accel-redirect"];
        if (response.data.size === 0 && redirectPath) {
          if (isMounted) setUrl(new URL(redirectPath, mediaStorage).href);
          return;
        }
        if (response.data.size === 0) throw new Error("Media response is empty");

        objectUrl = URL.createObjectURL(response.data);
        if (isMounted) {
          setUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch((error) => {
        console.error("Failed to load media", error);
      });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaStorage, src]);

  return url;
}
