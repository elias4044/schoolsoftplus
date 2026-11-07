'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChartColumn, ChartNoAxesCombined, History } from 'lucide-react';

import type { GradeAnalytics } from '@/lib/grades/analytics';
import { gradeToNumeric, numericToGrade } from '@/lib/grades/constants';
import type { GradeSnapshot } from '@/lib/grades/types';
import { subjectDate } from '@/lib/subjects/presentation';
import { subjectEase, useSubjectMotion } from '@/components/subjects/SubjectMotion';

function GradeLine({
  points,
  label,
}: {
  points: { value: number; label: string }[];
  label: string;
}) {
  const { gentle, duration } = useSubjectMotion();
  if (points.length === 0)
    return <p className="text-muted-foreground py-4 text-sm">No saved history yet.</p>;
  const x = (index: number) => 34 + (points.length > 1 ? index / (points.length - 1) : 0.5) * 266;
  const y = (value: number) => 148 - (Math.max(0, Math.min(20, value)) / 20) * 128;
  return (
    <figure>
      <svg
        viewBox="0 0 320 180"
        className="h-auto w-full"
        role="img"
        aria-label={`${label}. ${points.length} results; latest ${numericToGrade(points[points.length - 1].value)}.`}
      >
        {['F', 'E', 'D', 'C', 'B', 'A'].map((grade) => (
          <g key={grade}>
            <text x="2" y={y(gradeToNumeric(grade) ?? 0) + 4} fill="currentColor" fontSize="13">
              {grade}
            </text>
            <line
              x1="28"
              x2="306"
              y1={y(gradeToNumeric(grade) ?? 0)}
              y2={y(gradeToNumeric(grade) ?? 0)}
              stroke="currentColor"
              opacity="0.1"
            />
          </g>
        ))}
        <motion.g
          initial={gentle ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: duration ? 0.25 : 0, ease: subjectEase }}
        >
          <polyline
            points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')}
            fill="none"
            stroke="var(--subject-data)"
            strokeWidth="2"
          />
          {points.map((point, index) => (
            <circle key={index} cx={x(index)} cy={y(point.value)} r="3" fill="var(--subject-data)">
              <title>
                {point.label}: {numericToGrade(point.value)}
              </title>
            </circle>
          ))}
        </motion.g>
        <text x="34" y="174" fontSize="12" fill="currentColor">
          First
        </text>
        <text x="300" y="174" textAnchor="end" fontSize="12" fill="currentColor">
          Latest
        </text>
      </svg>
      <figcaption className="text-muted-foreground mt-2 text-xs leading-relaxed">
        {label}
      </figcaption>
    </figure>
  );
}

export default function TrackerCharts({
  analytics,
  snapshots,
}: {
  analytics: GradeAnalytics;
  snapshots: GradeSnapshot[];
  subjectColor?: string;
}) {
  const [view, setView] = useState('trend');
  const { gentle, duration } = useSubjectMotion();
  const index = ['trend', 'distribution', 'history'].indexOf(view);
  const maxCount = Math.max(1, ...Object.values(analytics.distribution));
  return (
    <div>
      <div
        className="bg-secondary relative mb-4 flex gap-1 rounded-lg p-1"
        role="group"
        aria-label="Progress chart"
      >
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-md bg-[var(--brand-dim)]"
          animate={{ transform: `translateX(${index * 100}%)` }}
          transition={{ duration: gentle ? 0 : 0.2, ease: [0.77, 0, 0.175, 1] }}
        />
        {[
          { id: 'trend', label: 'Trend', icon: ChartNoAxesCombined },
          { id: 'distribution', label: 'Grades', icon: ChartColumn },
          { id: 'history', label: 'History', icon: History },
        ].map((option) => (
          <button
            key={option.id}
            className="subject-action relative flex-1 bg-transparent! px-2"
            aria-pressed={view === option.id}
            onClick={() => setView(option.id)}
          >
            <option.icon className="size-3.5" />
            {option.label}
          </button>
        ))}
      </div>
      <motion.div
        key={view}
        initial={{ opacity: 0, transform: gentle ? 'translateY(0px)' : 'translateY(4px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration, ease: subjectEase }}
      >
        {view === 'trend' ? (
          <GradeLine
            points={analytics.timeline.map((point) => ({
              value: point.numeric,
              label: point.label,
            }))}
            label="Included results in assessment order."
          />
        ) : view === 'distribution' ? (
          <dl className="space-y-3">
            {['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => (
              <div key={grade} className="flex items-center gap-3 text-sm">
                <dt className="w-3">{grade}</dt>
                <dd className="flex flex-1 items-center gap-3">
                  <span className="bg-secondary h-2 flex-1 rounded">
                    <motion.span
                      initial={gentle ? false : { transform: 'scaleX(0)' }}
                      animate={{ transform: 'scaleX(1)' }}
                      transition={{ duration, ease: subjectEase }}
                      className="block h-full origin-left rounded bg-[var(--subject-data)]"
                      style={{
                        width: `${((analytics.distribution[grade] ?? 0) / maxCount) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-5 text-right tabular-nums">
                    {analytics.distribution[grade] ?? 0}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <GradeLine
            points={snapshots.map((snapshot) => ({
              value: snapshot.averageNumeric,
              label: subjectDate(new Date(snapshot.at).toISOString()),
            }))}
            label="Saved average snapshots in order."
          />
        )}
      </motion.div>
    </div>
  );
}
