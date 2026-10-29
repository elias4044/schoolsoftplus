'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, ExternalLink, X, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface NewsImageLightboxProps {
  src: string | null;
  alt?: string;
  title?: string;
  onClose: () => void;
}

export function NewsImageLightbox({ src, alt, title, onClose }: NewsImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  const handleCopy = async () => {
    try {
      const fullUrl = src.startsWith('http') ? src : window.location.origin + src;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Content Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-card border-border relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="border-border bg-surface-1 flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-foreground max-w-xs truncate text-xs font-semibold md:max-w-md">
                {title || alt || 'Image Preview'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-surface-2 h-8 px-2.5 text-xs"
                onClick={() => setZoomed(!zoomed)}
                title={zoomed ? 'Reset zoom' : 'Zoom in'}
              >
                {zoomed ? (
                  <ZoomOut className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <ZoomIn className="mr-1 h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{zoomed ? 'Fit' : 'Zoom'}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-surface-2 h-8 px-2.5 text-xs"
                onClick={handleCopy}
                title="Copy image link"
              >
                {copied ? (
                  <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy URL'}</span>
              </Button>

              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                download
                className="text-muted-foreground hover:text-foreground hover:bg-surface-2 inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition-colors"
                title="Open original / Download"
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Save</span>
              </a>

              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-surface-2 ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div
            className={`bg-surface-0 flex min-h-[300px] flex-1 items-center justify-center overflow-auto p-4 select-none ${
              zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={() => setZoomed(!zoomed)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || 'Full size view'}
              className={`rounded-lg object-contain transition-all duration-200 ${
                zoomed ? 'max-w-none scale-125' : 'max-h-[72vh] max-w-full'
              }`}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
