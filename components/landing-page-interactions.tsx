'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { cn } from '@/lib/utils';

const days = [
  {
    name: 'Monday',
    short: 'Mon',
    lessons: [
      ['08:30', 'Mathematics', 'Room 302'],
      ['10:15', 'English', 'Room 105'],
      ['13:00', 'Technology', 'Lab 3'],
    ],
    lunch: 'Pasta with tomato sauce',
    due: 'English reading response',
  },
  {
    name: 'Tuesday',
    short: 'Tue',
    lessons: [
      ['09:00', 'Biology', 'Lab 2'],
      ['10:30', 'Swedish', 'Room 204'],
      ['13:15', 'Physical education', 'Sports hall'],
    ],
    lunch: 'Vegetable curry with rice',
    due: 'Biology lab report',
  },
  {
    name: 'Wednesday',
    short: 'Wed',
    lessons: [
      ['08:30', 'History', 'Room 201'],
      ['10:15', 'Mathematics', 'Room 302'],
      ['12:45', 'Art', 'Art studio'],
    ],
    lunch: 'Baked potatoes with toppings',
    due: 'History source analysis',
  },
  {
    name: 'Thursday',
    short: 'Thu',
    lessons: [
      ['09:00', 'English', 'Room 105'],
      ['11:00', 'Physics', 'Lab 3'],
      ['13:00', 'Music', 'Music room'],
    ],
    lunch: 'Fish with potatoes',
    due: 'Physics practice questions',
  },
  {
    name: 'Friday',
    short: 'Fri',
    lessons: [
      ['08:30', 'Swedish', 'Room 204'],
      ['10:00', 'Geography', 'Room 201'],
      ['12:30', 'Mathematics', 'Room 302'],
    ],
    lunch: 'Tacos with vegetables',
    due: 'Geography presentation',
  },
];
const capabilities = [
  ['Schedule & lunch', "See the week ahead, your next lesson and what's for lunch."],
  ['Assignments & news', 'Keep deadlines and school announcements in the same place.'],
  ['Notes & flashcards', 'Keep your notes close and turn revision into a routine.'],
  ['Messages & friends', 'Find classmates, send a message and keep the conversation going.'],
  [
    'An assistant with context',
    'Ask about your timetable and assignments without searching through pages.',
  ],
  [
    'A dashboard that fits you',
    'Rearrange widgets, choose your theme and keep what matters in view.',
  ],
];
export function Reveal({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Keep content visible if JavaScript or the observer is unavailable.
        element.dataset.entered = 'true';
        visibilityObserver.disconnect();
      },
      { threshold: 0.12 }
    );
    visibilityObserver.observe(element);
    return () => visibilityObserver.disconnect();
  }, []);
  return (
    <div
      ref={elementRef}
      className={cn('motion-safe:data-[entered=true]:animate-landing-enter min-w-0', className)}
    >
      {children}
    </div>
  );
}
export function LandingShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        window.location.assign('/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  return null;
}
export function DayPreview() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const selectedDay = days[selectedDayIndex];
  return (
    <div className="bg-surface-1 min-w-0 rounded-xl p-4 text-sm min-[1051px]:p-6" data-ui>
      <div className="[&>span:last-child]:text-muted-foreground [&_svg]:text-brand-strong flex items-center justify-between gap-3 [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-2 [&>span:last-child]:hidden [&>span:last-child]:text-[13px] min-[1051px]:[&>span:last-child]:block">
        <span>
          <CalendarDays size={17} /> Your school week
        </span>
        <span>Interactive preview</span>
      </div>
      <div
        className="bg-surface-2 [&_button]:text-muted-foreground [&_button[aria-pressed=true]]:bg-surface-3 [&_button[aria-pressed=true]]:text-foreground [@media(hover:hover)_and_(pointer:fine)]:[&_button:hover]:bg-surface-3 [@media(hover:hover)_and_(pointer:fine)]:[&_button:hover]:text-foreground my-6 flex gap-1 rounded-[10px] p-1.5 [&_button]:min-h-11 [&_button]:min-w-0 [&_button]:flex-1 [&_button]:cursor-pointer [&_button]:rounded-md [&_button]:transition-colors [&_button]:duration-180"
        role="group"
        aria-label="Preview a school day"
      >
        {days.map((item, index) => (
          <button
            key={item.short}
            type="button"
            aria-pressed={selectedDayIndex === index}
            onClick={() => setSelectedDayIndex(index)}
          >
            {item.short}
          </button>
        ))}
      </div>
      <div aria-live="polite" aria-atomic="true">
        <div className="[&>span]:text-muted-foreground flex items-center justify-between gap-3 [&_h2]:text-2xl [&>span]:text-[13px]">
          <h2>{selectedDay.name}</h2>
          <span>{selectedDay.lessons.length} lessons</span>
        </div>
        <div className="mt-4 grid gap-2">
          {selectedDay.lessons.map(([time, subject, room]) => (
            <div
              className="bg-surface-2 [&_time]:text-muted-foreground [&_div>span]:text-muted-foreground flex min-w-0 items-center gap-4 rounded-lg p-3 sm:gap-5 sm:p-4 [&_div>span]:mt-1 [&_div>span]:block [&_div>span]:text-[13px] [&_strong]:block [&_strong]:font-medium [&_time]:shrink-0 [&_time]:text-[13px] [&_time]:tabular-nums"
              key={time}
            >
              <time>{time}</time>
              <div>
                <strong>{subject}</strong>
                <span>{room}</span>
              </div>
              <span
                className="bg-brand-strong ml-auto h-7 w-[5px] shrink-0 rounded opacity-70"
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
        <div className="[&_span]:text-muted-foreground mt-5 grid grid-cols-2 gap-4 sm:gap-5 [&_span]:mb-2 [&_span]:block [&_span]:text-[13px] [&_strong]:block [&_strong]:text-[13px] [&_strong]:leading-relaxed [&_strong]:font-medium">
          <div>
            <span>On the menu</span>
            <strong>{selectedDay.lunch}</strong>
          </div>
          <div>
            <span>Coming up</span>
            <strong>{selectedDay.due}</strong>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground mt-5 block text-[13px]">
        Sample school week. Your account brings your own timetable.
      </p>
    </div>
  );
}
export function FeatureList() {
  const [search, setSearch] = useState('');
  const results = capabilities.filter((item) =>
    item.join(' ').toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div
      data-ui
      className="[&_input]:bg-surface-2 min-w-0 [&_input]:mt-3 [&_input]:mb-7 [&_input]:block [&_input]:w-full [&_input]:rounded-[10px] [&_input]:p-4 [&_input]:text-base min-[901px]:[&_input]:px-6 min-[901px]:[&_input]:py-5 min-[901px]:[&_input]:text-xl"
    >
      <label htmlFor="feature-search" className="text-sm">
        Find what you need
      </label>
      <input
        id="feature-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Try notes, lunch or messages..."
      />
      <div aria-live="polite">
        {results.map(([title, description]) => (
          <div
            key={title}
            className="even:bg-surface-1 grid min-w-0 gap-2.5 rounded-lg px-4 py-6 min-[901px]:grid-cols-2 min-[901px]:items-center min-[901px]:gap-8 min-[901px]:px-6 [&_h3]:text-2xl [&_h3]:leading-[1.15] min-[901px]:[&_h3]:text-[clamp(1.375rem,2.6vw,2.25rem)] [&_p]:text-base"
          >
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ))}
        {!results.length && (
          <p className="px-4 py-8 sm:px-6">
            No match. Try &quot;schedule&quot;, &quot;notes&quot; or &quot;grades&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
