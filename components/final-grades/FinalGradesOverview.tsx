'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';

import { FINAL_GRADE_LETTERS } from '@/lib/final-grades/analytics';
import type { getGradeChanges, getTermHistory } from '@/lib/final-grades/progress';
import type { FinalGradesInsights } from '@/lib/final-grades/types';
import styles from '@/app/(dashboard)/final-grades/page.module.css';

interface Props {
  insights: FinalGradesInsights;
  changes: ReturnType<typeof getGradeChanges>;
  history: ReturnType<typeof getTermHistory>;
  onPlan: () => void;
  onSubjects: (filter: 'all' | 'improved' | 'declined' | 'failing' | 'missing') => void;
}

export function FinalGradesOverview({ insights, changes, history, onPlan, onSubjects }: Props) {
  const graded = insights.approvedCount + insights.failingCount;
  const improved = changes.filter((change) => change.delta !== null && change.delta > 0);
  const declined = changes.filter((change) => change.delta !== null && change.delta < 0);
  const stable = changes.filter((change) => change.delta === 0);
  const comparable = improved.length + declined.length + stable.length;
  const baseMerit = insights.includedSubjects.reduce(
    (total, subject) => total + subject.meritPoints,
    0
  );
  const bonus = insights.languageBonusSubject?.meritPoints ?? 0;
  const candidates = insights.improvementCandidates
    .filter((candidate) => candidate.meritGain > 0)
    .slice(0, 4);
  const first = history[0];
  const last = history.at(-1);
  const historyDelta = first && last ? last.merit - first.merit : 0;
  const failing = insights.subjects.filter((subject) => subject.currentGrade === 'F');
  const missing = insights.subjects.filter((subject) => !subject.currentGrade);

  return (
    <div className={styles.overview}>
      <section className={styles.panel} aria-labelledby="merit-heading">
        <div className={styles.sectionHeader}>
          <h2 id="merit-heading">What makes up your merit</h2>
          <button className={styles.textButton} onClick={onPlan}>
            Explore a goal <ArrowRight />
          </button>
        </div>
        <p className={styles.meritEquation}>
          <span>
            {baseMerit.toFixed(1)}
            <small>Best {insights.includedSubjects.length} subjects</small>
          </span>
          <span className={styles.operator}>+</span>
          <span>
            {bonus.toFixed(1)}
            <small>Language option</small>
          </span>
          <span className={styles.operator}>=</span>
          <span>
            {insights.merit.toFixed(1)}
            <small>Merit points</small>
          </span>
        </p>
        <div
          className={styles.meritTrack}
          role="img"
          aria-label={`${baseMerit} base merit and ${bonus} language points out of 340`}
        >
          <span style={{ width: `${(baseMerit / 340) * 100}%` }} />
          <span style={{ width: `${(bonus / 340) * 100}%` }} />
        </div>
        <div className={styles.scale}>
          <span>0 points</span>
          <span>340 maximum</span>
        </div>
        <details className={styles.explainer}>
          <summary>Which subjects count?</summary>
          <p>
            Your best 16 passing subjects count towards the base merit. Your highest passing
            modern-language subject is counted separately as a language option. Check with your
            school that your language course qualifies.
          </p>
          <ul>
            {insights.includedSubjects.map((subject) => (
              <li key={subject.id}>
                <span>{subject.subject || 'Unnamed subject'}</span>
                <span>{subject.meritPoints.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          {insights.languageBonusSubject && (
            <p>
              Language option: {insights.languageBonusSubject.subject} (+{bonus.toFixed(1)})
            </p>
          )}
        </details>
      </section>

      <section className={styles.panel} aria-labelledby="mix-heading">
        <div className={styles.sectionHeader}>
          <h2 id="mix-heading">Your grade profile</h2>
          <span className={styles.small}>{graded} recorded grades</span>
        </div>
        <div className={styles.distribution} role="list" aria-label="Grade distribution">
          {FINAL_GRADE_LETTERS.map((letter) => {
            const count = insights.gradeDistribution[letter];
            return (
              <div key={letter} role="listitem">
                <span className={styles.barCount}>{count}</span>
                <div className={styles.barWell}>
                  <span
                    data-failing={letter === 'F'}
                    style={{ transform: `scaleY(${graded ? count / graded : 0})` }}
                  />
                </div>
                <strong>{letter}</strong>
                <span className={styles.small}>
                  {graded ? Math.round((count / graded) * 100) : 0}%
                </span>
              </div>
            );
          })}
        </div>
        <p className={styles.small}>
          Each bar shows its share of all recorded grades. Ungraded subjects are excluded.
        </p>
      </section>

      <section className={styles.panel} aria-labelledby="history-heading">
        <div className={styles.sectionHeader}>
          <div>
            <h2 id="history-heading">Merit across terms</h2>
            <p>
              {history.length > 1
                ? `${historyDelta > 0 ? '+' : ''}${historyDelta.toFixed(1)} points since ${first.period}`
                : 'Add another term to start comparing your results.'}
            </p>
          </div>
        </div>
        {history.length > 1 ? (
          <>
            <svg
              viewBox="0 0 560 190"
              className={styles.historyChart}
              role="img"
              aria-labelledby="history-title history-description"
            >
              <title id="history-title">Merit by recorded term</title>
              <desc id="history-description">
                {history
                  .map((term) => `${term.period}: ${term.merit.toFixed(1)} points`)
                  .join('. ')}
              </desc>
              {[0, 85, 170, 255, 340].map((tick) => (
                <g key={tick}>
                  <text x="0" y={160 - (tick / 340) * 144 + 4}>
                    {tick}
                  </text>
                  <line
                    x1="34"
                    x2="548"
                    y1={160 - (tick / 340) * 144}
                    y2={160 - (tick / 340) * 144}
                  />
                </g>
              ))}
              <polyline
                points={history
                  .map(
                    (term, index) =>
                      `${42 + (index / (history.length - 1)) * 496},${160 - (term.merit / 340) * 144}`
                  )
                  .join(' ')}
              />
              {history.map((term, index) => (
                <circle
                  key={term.period}
                  cx={42 + (index / (history.length - 1)) * 496}
                  cy={160 - (term.merit / 340) * 144}
                  r="3"
                >
                  <title>
                    {term.period}: {term.merit.toFixed(1)}
                  </title>
                </circle>
              ))}
            </svg>
            <div className={styles.termLabels}>
              {[first, last].map((term, index) => (
                <span key={index}>
                  {term?.period}
                  <strong>{term?.merit.toFixed(1)} points</strong>
                </span>
              ))}
            </div>
            <details className={styles.explainer}>
              <summary>All term values</summary>
              <ul>
                {history.map((term) => (
                  <li key={term.period}>
                    <span>
                      {term.period} ({term.graded} graded)
                    </span>
                    <span>{term.merit.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <div className={styles.emptyInline}>
            <strong>{last?.merit.toFixed(1) ?? '0.0'} merit points</strong>
            <p>{last?.period ?? 'No term recorded'}</p>
          </div>
        )}
        <p className={styles.small}>
          Each term uses the latest available grade up to that term, including carried-forward
          grades. Changes can reflect newly graded subjects.
        </p>
      </section>

      <section className={styles.panel} aria-labelledby="next-heading">
        <div className={styles.sectionHeader}>
          <h2 id="next-heading">Where a step makes a difference</h2>
          <button className={styles.textButton} onClick={onPlan}>
            Try a plan <ArrowRight />
          </button>
        </div>
        <p className={styles.small}>
          One grade step higher, ranked by its effect on your total merit.
        </p>
        <div className={styles.insightList}>
          {candidates.map((candidate, index) => (
            <div key={`${candidate.subject}-${index}`}>
              <div>
                <strong>{candidate.subject || 'Unnamed subject'}</strong>
                <span className={styles.small}>
                  {candidate.currentGrade} to {candidate.nextGrade}
                </span>
              </div>
              <span className={styles.gain}>
                +{candidate.meritGain.toFixed(1)}
                <small>merit points</small>
              </span>
            </div>
          ))}
        </div>
        {!candidates.length && (
          <p className={styles.emptyInline}>
            {graded
              ? 'No single grade step currently increases your counted merit. Try a multi-subject plan.'
              : 'Add a grade to see how a step higher could affect your merit.'}
          </p>
        )}
        <p className={styles.small}>
          These are calculations, not predictions about how easy a grade is to achieve.
        </p>
      </section>

      <section className={styles.panel} aria-labelledby="progress-heading">
        <div className={styles.sectionHeader}>
          <h2 id="progress-heading">What changed</h2>
          <button className={styles.textButton} onClick={() => onSubjects('all')}>
            View subjects <ArrowRight />
          </button>
        </div>
        <div className={styles.changeSummary}>
          <button onClick={() => onSubjects('improved')}>
            <ArrowUpRight className={styles.positive} />
            <strong>{improved.length}</strong>
            <span>Improved</span>
          </button>
          <div>
            <Minus />
            <strong>{stable.length}</strong>
            <span>Unchanged</span>
          </div>
          <button onClick={() => onSubjects('declined')}>
            <ArrowDownRight className={declined.length ? styles.negative : ''} />
            <strong>{declined.length}</strong>
            <span>Declined</span>
          </button>
        </div>
        <div className={styles.insightList}>
          {[...declined, ...improved].slice(0, 3).map((change) => (
            <div key={change.id}>
              <div>
                <strong>{change.subject || 'Unnamed subject'}</strong>
                <span className={styles.small}>
                  {change.previous?.period} to {change.latest?.period}
                </span>
              </div>
              <span className={(change.delta ?? 0) > 0 ? styles.positive : styles.negative}>
                {change.previous?.grade}
                <ArrowRight className="size-3" />
                {change.latest?.grade}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.small}>
          {comparable} subjects have two awarded grades to compare. Carried-forward entries are
          skipped.
        </p>
      </section>

      <section className={styles.panel} aria-labelledby="attention-heading">
        <div className={styles.sectionHeader}>
          <h2 id="attention-heading">Worth a closer look</h2>
        </div>
        <div className={styles.attentionRow}>
          <div>
            <h3>
              {failing.length
                ? `${failing.length} subject${failing.length === 1 ? '' : 's'} with grade F`
                : 'No recorded failing grades'}
            </h3>
            <p>
              {failing.length
                ? failing.map((subject) => subject.subject).join(', ')
                : graded
                  ? 'All of your recorded grades are E or above.'
                  : 'Record your grades to check passing subjects.'}
            </p>
          </div>
          {failing.length > 0 && (
            <button className={styles.textButton} onClick={() => onSubjects('failing')}>
              Review <ArrowRight />
            </button>
          )}
        </div>
        <div className={styles.attentionRow}>
          <div>
            <h3>
              {missing.length
                ? `${missing.length} ungraded subject${missing.length === 1 ? '' : 's'}`
                : 'Every subject has a grade'}
            </h3>
            <p>
              {missing.length
                ? 'These subjects are excluded from your average and merit.'
                : 'Your overview includes all subjects in your record.'}
            </p>
          </div>
          {missing.length > 0 && (
            <button className={styles.textButton} onClick={() => onSubjects('missing')}>
              Add grades <ArrowRight />
            </button>
          )}
        </div>
        <p className={styles.small}>
          Passing counts do not confirm programme eligibility. Subject requirements vary; check with
          your study adviser.
        </p>
      </section>
    </div>
  );
}
