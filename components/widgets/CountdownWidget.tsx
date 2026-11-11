'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pin, Plus } from 'lucide-react';

import type { WidgetSize } from '@/lib/widgets/types';

import { listData, useWidgetResource, WidgetContent, WidgetRow, WidgetTag } from './WidgetContent';

interface Countdown {
  id: string;
  title: string;
  targetDate: number;
  pinned: boolean;
  archived: boolean;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function timeUnits(target: number, now: number) {
  const seconds = Math.max(0, Math.ceil((target - now) / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days)
    return [
      { value: days, label: 'days' },
      { value: hours, label: 'hrs' },
    ];
  if (hours)
    return [
      { value: hours, label: 'hrs' },
      { value: minutes, label: 'min' },
    ];
  return [
    { value: minutes, label: 'min' },
    { value: seconds % 60, label: 'sec' },
  ];
}

export default function CountdownWidget({ size }: { size: WidgetSize }) {
  const resource = useWidgetResource(
    '/api/countdowns',
    (data) => listData<Countdown>(data, 'countdowns'),
    0
  );
  const [now, setNow] = useState(Date.now);
  const hasUpcoming = resource.data?.some((item) => !item.archived && item.targetDate > now);

  useEffect(() => {
    if (!hasUpcoming) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasUpcoming]);

  return (
    <WidgetContent resource={resource} empty="No countdowns yet.">
      {(data) => {
        const items = data
          .filter((item) => !item.archived && Number.isFinite(new Date(item.targetDate).getTime()))
          .sort(
            (a, b) =>
              Number(b.targetDate > now) - Number(a.targetDate > now) ||
              Number(b.pinned) - Number(a.pinned) ||
              (a.targetDate > now ? a.targetDate - b.targetDate : b.targetDate - a.targetDate)
          );
        if (!items.length)
          return (
            <Link
              href="/countdown"
              className="widgetFeatureLink flex min-h-16 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold"
            >
              <Plus aria-hidden className="size-5 shrink-0" /> Add a countdown
            </Link>
          );
        const [first, ...rest] = items;
        return (
          <>
            <div className="widgetFeature rounded-lg px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                {first.pinned && <Pin aria-label="Pinned" className="size-3.5 shrink-0" />}
                <span className="truncate">{first.title}</span>
              </p>
              {first.targetDate > now ? (
                <div className="my-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 tabular-nums">
                  {timeUnits(first.targetDate, now).map(({ value, label }) => (
                    <span key={label} className="whitespace-nowrap">
                      <span className="text-xl font-semibold tracking-tight">{value}</span>
                      <span className="text-muted-foreground ml-1 text-xs">{label}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="my-1">
                  <WidgetTag>Ended</WidgetTag>
                </p>
              )}
              <p className="text-muted-foreground text-xs">{dateFormat.format(first.targetDate)}</p>
            </div>
            {(size.endsWith('x2') || size.startsWith('4')) &&
              rest.map((item) => (
                <WidgetRow
                  key={item.id}
                  title={item.title}
                  detail={dateFormat.format(item.targetDate)}
                  aside={
                    item.targetDate <= now ? (
                      <WidgetTag>Ended</WidgetTag>
                    ) : (
                      timeUnits(item.targetDate, now)
                        .map(({ value, label }) => value + ' ' + label)
                        .join(' ')
                    )
                  }
                />
              ))}
          </>
        );
      }}
    </WidgetContent>
  );
}
