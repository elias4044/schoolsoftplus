'use client';

import { useState } from 'react';
import {
  Archive,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  File,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Presentation,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

import { getAttachmentInfo, type AttachmentCategory, type NewsAttachment } from './news-types';

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
    iconColor: 'oklch(0.68 0.20 25)', // red
    bgColor: 'oklch(0.68 0.20 25 / 10%)',
  },
  image: {
    iconColor: 'oklch(0.68 0.18 240)', // blue
    bgColor: 'oklch(0.68 0.18 240 / 10%)',
  },
  document: {
    iconColor: 'oklch(0.70 0.16 220)', // cyan-blue
    bgColor: 'oklch(0.70 0.16 220 / 10%)',
  },
  spreadsheet: {
    iconColor: 'oklch(0.68 0.18 148)', // emerald/green
    bgColor: 'oklch(0.68 0.18 148 / 10%)',
  },
  presentation: {
    iconColor: 'oklch(0.75 0.18 70)', // amber
    bgColor: 'oklch(0.75 0.18 70 / 10%)',
  },
  archive: {
    iconColor: 'oklch(0.70 0.15 45)', // orange
    bgColor: 'oklch(0.70 0.15 45 / 10%)',
  },
  audio: {
    iconColor: 'oklch(0.68 0.18 300)', // magenta
    bgColor: 'oklch(0.68 0.18 300 / 10%)',
  },
  video: {
    iconColor: 'oklch(0.68 0.20 280)', // purple
    bgColor: 'oklch(0.68 0.20 280 / 10%)',
  },
  file: {
    iconColor: 'oklch(0.75 0 0)',
    bgColor: 'oklch(1 0 0 / 8%)',
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
      window.open(info.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-surface-1 border-border relative flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all hover:border-white/20 active:scale-[0.99]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: colors.bgColor }}
        >
          <Icon className="h-5 w-5" style={{ color: colors.iconColor }} />
        </div>

        <div className="min-w-0">
          <p
            className="text-foreground max-w-[200px] truncate text-xs font-semibold sm:max-w-[280px] md:max-w-[340px]"
            title={attachment.name}
          >
            {attachment.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="py-0.2 bg-surface-2 text-muted-foreground rounded px-1.5 text-[10px] font-bold uppercase">
              {info.extension}
            </span>
            {info.isImage && (
              <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                • Click to preview
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {info.isImage && onPreviewImage && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-surface-2 h-8 w-8 rounded-lg"
            onClick={() => onPreviewImage(info.downloadUrl, attachment.name)}
            title="Preview Image"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-surface-2 h-8 w-8 rounded-lg"
          onClick={handleCopy}
          title="Copy file URL"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </Button>

        <a
          href={info.downloadUrl}
          target="_blank"
          rel="noreferrer"
          download={attachment.name}
          className="text-muted-foreground hover:text-primary hover:bg-surface-2 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          title="Download file"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
