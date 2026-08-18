"use client";

import { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Archive,
  FileAudio,
  FileVideo,
  File,
  Download,
  ExternalLink,
  Eye,
  Check,
  Copy,
} from "lucide-react";
import { type NewsAttachment, getAttachmentInfo, type AttachmentCategory } from "./news-types";
import { Button } from "@/components/ui/button";

interface NewsAttachmentCardProps {
  attachment: NewsAttachment;
  onPreviewImage?: (src: string, title: string) => void;
}

const CATEGORY_ICONS: Record<AttachmentCategory, React.ElementType> = {
  pdf: FileText,
  image: ImageIcon,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  archive: Archive,
  audio: FileAudio,
  video: FileVideo,
  file: File,
};

const CATEGORY_COLORS: Record<AttachmentCategory, { iconColor: string; bgColor: string }> = {
  pdf: {
    iconColor: "oklch(0.68 0.20 25)", // red
    bgColor: "oklch(0.68 0.20 25 / 10%)",
  },
  image: {
    iconColor: "oklch(0.68 0.18 240)", // blue
    bgColor: "oklch(0.68 0.18 240 / 10%)",
  },
  document: {
    iconColor: "oklch(0.70 0.16 220)", // cyan-blue
    bgColor: "oklch(0.70 0.16 220 / 10%)",
  },
  spreadsheet: {
    iconColor: "oklch(0.68 0.18 148)", // emerald/green
    bgColor: "oklch(0.68 0.18 148 / 10%)",
  },
  presentation: {
    iconColor: "oklch(0.75 0.18 70)", // amber
    bgColor: "oklch(0.75 0.18 70 / 10%)",
  },
  archive: {
    iconColor: "oklch(0.70 0.15 45)", // orange
    bgColor: "oklch(0.70 0.15 45 / 10%)",
  },
  audio: {
    iconColor: "oklch(0.68 0.18 300)", // magenta
    bgColor: "oklch(0.68 0.18 300 / 10%)",
  },
  video: {
    iconColor: "oklch(0.68 0.20 280)", // purple
    bgColor: "oklch(0.68 0.20 280 / 10%)",
  },
  file: {
    iconColor: "oklch(0.75 0 0)",
    bgColor: "oklch(1 0 0 / 8%)",
  },
};

export function NewsAttachmentCard({ attachment, onPreviewImage }: NewsAttachmentCardProps) {
  const [copied, setCopied] = useState(false);
  const info = getAttachmentInfo(attachment);
  const Icon = CATEGORY_ICONS[info.category] || File;
  const colors = CATEGORY_COLORS[info.category] || CATEGORY_COLORS.file;

  const handleCopy = async () => {
    try {
      const fullUrl = window.location.origin + info.downloadUrl;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleCardClick = () => {
    if (info.isImage && onPreviewImage) {
      onPreviewImage(info.downloadUrl, attachment.name);
    } else {
      window.open(info.downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-1 border border-border hover:border-white/20 transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
          style={{ background: colors.bgColor }}
        >
          <Icon className="w-5 h-5" style={{ color: colors.iconColor }} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[280px] md:max-w-[340px]" title={attachment.name}>
            {attachment.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-surface-2 text-muted-foreground">
              {info.extension}
            </span>
            {info.isImage && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                • Click to preview
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {info.isImage && onPreviewImage && (
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2"
            onClick={() => onPreviewImage(info.downloadUrl, attachment.name)}
            title="Preview Image"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2"
          onClick={handleCopy}
          title="Copy file URL"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </Button>

        <a
          href={info.downloadUrl}
          target="_blank"
          rel="noreferrer"
          download={attachment.name}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-surface-2 transition-colors"
          title="Download file"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
