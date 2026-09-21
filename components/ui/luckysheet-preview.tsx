"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LUCKYSHEET_MESSAGE_SCOPE = "luckysheet-preview";

function createFrameDocument(frameId: string) {
  const serializedFrameId = JSON.stringify(frameId);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet@2.1.13/dist/plugins/css/pluginsCss.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet@2.1.13/dist/plugins/plugins.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet@2.1.13/dist/css/luckysheet.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/luckysheet@2.1.13/dist/assets/iconfont/iconfont.css" />
    <style>
      html, body, #luckysheet { height: 100%; width: 100%; margin: 0; overflow: hidden; }
      body { background: #f4f4f5; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/luckysheet@2.1.13/dist/plugins/js/plugin.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/luckysheet@2.1.13/dist/luckysheet.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/luckyexcel@1.0.1/dist/luckyexcel.umd.js"></script>
  </head>
  <body>
    <div id="luckysheet"></div>
    <script>
      (function () {
        var frameId = ${serializedFrameId};
        var activeRequestId = 0;
        var workbookReady = false;
        var pendingTarget = null;
        var navigationId = 0;
        var sheetActivationId = 0;
        var controlledNavigation = null;

        function notify(type, requestId) {
          window.parent.postMessage({
            scope: "${LUCKYSHEET_MESSAGE_SCOPE}",
            frameId: frameId,
            requestId: requestId,
            type: type
          }, "*");
        }

        function isCellTarget(target) {
          return target && typeof target.sheetName === "string" && typeof target.cellRef === "string";
        }

        function toCellRef(row, column) {
          var letters = "";
          for (var value = column + 1; value > 0; value = Math.floor((value - 1) / 26)) {
            letters = String.fromCharCode(65 + (value - 1) % 26) + letters;
          }
          return letters + String(row + 1);
        }

        function decodeXmlSheetName(sheetName) {
          if (sheetName.indexOf("&") === -1) return sheetName;

          var decoder = document.createElement("textarea");
          decoder.innerHTML = sheetName;
          return decoder.value;
        }

        function getSelectedCellTarget(sheet, ranges) {
          var range = ranges && ranges[ranges.length - 1];
          var row = range && (Number.isInteger(range.row_focus) ? range.row_focus : range.row && range.row[0]);
          var column = range && (Number.isInteger(range.column_focus) ? range.column_focus : range.column && range.column[0]);
          if (!sheet || typeof sheet.name !== "string" || !Number.isInteger(row) || !Number.isInteger(column)) return null;

          return { cellRef: toCellRef(row, column), sheetName: sheet.name };
        }

        function notifySelectedCell(sheet, ranges, requestId) {
          var target = getSelectedCellTarget(sheet, ranges);
          if (!target) return;

          window.parent.postMessage({
            scope: "${LUCKYSHEET_MESSAGE_SCOPE}",
            frameId: frameId,
            requestId: requestId,
            target: target,
            type: "cellSelected"
          }, "*");
        }

        function getFocusedRanges(sheet) {
          var ranges = null;
          if (typeof window.luckysheet.getluckysheet_select_save === "function") {
            ranges = window.luckysheet.getluckysheet_select_save();
          }
          if ((!Array.isArray(ranges) || ranges.length === 0) && sheet && Array.isArray(sheet.luckysheet_select_save)) {
            ranges = sheet.luckysheet_select_save;
          }
          if (!Array.isArray(ranges) || ranges.length === 0) {
            ranges = window.luckysheet.getRange();
          }
          return ranges;
        }

        function scheduleActivatedSheetReport(expectedIndex, requestId) {
          var currentSheetActivationId = ++sheetActivationId;
          setTimeout(function () {
            if (currentSheetActivationId !== sheetActivationId || requestId !== activeRequestId || !workbookReady || controlledNavigation) return;

            var sheet = window.luckysheet.getSheet();
            if (!sheet || String(sheet.index) !== String(expectedIndex)) return;
            notifySelectedCell(sheet, getFocusedRanges(sheet), requestId);
          }, 0);
        }

        function finishControlledNavigation(navigation) {
          if (controlledNavigation !== navigation) return;
          clearTimeout(navigation.timeoutId);
          controlledNavigation = null;
        }

        function cancelControlledNavigation() {
          if (!controlledNavigation) return;
          clearTimeout(controlledNavigation.timeoutId);
          controlledNavigation = null;
        }

        function interruptControlledNavigation() {
          navigationId += 1;
          cancelControlledNavigation();
        }

        function isControlledSelection(sheet, ranges) {
          if (!controlledNavigation || !sheet || String(sheet.index) !== controlledNavigation.sheetIndex) return false;
          if (controlledNavigation.phase === "activating") return true;

          var target = getSelectedCellTarget(sheet, ranges);
          return target && target.cellRef === controlledNavigation.cellRef;
        }

        function navigateToTarget(target, requestId) {
          if (requestId !== activeRequestId || !workbookReady || !isCellTarget(target)) return;

          var sheet = window.luckysheet.getSheet({ name: target.sheetName });
          var order = sheet ? Number(sheet.order) : NaN;
          if (!Number.isInteger(order)) return;

          var currentNavigationId = ++navigationId;
          cancelControlledNavigation();
          var navigation = {
            cellRef: target.cellRef,
            phase: "activating",
            sheetIndex: String(sheet.index),
            timeoutId: null
          };
          controlledNavigation = navigation;
          navigation.timeoutId = setTimeout(function () {
            if (controlledNavigation === navigation) navigationId += 1;
            finishControlledNavigation(navigation);
          }, 1000);

          try {
            window.luckysheet.setSheetActive(order, {
              success: function () {
                if (requestId !== activeRequestId || currentNavigationId !== navigationId) {
                  finishControlledNavigation(navigation);
                  return;
                }

                try {
                  navigation.phase = "selecting";
                  window.luckysheet.setRangeShow(target.cellRef, {
                    order: order,
                    success: function () {
                      if (requestId !== activeRequestId || currentNavigationId !== navigationId) {
                        finishControlledNavigation(navigation);
                        return;
                      }

                      var ranges = window.luckysheet.getRange();
                      var range = ranges && ranges[0];
                      if (range) {
                        window.luckysheet.scroll({
                          targetRow: range.row[0],
                          targetColumn: range.column[0]
                        });
                      }

                      finishControlledNavigation(navigation);
                    }
                  });
                } catch (_) {
                  finishControlledNavigation(navigation);
                }
              }
            });
            if (controlledNavigation === navigation && navigation.phase === "activating") {
              navigation.phase = "activated";
            }
          } catch (_) {
            finishControlledNavigation(navigation);
          }
        }

        function setPendingTarget(target, requestId) {
          if (requestId !== activeRequestId) return;
          pendingTarget = isCellTarget(target) ? target : null;
          navigationId += 1;
          cancelControlledNavigation();
          if (pendingTarget && workbookReady) navigateToTarget(pendingTarget, requestId);
        }

        window.addEventListener("message", function (event) {
          var message = event.data;
          if (event.source !== window.parent || !message || message.scope !== "${LUCKYSHEET_MESSAGE_SCOPE}" || message.frameId !== frameId) return;

          if (message.type === "navigate") {
            setPendingTarget(message.target, message.requestId);
            return;
          }
          if (message.type !== "load" || typeof message.requestId !== "number") return;
          if (message.requestId === activeRequestId) {
            setPendingTarget(message.target, message.requestId);
            return;
          }
          if (message.requestId < activeRequestId) return;

          activeRequestId = message.requestId;
          var requestId = message.requestId;
          workbookReady = false;
          pendingTarget = isCellTarget(message.target) ? message.target : null;
          navigationId += 1;
          sheetActivationId += 1;
          cancelControlledNavigation();
          var file = new File([message.blob], message.fileName, { type: message.blob.type });

          if (!window.LuckyExcel || !window.luckysheet) {
            notify("error", requestId);
            return;
          }

          try {
            LuckyExcel.transformExcelToLucky(file, function (exportJson) {
              if (requestId !== activeRequestId) return;
              if (!exportJson.sheets || exportJson.sheets.length === 0) {
                notify("error", requestId);
                return;
              }

               exportJson.sheets.forEach(function (sheet) {
                  // LuckyExcel preserves XML entities in worksheet names. Decode once before Luckysheet stores them.
                  if (typeof sheet.name === "string") sheet.name = decodeXmlSheetName(sheet.name);
                  (sheet.celldata || []).forEach(function (cell) {
                   if (cell.v && cell.v.f) delete cell.v.f;
                 });
                 sheet.calcChain = [];
                 sheet.config = sheet.config || {};
                 sheet.config.authority = Object.assign({}, sheet.config.authority, {
                   sheet: 1,
                   editObjects: 0,
                   selectLockedCells: 1,
                   selectunLockedCells: 1
                 });
               });

              try {
                window.luckysheet.destroy();
              } catch (_) {}

              try {
                window.luckysheet.create({
                   container: "luckysheet",
                   allowEdit: false,
                   editMode: false,
                   enableAddRow: false,
                   enableAddCol: false,
                   data: exportJson.sheets,
                   showinfobar: false,
                   showstatisticBar: false,
                   showsheetbarConfig: { add: false, menu: false },
                    showtoolbar: false,
                    hook: {
                      imageInsertBefore: function () { return false; },
                      imageUpdateBefore: function () { return false; },
                      imageDeleteBefore: function () { return false; },
                      rangeSelect: function (sheet, ranges) {
                        sheetActivationId += 1;
                        if (requestId !== activeRequestId || !workbookReady) return;
                        if (controlledNavigation) {
                          if (isControlledSelection(sheet, ranges)) return;
                          interruptControlledNavigation();
                        }
                        notifySelectedCell(sheet, ranges, requestId);
                      },
                      sheetActivate: function (index) {
                        if (requestId !== activeRequestId || !workbookReady) return;
                        if (controlledNavigation) {
                          if (String(index) === controlledNavigation.sheetIndex) {
                            sheetActivationId += 1;
                            return;
                          }
                          interruptControlledNavigation();
                        }
                        scheduleActivatedSheetReport(index, requestId);
                      },
                      workbookCreateAfter: function () {
                        if (requestId !== activeRequestId) return;
                        workbookReady = true;
                        notify("loaded", requestId);
                        if (pendingTarget) navigateToTarget(pendingTarget, requestId);
                      }
                    },
                    title: exportJson.info && exportJson.info.name ? exportJson.info.name : message.fileName,
                   userInfo: false
                 });
               } catch (_) {
                notify("error", requestId);
              }
            }, function () {
              if (requestId === activeRequestId) notify("error", requestId);
            });
          } catch (_) {
            notify("error", requestId);
          }
        });

        notify("ready", 0);
      })();
    </script>
  </body>
</html>`;
}

export type LuckysheetCellTarget = {
  cellRef: string;
  sheetName: string;
};

function isSameCellTarget(
  left: LuckysheetCellTarget | null,
  right: LuckysheetCellTarget | null,
) {
  return left !== null && right !== null &&
    left.cellRef === right.cellRef && left.sheetName === right.sheetName;
}

type LuckysheetPreviewProps = {
  blob: Blob;
  className?: string;
  errorLabel: string;
  fileName: string;
  loadingLabel: string;
  onCellSelect?: (target: LuckysheetCellTarget) => void;
  targetCell?: LuckysheetCellTarget | null;
};

export function LuckysheetPreview({
  blob,
  className,
  errorLabel,
  fileName,
  loadingLabel,
  onCellSelect,
  targetCell,
}: LuckysheetPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const requestIdRef = useRef(0);
  const skipNavigationForCellRef = useRef<LuckysheetCellTarget | null>(null);
  const reactId = useId();
  const frameId = `luckysheet-${reactId}`;
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const readTargetCell = useEffectEvent(() => targetCell ?? null);
  const reportCellSelect = useEffectEvent((target: LuckysheetCellTarget) => onCellSelect?.(target));

  useEffect(() => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) return;

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setStatus("loading");

    const sendFile = () => {
      frameWindow.postMessage({
        blob,
        fileName,
        frameId,
        requestId,
        scope: LUCKYSHEET_MESSAGE_SCOPE,
        target: readTargetCell(),
        type: "load",
      }, "*");
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frameWindow) return;
      const message = event.data as {frameId?: string; requestId?: number; scope?: string; target?: LuckysheetCellTarget; type?: string} | null;
      if (!message || message.scope !== LUCKYSHEET_MESSAGE_SCOPE || message.frameId !== frameId) return;
      if (message.type === "ready") {
        sendFile();
      } else if (message.requestId === requestId && message.type === "loaded") {
        setStatus("loaded");
      } else if (
        message.requestId === requestId &&
        message.type === "cellSelected" &&
        message.target?.cellRef &&
        message.target.sheetName
      ) {
        if (!isSameCellTarget(message.target, readTargetCell())) {
          skipNavigationForCellRef.current = message.target;
        }
        reportCellSelect(message.target);
      } else if (message.requestId === requestId && message.type === "error") {
        setStatus("error");
      }
    };

    window.addEventListener("message", handleMessage);
    sendFile();
    return () => window.removeEventListener("message", handleMessage);
  }, [blob, fileName, frameId]);

  const targetCellRef = targetCell?.cellRef ?? "";
  const targetSheetName = targetCell?.sheetName ?? "";
  useEffect(() => {
    const frameWindow = frameRef.current?.contentWindow;
    const requestId = requestIdRef.current;
    if (!frameWindow || requestId === 0) return;
    if (isSameCellTarget(skipNavigationForCellRef.current, targetCell ?? null)) {
      skipNavigationForCellRef.current = null;
      return;
    }

    frameWindow.postMessage({
      frameId,
      requestId,
      scope: LUCKYSHEET_MESSAGE_SCOPE,
      target: targetCellRef && targetSheetName
        ? {cellRef: targetCellRef, sheetName: targetSheetName}
        : null,
      type: "navigate",
    }, "*");
  }, [frameId, targetCellRef, targetSheetName]);

  return (
    <div className={cn("relative min-h-0 overflow-hidden bg-muted/70", className)}>
      <iframe
        className="h-full w-full border-0"
        ref={frameRef}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={createFrameDocument(frameId)}
        title={fileName}
      />
      {status !== "loaded" ? (
        <div className={cn(
          "absolute inset-0 grid place-items-center bg-muted/90 px-6 text-center text-sm",
          status === "error" ? "text-destructive" : "text-muted-foreground",
        )}>
          {status === "error" ? errorLabel : loadingLabel}
        </div>
      ) : null}
    </div>
  );
}
