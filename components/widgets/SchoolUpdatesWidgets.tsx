'use client';

import { useState } from 'react';

import type { AssessmentSummary, BookingSummary } from '@/lib/widgets/school-updates';

import {
  listData,
  useWidgetResource,
  WidgetContent,
  WidgetNotice,
  WidgetRow,
  WidgetTag,
} from './WidgetContent';

const bookingDate = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const schoolDate = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'short',
  timeZone: 'Europe/Stockholm',
});
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function bookingPeriod(fromDate: string, toDate: string) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end)
    return `${fromDate} - ${toDate}`;
  return bookingDate.formatRange(start, end);
}

export function ResultsWidget() {
  const resource = useWidgetResource(
    '/api/dashboard?resource=results',
    listData<AssessmentSummary>
  );
  const [unreadOnly, setUnreadOnly] = useState(false);
  return (
    <WidgetContent resource={resource} empty="No recent results.">
      {(items) => {
        if (!items.length) return null;
        const unread = items.filter((item) => !item.read);
        return (
          <>
            <div className="widgetToolbar">
              <span>{unread.length ? `${unread.length} unread` : 'All caught up'}</span>
              <label className="widgetControl">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(event) => setUnreadOnly(event.target.checked)}
                />
                Unread only
              </label>
            </div>
            {(unreadOnly ? unread : items).map((item) => (
              <WidgetRow
                key={item.id}
                title={item.title}
                detail={item.subTitle}
                unread={!item.read}
                href={`/subjects/${item.activityId}/${item.id}`}
              />
            ))}
            {unreadOnly && !unread.length && <WidgetNotice>No unread results.</WidgetNotice>}
          </>
        );
      }}
    </WidgetContent>
  );
}

export function BookingsWidget() {
  const resource = useWidgetResource('/api/dashboard?resource=bookings', listData<BookingSummary>);
  const today = schoolDate.format(new Date());
  return (
    <WidgetContent resource={resource} empty="No school bookings to show.">
      {(items) =>
        items.length
          ? items
              .map((item) => ({
                item,
                status:
                  !isoDate.test(item.fromDate) ||
                  !isoDate.test(item.toDate) ||
                  item.fromDate > item.toDate
                    ? 'Unknown'
                    : item.toDate < today
                      ? 'Closed'
                      : item.fromDate > today
                        ? 'Upcoming'
                        : 'Open',
              }))
              .sort((a, b) => {
                const order = ['Open', 'Upcoming', 'Closed', 'Unknown'];
                return (
                  order.indexOf(a.status) - order.indexOf(b.status) ||
                  (a.status === 'Closed'
                    ? b.item.toDate.localeCompare(a.item.toDate)
                    : a.item.fromDate.localeCompare(b.item.fromDate))
                );
              })
              .map(({ item, status }) => (
                <WidgetRow
                  key={item.id}
                  title={item.name}
                  detail={bookingPeriod(item.fromDate, item.toDate)}
                  aside={
                    status === 'Unknown' ? undefined : (
                      <WidgetTag active={status === 'Open'}>{status}</WidgetTag>
                    )
                  }
                  unread={!item.read}
                />
              ))
          : null
      }
    </WidgetContent>
  );
}
