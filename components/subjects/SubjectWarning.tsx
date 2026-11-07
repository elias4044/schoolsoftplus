'use client';

import { TriangleAlert } from 'lucide-react';

import { useCachedResource } from '@/lib/cache';
import { fetchSubjectSection } from '@/lib/cache/subjects';

export function SubjectWarning({
  id,
  holisticId,
  force,
}: {
  id: string;
  holisticId: number;
  force: boolean;
}) {
  const warning = useCachedResource(`subjects:section:${id}:${holisticId}:warning`, (refresh) =>
    fetchSubjectSection(id, holisticId, 'warning', force || refresh)
  );
  const data = warning.data?.data;
  if (!data?.active || !data.published) return null;
  return (
    <section className="subject-panel subject-warning mb-6 p-5" aria-label="Subject warning">
      <h2 className="flex items-center gap-2 font-semibold">
        <TriangleAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        Subject warning
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Your teacher has flagged a risk of not meeting the subject requirements.
      </p>
      <div
        className="subject-copy mt-4 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: data.comment }}
      />
      {(data.lastUpdatedBy || data.lastUpdatedAt || data.publishedAt) && (
        <p className="text-muted-foreground mt-4 text-xs">
          {data.lastUpdatedBy}
          {data.lastUpdatedBy && (data.lastUpdatedAt || data.publishedAt) ? ' / ' : ''}
          {data.lastUpdatedAt || data.publishedAt}
        </p>
      )}
      {warning.error && (
        <p className="text-muted-foreground mt-3 text-xs" role="status">
          Showing the saved warning. Could not refresh.{' '}
          <button className="min-h-11 underline" onClick={() => warning.refresh()}>
            Try again
          </button>
        </p>
      )}
    </section>
  );
}
