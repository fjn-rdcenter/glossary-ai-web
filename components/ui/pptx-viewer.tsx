"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  createViewerResource,
  type ViewerContentBytes,
  type ViewerResource,
} from "@/lib/viewer-resource";

import { PptxViewerFallback } from "./pptx-viewer-fallback";
import type { PptxSourceLoadTiming } from "./pptx-viewer-core";
import type { PptxViewerProps } from "./pptx-viewer-types";
import { useIsClient } from "./use-is-client";
import { ViewerControls } from "./viewer-controls";
import { ViewerErrorBoundary } from "./viewer-error";

export type { PptxDocumentSource, PptxViewerProps } from "./pptx-viewer-types";
export type {
  PptxSourceLoadTiming,
  PptxSlideRenderTiming,
  PptxSlideOverlayProps,
} from "./pptx-viewer-core";

type PptxPreviewModule = typeof import("pptx-preview");
type PptxPreviewer = ReturnType<PptxPreviewModule["init"]>;

let pptxPreviewModulePromise: Promise<PptxPreviewModule> | null = null;

function loadPptxPreview(): Promise<PptxPreviewModule> {
  if (!pptxPreviewModulePromise) {
    pptxPreviewModulePromise = import("pptx-preview");
  }
  return pptxPreviewModulePromise;
}

export function preloadPptxViewer() {
  void loadPptxPreview();
}

export type PptxResourceContentProps = Omit<PptxViewerProps, "source"> & {
  resource: ViewerResource;
};

export function PptxViewer(props: PptxViewerProps) {
  const { source, ...resourceProps } = props;
  const resource = React.useMemo(() => createViewerResource(source), [source]);
  return <PptxResourceContent {...resourceProps} resource={resource} />;
}

export function PptxResourceContent(props: PptxResourceContentProps) {
  const isClient = useIsClient();
  const resource = props.resource;

  if (!isClient) {
    return (
      <PptxViewerFallback
        className={props.className}
        bare={props.bare}
        fallbackSlideSize={props.fallbackSlideSize}
        controls={props.controls}
      />
    );
  }

  return (
    <ViewerErrorBoundary
      className={props.className}
      bare={props.bare}
      download={
        props.controls === false || props.download === false
          ? null
          : resource.originalDownload
      }
      format="pptx"
      resetKey={resource.keys.resource}
      sourceKind={resource.sourceKind}
    >
      <PptxViewerContent {...props} resource={resource} />
    </ViewerErrorBoundary>
  );
}

function PptxViewerContent({
  resource,
  className,
  controls = true,
  download = true,
  onSourceLoadTiming,
  bare = false,
}: Omit<PptxViewerProps, "source"> & { resource: ViewerResource }) {
  const downloadAction = download ? resource.originalDownload : null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        bare ? "h-full bg-muted/20" : "rounded-xl border bg-muted/30",
        className,
      )}
      data-slot="pptx-viewer"
    >
      {controls ? (
        <ViewerControls downloads={downloadAction ? [downloadAction] : []} />
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <PptxPreviewSurface
          content={resource.content}
          onSourceLoadTiming={onSourceLoadTiming}
        />
      </div>
    </div>
  );
}

function PptxPreviewSurface({
  content,
  onSourceLoadTiming,
}: {
  content: ViewerContentBytes;
  onSourceLoadTiming?: (timing: PptxSourceLoadTiming) => void;
}) {
  const [host, setHost] = React.useState<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = React.useState<number | null>(null);
  const [renderWidth, setRenderWidth] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const activePreviewerRef = React.useRef<PptxPreviewer | null>(null);

  React.useLayoutEffect(() => {
    if (!host) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(host.clientWidth);
      setMeasuredWidth((current) =>
        current === nextWidth ? current : nextWidth,
      );
    };

    updateWidth();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, [host]);

  React.useEffect(() => {
    if (!measuredWidth || measuredWidth <= 0) return;

    // A dialog or sidebar resize emits several intermediate widths. Rendering
    // only after it settles avoids repeatedly rebuilding the whole deck.
    const timeout = window.setTimeout(() => {
      setRenderWidth((current) =>
        current === measuredWidth ? current : measuredWidth,
      );
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [measuredWidth]);

  React.useEffect(() => {
    if (!host || !renderWidth || renderWidth <= 0) return;

    let isCurrent = true;
    let nextPreviewer: PptxPreviewer | null = null;
    let isCommitted = false;
    const stagingHost = document.createElement("div");
    stagingHost.setAttribute("aria-hidden", "true");
    stagingHost.style.cssText =
      `position:absolute;visibility:hidden;pointer-events:none;width:${renderWidth}px;`;
    host.append(stagingHost);
    const startedAt = now();
    const importStartedAt = now();
    const readBytesStartedAt = now();
    const modulePromise = loadPptxPreview().then((module) => ({
      module,
      durationMs: now() - importStartedAt,
    }));
    const bytesPromise = content.readBytes().then((bytes) => ({
      bytes,
      durationMs: now() - readBytesStartedAt,
    }));

    setError(null);
    setIsLoading(true);
    void Promise.all([modulePromise, bytesPromise])
      .then(async ([previewModule, byteResult]) => {
        if (!isCurrent) return;

        const previewStartedAt = now();
        nextPreviewer = previewModule.module.init(stagingHost, {
          mode: "list",
          width: renderWidth,
        });
        nextPreviewer.wrapper.style.background = "transparent";
        await nextPreviewer.preview(byteResult.bytes);
        if (!isCurrent) return;

        const previousPreviewer = activePreviewerRef.current;
        host.replaceChildren(nextPreviewer.wrapper);
        activePreviewerRef.current = nextPreviewer;
        isCommitted = true;
        previousPreviewer?.destroy();

        onSourceLoadTiming?.({
          byteLength: byteResult.bytes.byteLength,
          importPptxMs: previewModule.durationMs,
          inspectMs: 0,
          loadFileMs: now() - previewStartedAt,
          readBytesMs: byteResult.durationMs,
          readSlideSizeMs: 0,
          slideCount: nextPreviewer.slideCount,
          totalMs: now() - startedAt,
        });
        setIsLoading(false);
      })
      .catch((cause: unknown) => {
        if (!isCurrent) return;
        nextPreviewer?.destroy();
        stagingHost.replaceChildren();
        stagingHost.remove();
        setError(cause);
      });

    return () => {
      isCurrent = false;
      if (isCommitted) return;
      nextPreviewer?.destroy();
      stagingHost.replaceChildren();
      stagingHost.remove();
    };
  }, [content, host, onSourceLoadTiming, renderWidth]);

  React.useEffect(() => {
    if (!host) return;
    return () => {
      activePreviewerRef.current?.destroy();
      activePreviewerRef.current = null;
      host.replaceChildren();
    };
  }, [host]);

  if (error) throw error;

  return (
    <div
      ref={setHost}
      aria-busy={isLoading}
      className="min-h-36 w-full"
      data-slot="pptx-preview-surface"
    />
  );
}

function now() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
