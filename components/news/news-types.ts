export interface NewsAuthor {
  id: number;
  name: string;
  picture?: string | null;
}

export interface NewsAttachment {
  fileId: number;
  name: string;
  type: string; // "IMAGE" | "PDF" | "DOCX" | "OTHER" etc.
}

export interface NewsSummary {
  id: number;
  title: string;
  description: string;
  toDate?: string;
  category?: string;
  author?: NewsAuthor;
  read: boolean;
  response?: boolean;
  hasAttachment?: boolean;
  creDate?: string;
  newsConfirm?: unknown;
}

export interface NewsDetail {
  id: number;
  title: string;
  description: string;
  strippedDescription?: string;
  fromDate?: string;
  toDate?: string;
  category?: string;
  author?: NewsAuthor;
  read: boolean;
  responseLabel?: string;
  attachments?: NewsAttachment[];
  toTeacher?: boolean;
  toParent?: boolean;
  toStudent?: boolean;
  groupRecipients?: string[];
  teamRecipients?: string[];
  orgId?: number;
}

export type ViewMode = "split" | "grid";
export type SortOrder = "newest" | "oldest";

export interface NewsFilterState {
  search: string;
  category: string;
  unreadOnly: boolean;
  hasAttachmentsOnly: boolean;
  sort: SortOrder;
}

/* ── Helper: Clean HTML to preview text ─────────────────── */
export function stripHtml(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Helper: Format Relative & Display Dates ─────────────── */
export function formatNewsDate(dateStr?: string): {
  relative: string;
  full: string;
  isRecent: boolean;
} {
  if (!dateStr) return { relative: "Unknown date", full: "", isRecent: false };

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { relative: dateStr, full: dateStr, isRecent: false };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const full = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isRecent = diffHours >= 0 && diffHours < 48;

  if (diffHours >= 0 && diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return { relative: `${mins}m ago`, full, isRecent: true };
  }
  if (diffHours >= 1 && diffHours < 24) {
    return { relative: `${diffHours}h ago`, full, isRecent: true };
  }
  if (diffDays === 1) {
    return { relative: "Yesterday", full, isRecent: true };
  }
  if (diffDays > 1 && diffDays < 7) {
    return { relative: `${diffDays}d ago`, full, isRecent: false };
  }

  // Format as "May 27, 2026" or "May 27"
  const sameYear = d.getFullYear() === now.getFullYear();
  const relative = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  return { relative, full, isRecent: false };
}

/* ── Helper: Check Expiration ────────────────────────────── */
export function getExpiryStatus(toDateStr?: string): {
  isExpired: boolean;
  expiresSoon: boolean;
  label: string;
} {
  if (!toDateStr) return { isExpired: false, expiresSoon: false, label: "" };

  const toDate = new Date(toDateStr);
  if (isNaN(toDate.getTime())) return { isExpired: false, expiresSoon: false, label: "" };

  const now = new Date();
  const diffMs = toDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return {
      isExpired: true,
      expiresSoon: false,
      label: `Expired ${toDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    };
  }

  if (diffDays <= 3) {
    return {
      isExpired: false,
      expiresSoon: true,
      label: diffDays === 1 ? "Expires tomorrow" : `Expires in ${diffDays} days`,
    };
  }

  return {
    isExpired: false,
    expiresSoon: false,
    label: `Active until ${toDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  };
}

/* ── Helper: Estimated reading time ──────────────────────── */
export function getReadingTime(text?: string): string {
  const clean = stripHtml(text);
  const words = clean.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/* ── Helper: Initials for avatar fallback ────────────────── */
export function getAuthorInitials(name?: string): string {
  if (!name) return "NN";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Helper: File attachment categorizer ─────────────────── */
export type AttachmentCategory = "image" | "pdf" | "document" | "spreadsheet" | "presentation" | "archive" | "audio" | "video" | "file";

export function getAttachmentInfo(attachment: NewsAttachment): {
  category: AttachmentCategory;
  extension: string;
  downloadUrl: string;
  isImage: boolean;
} {
  const name = attachment.name || "";
  const dotIndex = name.lastIndexOf(".");
  const extension = dotIndex !== -1 ? name.slice(dotIndex + 1).toLowerCase() : "";

  const typeUpper = (attachment.type || "").toUpperCase();
  const isImg = typeUpper === "IMAGE" || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension);

  let category: AttachmentCategory = "file";
  if (isImg) {
    category = "image";
  } else if (typeUpper === "PDF" || extension === "pdf") {
    category = "pdf";
  } else if (["doc", "docx", "txt", "rtf", "odt", "pages"].includes(extension)) {
    category = "document";
  } else if (["xls", "xlsx", "csv", "numbers"].includes(extension)) {
    category = "spreadsheet";
  } else if (["ppt", "pptx", "key"].includes(extension)) {
    category = "presentation";
  } else if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    category = "archive";
  } else if (["mp3", "wav", "m4a", "ogg"].includes(extension)) {
    category = "audio";
  } else if (["mp4", "mov", "avi", "webm"].includes(extension)) {
    category = "video";
  }

  const fileTypeParam = isImg ? "image" : "attachment";
  const downloadUrl = `/api/file?id=${attachment.fileId}&type=${fileTypeParam}&responseType=redirect`;

  return {
    category,
    extension: extension || typeUpper || "FILE",
    downloadUrl,
    isImage: isImg,
  };
}
