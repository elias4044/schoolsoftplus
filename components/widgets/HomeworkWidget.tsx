'use client';

import { useState } from 'react';

import type { AssignmentSummary } from '@/lib/widgets/school-updates';

import {
  listData,
  useWidgetResource,
  WidgetContent,
  WidgetNotice,
  WidgetRow,
  WidgetTag,
} from './WidgetContent';

const schoolDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  dateStyle: 'short',
});
const schoolTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  hour: '2-digit',
  minute: '2-digit',
});
const dueDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

function isSubmitted(assignment: AssignmentSummary) {
  return ['SUBMITTED', 'FINISHED'].includes(assignment.submissionStatus);
}

function dueLabel(value: string, today: string) {
  const day = value.slice(0, 10);
  if (day === today) return 'Today';
  const date = new Date(day + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) ? dueDate.format(date) : undefined;
}

export default function HomeworkWidget() {
  const resource = useWidgetResource(
    '/api/dashboard?resource=assignments',
    listData<AssignmentSummary>
  );
  const [hideSubmitted, setHideSubmitted] = useState(false);
  const now = new Date();
  const today = schoolDate.format(now);
  const currentTime = schoolTime.format(now);

  return (
    <WidgetContent resource={resource} empty="No assignments on this week's list.">
      {(data) => {
        if (!data.length) return null;
        const rank = (item: AssignmentSummary) => {
          if (isSubmitted(item)) return 2;
          const day = item.sortDate.slice(0, 10);
          const time = item.sortDate.slice(11, 16);
          return day > today || (day === today && (!time || time >= currentTime)) ? 0 : 1;
        };
        const items = data
          .filter((item) => !hideSubmitted || !isSubmitted(item))
          .sort(
            (a, b) =>
              rank(a) - rank(b) ||
              (rank(a) === 0
                ? a.sortDate.localeCompare(b.sortDate)
                : b.sortDate.localeCompare(a.sortDate))
          );
        return (
          <>
            <div className="widgetToolbar">
              <span>{data.filter((item) => rank(item) === 0).length} upcoming</span>
              <label className="widgetControl">
                <input
                  type="checkbox"
                  checked={hideSubmitted}
                  onChange={(event) => setHideSubmitted(event.target.checked)}
                />
                Hide submitted
              </label>
            </div>
            {items.map((item) => {
              const submitted = isSubmitted(item);
              const due = dueLabel(item.sortDate, today);
              const time = item.sortDate.slice(11, 16);
              const [, ...details] = item.subTitle.split(', ');
              return (
                <WidgetRow
                  key={item.id}
                  title={item.title}
                  detail={details.join(', ') || item.subTitle}
                  aside={
                    submitted || due ? (
                      <span className="grid justify-items-end gap-0.5">
                        <WidgetTag active={rank(item) === 0 && due === 'Today'}>
                          {submitted ? 'Submitted' : due}
                        </WidgetTag>
                        {!submitted && /^\d{2}:\d{2}$/.test(time) && <span>{time}</span>}
                      </span>
                    ) : undefined
                  }
                  unread={!item.read}
                  href={`/subjects/${item.activityId}/${item.id}`}
                />
              );
            })}
            {!items.length && <WidgetNotice>All listed assignments are submitted.</WidgetNotice>}
          </>
        );
      }}
    </WidgetContent>
  );
}
