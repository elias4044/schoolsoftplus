'use client';

import { motion } from 'framer-motion';
import { GraduationCap, Sparkles, Target } from 'lucide-react';

import { subjectEase, useSubjectMotion } from '@/components/subjects/SubjectMotion';

export function GradeSummary({
  grade,
  target,
  count,
}: {
  grade: string;
  target: string;
  count: number;
}) {
  const { gentle, duration } = useSubjectMotion();
  return (
    <div className="grade-summary">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <GraduationCap className="size-4" />
          Tracked average
        </p>
        <span className="grade-goal">
          <Target className="size-3.5" />
          Goal {target}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <motion.div
          key={grade}
          initial={{
            opacity: 0,
            transform: gentle ? 'translateY(0px) scale(1)' : 'translateY(8px) scale(0.95)',
          }}
          animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
          transition={{ duration: duration ? 0.25 : 0, ease: subjectEase }}
          className="grade-letter"
          aria-label={`Tracked average ${count ? grade : 'not available'}`}
        >
          {count ? grade : '--'}
        </motion.div>
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-medium">
            {count ? 'Hmm interesting' : 'You failing in this subject?'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {count} included {count === 1 ? 'result' : 'results'}
          </p>
        </div>
      </div>
      <div
        className="mt-5 grid grid-cols-6 gap-1.5"
        aria-label={`Grade scale F to A. Goal ${target}.`}
      >
        {['F', 'E', 'D', 'C', 'B', 'A'].map((letter, index) => (
          <motion.div
            key={letter}
            initial={gentle ? false : { opacity: 0, transform: 'translateY(5px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration, delay: gentle ? 0 : index * 0.03, ease: subjectEase }}
            className={`grade-step ${count && grade === letter ? 'grade-step-current' : ''}`}
          >
            {letter}
            {target === letter && <Target className="mt-1 size-3" aria-label="Goal" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
