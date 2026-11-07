'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, GraduationCap } from 'lucide-react';

import { subjectEase, useSubjectMotion } from '@/components/subjects/SubjectMotion';

export const gradeFlightEase = [0.77, 0, 0.175, 1] as const;

export function CinematicGradeReveal({
  value,
  maximum,
  layoutId,
  onFinish,
}: {
  value: string | number;
  label: string;
  maximum?: number;
  note?: string;
  layoutId: string;
  onFinish: (skip: boolean) => void;
}) {
  const { gentle } = useSubjectMotion();
  const [building, setBuilding] = useState(true);
  const finished = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    skipButton.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);
  function finish(skip: boolean) {
    if (finished.current) return;
    finished.current = true;
    onFinish(skip);
  }
  return (
    <motion.div
      ref={stage}
      className="grade-cinema"
      data-building={building}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: gentle ? 0 : 0.2, ease: subjectEase }}
    >
      <button
        ref={skipButton}
        type="button"
        className="grade-cinema-skip"
        onClick={() => finish(true)}
      >
        Show details now <ArrowRight className="size-3.5" />
      </button>
      {!building && (
        <div className="grade-cinema-rings" aria-hidden="true">
          {[0, 1, 2].map((ring) => (
            <motion.span
              key={ring}
              className="grade-cinema-ring"
              initial={{ opacity: 0, transform: 'scale(0.94)' }}
              animate={{
                opacity: [0, 0.5, 0],
                transform: gentle ? 'scale(1)' : `scale(${1.4 + ring * 0.35})`,
              }}
              transition={{
                duration: gentle ? 0 : 0.8,
                delay: gentle ? 0 : 0.4 + ring * 0.08,
                ease: subjectEase,
              }}
            />
          ))}
        </div>
      )}
      <div className={`grade-cinema-center ${building ? 'grade-cinema-building' : ''}`}>
        {building ? (
          <>
            <motion.span
              aria-hidden="true"
              className="grade-cinema-buildup-ring"
              initial={{ opacity: 0, transform: 'scale(1.5)' }}
              animate={{ opacity: 0.45, transform: 'scale(1)' }}
              transition={{ duration: gentle ? 0 : 1.5, ease: gradeFlightEase }}
            />
            <GraduationCap
              className="subject-accent size-10"
              strokeWidth={1.25}
              aria-hidden="true"
            />
            <h2 className="text-muted-foreground mt-5 text-sm font-medium">Opening your result</h2>
          </>
        ) : (
          <>
            <motion.div
              className="grade-cinema-mark"
              initial={{
                opacity: 0,
                transform: gentle ? 'translateY(0px) scale(1)' : 'translateY(24px) scale(0.94)',
              }}
              animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
              transition={{
                duration: gentle ? 0 : 0.55,
                delay: gentle ? 0 : 0.3,
                ease: subjectEase,
              }}
            >
              <motion.p
                layoutId={layoutId}
                transition={{ layout: { duration: gentle ? 0 : 0.45, ease: gradeFlightEase } }}
                className={`grade-cinema-value ${String(value).length > 3 ? 'grade-cinema-word' : ''}`}
              >
                {value}
              </motion.p>
              {maximum != null && (
                <p className="text-muted-foreground mt-2 text-lg tabular-nums">
                  / {maximum} points
                </p>
              )}
            </motion.div>
          </>
        )}
      </div>
      <motion.div
        aria-hidden="true"
        className="grade-cinema-shutter grade-cinema-shutter-top"
        initial={{ transform: 'translateY(0%)' }}
        animate={{ transform: building ? 'translateY(0%)' : 'translateY(-100%)' }}
        transition={{ duration: gentle ? 0 : 0.5, ease: gradeFlightEase }}
      />
      <motion.div
        aria-hidden="true"
        className="grade-cinema-shutter grade-cinema-shutter-bottom"
        initial={{ transform: 'translateY(0%)' }}
        animate={{ transform: building ? 'translateY(0%)' : 'translateY(100%)' }}
        transition={{ duration: gentle ? 0 : 0.5, ease: gradeFlightEase }}
      />
      <motion.span
        aria-hidden="true"
        key={gentle ? 'instant' : 'cinematic'}
        className="grade-cinema-timeline"
        initial={{ transform: 'scaleX(0)' }}
        animate={{ transform: building ? 'scaleX(0.5)' : 'scaleX(1)' }}
        transition={{ duration: gentle ? 0 : building ? 1.5 : 1.4, ease: 'linear' }}
        onAnimationComplete={() => {
          if (finished.current) return;
          if (gentle) finish(true);
          else if (building) setBuilding(false);
          else finish(false);
        }}
      />
    </motion.div>
  );
}
