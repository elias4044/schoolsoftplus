import { BadgeCheck } from 'lucide-react';

export function ResultPublishedBadge() {
  return (
    <span className="result-published-badge">
      <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
      Result published
    </span>
  );
}
