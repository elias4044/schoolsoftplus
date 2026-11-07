'use client';

import { ListChecks } from 'lucide-react';

import { isFailedCriterion } from '@/lib/grades/inferGrade';
import type { AssessedCriteria, AssessedCriteriaTab, CriteriaLevel } from '@/lib/grades/types';
import { criterionLabel } from '@/lib/subjects/presentation';
import { AnimatedDisclosure } from '@/components/subjects/SubjectMotion';

function levelLabel(level?: CriteriaLevel) {
  return level?.description || criterionLabel(level?.levelEnum || 'NO_ASSESSMENT_MADE');
}

function isAssessed(level?: CriteriaLevel) {
  return (
    !!level && (!!level.levelEnum ? level.levelEnum !== 'NO_ASSESSMENT_MADE' : level.value > 0)
  );
}

export function CriteriaRows({ criteria }: { criteria: AssessedCriteria[] }) {
  return (
    <div className="space-y-3">
      <ol className="criterion-achievements" aria-label="Achieved criterion levels">
        {criteria.map((criterion, index) => {
          const level = criterion.level;
          const letter = isFailedCriterion(level)
            ? 'F'
            : /^MEET_([A-F])_LEVEL$/.exec(level?.levelEnum ?? '')?.[1] ||
              (/^[A-F]$/.test(level?.description ?? '') ? level.description : null);
          return (
            <li
              key={index}
              className="criterion-achievement"
              aria-label={`Criterion ${index + 1}: ${levelLabel(level)}`}
              title={levelLabel(level)}
            >
              <span className="text-muted-foreground text-xs">{index + 1}</span>
              {letter ? (
                <strong className="subject-accent text-3xl font-semibold">{letter}</strong>
              ) : (
                <span className="text-muted-foreground text-center text-xs leading-relaxed">
                  {levelLabel(level)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <AnimatedDisclosure
        title="View all criteria and descriptions"
        icon={ListChecks}
        className="criterion-card"
      >
        <div className="space-y-5 px-5 pb-5">
          {criteria.map((criterion, index) => {
            const assessed = isAssessed(criterion.level);
            return (
              <article key={index}>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Criterion {index + 1}</span>
                  <span className={`criterion-level ${assessed ? 'criterion-level-assessed' : ''}`}>
                    {levelLabel(criterion.level)}
                  </span>
                </span>
                <div className="mt-4 space-y-4">
                  {(criterion.steps ?? []).length ? (
                    criterion.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="criterion-description">
                        <p className="mb-2 flex items-center gap-2 text-xs font-medium">
                          <span className="text-muted-foreground">{stepIndex + 1}.</span>
                          {levelLabel(step.level)}
                        </p>
                        <div
                          className="subject-copy"
                          dangerouslySetInnerHTML={{ __html: step.text }}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No detailed description was published for this criterion.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </AnimatedDisclosure>
    </div>
  );
}

export function AssignmentCriteria({ tabs }: { tabs: AssessedCriteriaTab[] }) {
  const rows = tabs.flatMap((tab) => tab.assessedCriteria ?? []);
  const assessed = rows.filter((criterion) => isAssessed(criterion.level)).length;
  return (
    <div>
      <p className="text-muted-foreground mb-5 flex items-center gap-2 text-sm">
        <ListChecks className="subject-accent size-4" />
        {assessed} of {rows.length} criteria assessed. Your achieved levels are shown first.
      </p>
      <div className="space-y-6">
        {tabs.map(
          (tab, index) =>
            tab.assessedCriteria?.length > 0 && (
              <section key={index} aria-label={tab.content?.name || 'Assessed criteria'}>
                <h4 className="mb-3 text-sm font-semibold">
                  {tab.content?.name || 'Assessed criteria'}
                </h4>
                <CriteriaRows criteria={tab.assessedCriteria} />
              </section>
            )
        )}
      </div>
    </div>
  );
}
