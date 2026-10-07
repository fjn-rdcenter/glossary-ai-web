import type {CSSProperties} from "react";

const fileTypeStyles: Record<string, CSSProperties> = {
  DOCX: {backgroundColor: "#eff6ff", borderColor: "#8bb8f5", color: "#1d64d6"},
  HTML: {backgroundColor: "#fff4eb", borderColor: "#f4ad72", color: "#c65317"},
  JPEG: {backgroundColor: "#ecfeff", borderColor: "#82d9df", color: "#087f8c"},
  JPG: {backgroundColor: "#ecfeff", borderColor: "#82d9df", color: "#087f8c"},
  MD: {backgroundColor: "#f5f1ff", borderColor: "#b8a1f4", color: "#7048c6"},
  PDF: {backgroundColor: "#fff1f1", borderColor: "#ef9a9a", color: "#c93636"},
  PNG: {backgroundColor: "#ecfeff", borderColor: "#82d9df", color: "#087f8c"},
  PPTX: {backgroundColor: "#fff3ed", borderColor: "#efaa84", color: "#c94f16"},
  TXT: {backgroundColor: "#f4f6f8", borderColor: "#aeb8c5", color: "#526174"},
  XLSX: {backgroundColor: "#edf9f1", borderColor: "#8ac8a1", color: "#177442"},
};

const fallbackFileTypeStyle: CSSProperties = {
  backgroundColor: "#f5f3f8",
  borderColor: "#c9c3d1",
  color: "#655f6d",
};

export function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toUpperCase();

  return extension && extension !== fileName.toUpperCase() ? extension : "FILE";
}

export function getFileTypeStyle(extension: string) {
  return fileTypeStyles[extension] ?? fallbackFileTypeStyle;
}

export function FileTypeTile({
  className = "size-12 rounded-[8px]",
  fileName,
}: {
  className?: string;
  fileName: string;
}) {
  const extension = getFileExtension(fileName);

  return (
    <span
      aria-hidden="true"
      className={"grid shrink-0 place-items-center border text-[10px] font-extrabold tracking-[0.03em] " + className}
      style={getFileTypeStyle(extension)}
    >
      {extension.slice(0, 5)}
    </span>
  );
}
