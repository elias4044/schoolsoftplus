'use client';

import Link from 'next/link';
import { ArrowUpRight, Paperclip } from 'lucide-react';

import { stripHtml, type NewsSummary } from '@/components/news/news-types';

import { listData, useWidgetResource, WidgetContent, WidgetRow, WidgetTag } from './WidgetContent';

type NewsItem = NewsSummary & { preview?: string | null };

const publishedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function newsDate(item: NewsItem) {
  const date = new Date(item.creDate ?? '');
  return Number.isFinite(date.getTime()) ? publishedDate.format(date) : undefined;
}

export default function NewsWidget() {
  const resource = useWidgetResource('/api/news', listData<NewsItem>);
  return (
    <WidgetContent resource={resource} empty="No school news to show.">
      {(news) => {
        if (!news.length) return null;
        const [lead, ...rest] = news;
        const preview = stripHtml(lead.preview || lead.description);
        return (
          <>
            <Link
              href={`/news?id=${lead.id}`}
              prefetch={false}
              className="widgetFeatureLink block rounded-lg px-3 py-2.5"
            >
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                {lead.read === false && <WidgetTag active>Unread</WidgetTag>}
                <span className="min-w-0 flex-1 truncate">
                  {[lead.category, newsDate(lead)].filter(Boolean).join(' / ')}
                </span>
                {lead.hasAttachment && (
                  <Paperclip aria-label="Attachment" className="size-3.5 shrink-0" />
                )}
                <ArrowUpRight aria-hidden className="size-4 shrink-0" />
              </span>
              <span className="mt-1 line-clamp-2 block text-base leading-snug font-semibold">
                {lead.title}
              </span>
              {preview && (
                <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed">
                  {preview}
                </span>
              )}
            </Link>
            {rest.slice(0, 7).map((item) => (
              <WidgetRow
                key={item.id}
                title={item.title}
                detail={[item.category, item.author?.name].filter(Boolean).join(' / ')}
                aside={newsDate(item)}
                unread={item.read === false}
                href={`/news?id=${item.id}`}
              />
            ))}
          </>
        );
      }}
    </WidgetContent>
  );
}
