'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookCheck,
  Calculator,
  ChartNoAxesColumnIncreasing,
  Check,
  GraduationCap,
  ListChecks,
  MessageSquareText,
  RotateCcw,
  Share2,
} from 'lucide-react';

import type { GradeInference } from '@/lib/grades/types';
import {
  AnimatedDisclosure,
  subjectEase,
  useSubjectMotion,
} from '@/components/subjects/SubjectMotion';

import { CinematicGradeReveal, gradeFlightEase } from './CinematicGradeReveal';

export function AssignmentResultExperience({
  published,
  grade,
  estimate,
  review,
  teacherComment,
  studentComment,
  points,
  maximum,
  breakdown,
  criteria,
  onShare,
}: {
  published: boolean;
  grade: string | null;
  estimate?: GradeInference | null;
  review: string;
  teacherComment: string;
  studentComment: string;
  points: number;
  maximum: number;
  breakdown?: ReactNode;
  criteria?: ReactNode;
  onShare: () => void;
}) {
  const revealable = !!(published || grade || review || teacherComment || maximum > 0 || criteria);
  const [opened, setOpened] = useState(!revealable);
  const [instant, setInstant] = useState(!revealable);
  const [revealing, setRevealing] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [view, setView] = useState(
    teacherComment ? 'feedback' : criteria ? 'criteria' : breakdown ? 'points' : 'feedback'
  );
  const { gentle, duration } = useSubjectMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const openingButton = useRef<HTMLButtonElement>(null);
  const shouldFocus = useRef(false);
  const evidencePanel = useRef<HTMLDivElement>(null);
  const shouldInspect = useRef(false);
  const [inspection, setInspection] = useState(0);
  const panelId = useId();
  const hasTeacherAssessment = !!(review || teacherComment || criteria);
  const gradeLayoutId = `${panelId}-grade`;
  const resultLabel = grade
    ? estimate
      ? `Estimated from ${estimate.source}`
      : 'Reported grade'
    : maximum > 0
      ? 'Your score'
      : hasTeacherAssessment
        ? 'Teacher assessment'
        : published
          ? 'Result status'
          : 'Assignment notes';
  const resultValue =
    grade ||
    (maximum > 0
      ? points
      : hasTeacherAssessment
        ? 'Reviewed'
        : published
          ? 'Published'
          : 'Your notes');
  const tabs = [
    { id: 'feedback', label: 'Feedback', icon: MessageSquareText },
    ...(breakdown ? [{ id: 'points', label: 'Points', icon: ChartNoAxesColumnIncreasing }] : []),
    ...(criteria ? [{ id: 'criteria', label: 'Criteria', icon: ListChecks }] : []),
  ];
  useEffect(() => {
    if (shouldFocus.current) {
      (opened ? heading.current : openingButton.current)?.focus({ preventScroll: true });
      shouldFocus.current = false;
    }
  }, [opened]);
  useEffect(() => {
    if (!shouldInspect.current) return;
    evidencePanel.current?.focus({ preventScroll: true });
    evidencePanel.current?.scrollIntoView({
      behavior: gentle ? 'instant' : 'smooth',
      block: 'start',
    });
    shouldInspect.current = false;
  }, [inspection, view, gentle]);

  function openResult(skip: boolean) {
    const immediate = skip || gentle;
    setInstant(immediate);
    shouldFocus.current = true;
    setRevealing(!immediate);
    setOpened(immediate);
  }

  function finishReveal(skip: boolean) {
    const immediate = skip || gentle;
    shouldFocus.current = true;
    setInstant(immediate);
    setCinematic(!immediate);
    setRevealing(false);
    setOpened(true);
  }

  const transition = { duration: instant ? 0 : duration, ease: subjectEase };
  return (
    <section className="assignment-result mb-8" aria-label="Assignment result">
      <AnimatePresence key={instant ? 'instant' : 'animated'} initial={false} mode="popLayout">
        {!opened && !revealing ? (
          <motion.div
            key="opening"
            className="result-opening"
            exit={{ opacity: 0, transform: gentle ? 'translateY(0px)' : 'translateY(-6px)' }}
            transition={transition}
          >
            <div className="relative z-10 max-w-lg">
              <h2 className="text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
                Your result is ready.
              </h2>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  ref={openingButton}
                  className="subject-action subject-action-primary px-5!"
                  onClick={(event) => openResult(event.detail === 0)}
                >
                  Open your result <ArrowRight className="size-4" />
                </button>
                <button type="button" className="result-skip" onClick={() => openResult(true)}>
                  Show immediately
                </button>
              </div>
            </div>
            <div className="result-art" aria-hidden="true">
              <div className="result-orbit" />
              <div className="result-paper result-paper-back" />
              <div className="result-paper result-paper-front">
                <BookCheck className="size-7" strokeWidth={1.4} />
                <div className="result-paper-line mt-7 w-3/4" />
                <div className="result-paper-line mt-3 w-full" />
                <div className="result-paper-line mt-3 w-1/2" />
                <div className="result-seal">
                  <GraduationCap className="size-8" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </motion.div>
        ) : revealing ? (
          <motion.div
            key="cinematic"
            exit={{ opacity: 0 }}
            transition={{ duration: instant ? 0 : 0.2, ease: subjectEase }}
          >
            <CinematicGradeReveal
              value={resultValue}
              label={resultLabel}
              maximum={!grade && maximum > 0 ? maximum : undefined}
              note={estimate ? 'SchoolSoftPlus estimate, not a teacher-reported grade.' : undefined}
              layoutId={gradeLayoutId}
              onFinish={finishReveal}
            />
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={
              instant
                ? false
                : { opacity: 0, transform: gentle ? 'translateY(0px)' : 'translateY(8px)' }
            }
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={transition}
          >
            <header className="result-toolbar">
              <h2
                ref={heading}
                tabIndex={-1}
                className="flex items-center gap-2 text-sm font-medium outline-none"
              >
                <BookCheck className="subject-accent size-4" />
                Your result
              </h2>
              <div className="flex items-center gap-1">
                {revealable && (
                  <button
                    type="button"
                    className="subject-action bg-transparent!"
                    aria-label="Replay result opening"
                    onClick={() => {
                      shouldFocus.current = true;
                      setCinematic(false);
                      setRevealing(false);
                      setInstant(false);
                      setOpened(false);
                    }}
                  >
                    <RotateCcw className="size-4" />
                    <span className="hidden sm:inline">Opening</span>
                  </button>
                )}
                {grade && (
                  <button
                    type="button"
                    className="subject-action bg-transparent!"
                    onClick={onShare}
                  >
                    <Share2 className="size-4" />
                    Share
                  </button>
                )}
              </div>
            </header>
            <div className="result-content">
              <div className="result-scorecard">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="size-4" />
                  {resultLabel}
                </div>
                <motion.p
                  layoutId={gradeLayoutId}
                  initial={
                    instant || gentle || cinematic
                      ? false
                      : { opacity: 0, transform: 'translateY(12px) scale(0.97)' }
                  }
                  animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                  transition={{
                    ...transition,
                    duration: instant ? 0 : duration ? 0.25 : 0,
                    layout: { duration: instant || gentle ? 0 : 0.45, ease: gradeFlightEase },
                  }}
                  className={`w-fit max-w-full ${grade || maximum > 0 ? 'result-score' : 'mt-7 text-3xl font-semibold'}`}
                >
                  {resultValue}
                  {!grade && maximum > 0 && (
                    <span className="text-2xl font-normal tracking-normal"> / {maximum}</span>
                  )}
                </motion.p>
                {grade && maximum > 0 && (
                  <p className="mt-2 text-sm tabular-nums">
                    {points} / {maximum} points
                  </p>
                )}
                {estimate && (
                  <div className="mt-4 text-xs leading-relaxed">
                    <p className="text-muted-foreground">SchoolSoft+ estimate.</p>
                  </div>
                )}
                {review && review.trim().toUpperCase() !== grade && (
                  <p className="mt-4 text-sm leading-relaxed">
                    {estimate && (
                      <span className="text-muted-foreground mb-1 block text-xs">
                        Teacher&apos;s review
                      </span>
                    )}
                    {review}
                  </p>
                )}
                <p className="mt-7 flex items-center gap-2 text-xs opacity-75">
                  <Check className="size-3.5" />
                  {published
                    ? estimate
                      ? 'Original assessment from your teacher'
                      : 'Published by your teacher'
                    : 'Assessment details'}
                </p>
              </div>
              <div className="min-w-0">
                <div className="result-tabs" role="tablist" aria-label="Explore your result">
                  {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`${panelId}-${id}`}
                      aria-controls={`${panelId}-panel`}
                      aria-selected={view === id}
                      tabIndex={view === id ? 0 : -1}
                      className="result-tab"
                      onClick={() => setView(id)}
                      onKeyDown={(event) => {
                        const index = tabs.findIndex((tab) => tab.id === view);
                        const next =
                          event.key === 'ArrowRight'
                            ? (index + 1) % tabs.length
                            : event.key === 'ArrowLeft'
                              ? (index - 1 + tabs.length) % tabs.length
                              : event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? tabs.length - 1
                                  : -1;
                        if (next >= 0) {
                          event.preventDefault();
                          setView(tabs[next].id);
                          document.getElementById(`${panelId}-${tabs[next].id}`)?.focus();
                        }
                      }}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <motion.div
                  key={view}
                  ref={evidencePanel}
                  role="tabpanel"
                  id={`${panelId}-panel`}
                  aria-labelledby={`${panelId}-${view}`}
                  tabIndex={0}
                  initial={instant || gentle ? false : { opacity: 0, transform: 'translateY(4px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px)' }}
                  transition={{ duration, ease: subjectEase }}
                  className="result-feedback"
                >
                  {estimate && view === estimate.source && (
                    <AnimatedDisclosure
                      title="How this estimate works"
                      icon={Calculator}
                      className="estimate-explanation mb-5"
                    >
                      <div className="px-5 pb-5 text-sm leading-relaxed">
                        {estimate.source === 'points' ? (
                          <>
                            <p>
                              Uses your total points as a percentage of the available points. Your
                              teacher may use different grade boundaries.
                            </p>
                            <dl className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                              {[
                                ['A', '95%+'],
                                ['B', '85%+'],
                                ['C', '70%+'],
                                ['D', '50%+'],
                                ['E', '40%+'],
                                ['F', 'Below 40%'],
                              ].map(([letter, threshold]) => (
                                <div key={letter}>
                                  <dt className="font-medium">{letter}</dt>
                                  <dd className="text-muted-foreground text-xs">{threshold}</dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        ) : (
                          <p>
                            Any criterion marked as not met makes this estimate F. Unassessed
                            criteria are not treated as failures. Otherwise, the estimate uses 65%
                            of the lowest included level and 35% of the average. Only assessed
                            numeric levels of 7 or higher are included. This is a rough estimate;
                            the individual assessments below remain the source to check.
                          </p>
                        )}
                      </div>
                    </AnimatedDisclosure>
                  )}
                  {view === 'feedback' ? (
                    <>
                      <h3 className="text-lg font-semibold">From your teacher</h3>
                      {teacherComment ? (
                        <div
                          className="subject-copy mt-4 max-w-[75ch]"
                          dangerouslySetInnerHTML={{ __html: teacherComment }}
                        />
                      ) : (
                        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                          No written feedback has been published.
                          {breakdown
                            ? ' Explore Points to see your score breakdown.'
                            : criteria
                              ? ' Explore Criteria to see what was assessed.'
                              : ''}
                        </p>
                      )}
                      {studentComment && (
                        <div className="border-border mt-6 border-t pt-5">
                          <h4 className="text-sm font-medium">Your comment</h4>
                          <p className="subject-copy mt-2 whitespace-pre-wrap">{studentComment}</p>
                        </div>
                      )}
                    </>
                  ) : view === 'points' ? (
                    <>
                      <h3 className="mb-5 text-lg font-semibold">Every part of your result</h3>
                      {breakdown}
                    </>
                  ) : (
                    <>
                      <h3 className="mb-3 text-lg font-semibold">Your criterion results</h3>
                      {criteria}
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
