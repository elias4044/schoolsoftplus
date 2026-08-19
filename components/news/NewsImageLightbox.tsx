"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ExternalLink, ZoomIn, ZoomOut, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  const handleCopy = async () => {
    try {
      const fullUrl = src.startsWith("http") ? src : window.location.origin + src;
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
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative z-10 flex flex-col max-w-5xl max-h-[90vh] w-full rounded-2xl bg-card border border-border overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-foreground truncate max-w-xs md:max-w-md">
                {title || alt || "Image Preview"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2"
                onClick={() => setZoomed(!zoomed)}
                title={zoomed ? "Reset zoom" : "Zoom in"}
              >
                {zoomed ? <ZoomOut className="w-3.5 h-3.5 mr-1" /> : <ZoomIn className="w-3.5 h-3.5 mr-1" />}
                <span className="hidden sm:inline">{zoomed ? "Fit" : "Zoom"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2"
                onClick={handleCopy}
                title="Copy image link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy URL"}</span>
              </Button>

              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                title="Open original / Download"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Save</span>
              </a>

              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors ml-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div
            className={`flex-1 overflow-auto p-4 flex items-center justify-center bg-surface-0 min-h-[300px] select-none ${
              zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
            }`}
            onClick={() => setZoomed(!zoomed)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || "Full size view"}
              className={`rounded-lg object-contain transition-all duration-200 ${
                zoomed ? "max-w-none scale-125" : "max-w-full max-h-[72vh]"
              }`}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
