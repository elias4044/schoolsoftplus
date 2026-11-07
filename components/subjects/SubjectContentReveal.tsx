'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { subjectEase, useSubjectMotion } from './SubjectMotion';
import { useSubjectNavigation } from './SubjectNavigation';

export function SubjectContentReveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { gentle, duration } = useSubjectMotion();
  const navigation = useSubjectNavigation();
  return (
    <motion.div
      className={className}
      initial={
        duration === 0 || navigation?.isTransitioning()
          ? false
          : { opacity: 0.8, transform: gentle ? 'translateY(0px)' : 'translateY(5px)' }
      }
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration, ease: subjectEase }}
    >
      {children}
    </motion.div>
  );
}
