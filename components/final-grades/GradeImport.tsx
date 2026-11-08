'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowRight, FileJson, Upload, X } from 'lucide-react';

import { MAX_GRADE_IMPORT_BYTES, parseFinalGradesFile } from '@/lib/final-grades/format';
import { parseSchoolSoftGrades } from '@/lib/final-grades/schoolsoft-import';
import type { FinalGradeSubject } from '@/lib/final-grades/types';
import styles from '@/app/(dashboard)/final-grades/page.module.css';

export function GradeImport({
  onImport,
  onClose,
  disabled,
  subjectCount,
}: {
  onImport: (subjects: FinalGradeSubject[]) => void;
  onClose: () => void;
  disabled: boolean;
  subjectCount: number;
}) {
  const [mode, setMode] = useState<'schoolsoft' | 'json'>('schoolsoft');
  const [input, setInput] = useState('');
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const fileRead = useRef(0);
  const preview = useMemo(() => {
    if (!input.trim()) return null;
    try {
      if (new TextEncoder().encode(input).length > MAX_GRADE_IMPORT_BYTES)
        throw new Error('Imports must be 2 MiB or smaller.');
      return mode === 'json'
        ? { ...parseFinalGradesFile(input), warnings: [] }
        : parseSchoolSoftGrades(input);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not read the grades.' };
    }
  }, [input, mode]);
  async function readFile(file: File | undefined) {
    if (!file) return;
    const token = ++fileRead.current;
    setFileError('');
    if (file.size > MAX_GRADE_IMPORT_BYTES) {
      setFileError('Choose a file of 2 MiB or smaller.');
      return;
    }
    try {
      const text = await file.text();
      if (token === fileRead.current) {
        setMode('json');
        setInput(text);
      }
    } catch {
      if (token === fileRead.current)
        setFileError('Could not read that file. Try choosing it again.');
    }
  }
  function changeMode(next: 'schoolsoft' | 'json') {
    fileRead.current++;
    setMode(next);
    setInput('');
    setFileError('');
  }
  return (
    <section id="grade-import" className={styles.importPanel} aria-labelledby="import-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="import-title">Bring your grades with you</h2>
          <p>Preview the full record before replacing your current list.</p>
        </div>
        <button className={styles.iconButton} onClick={onClose} aria-label="Close import">
          <X />
        </button>
      </div>
      <div className={styles.importModes} role="group" aria-label="Import source">
        <button
          aria-pressed={mode === 'schoolsoft'}
          onClick={() => changeMode('schoolsoft')}
          disabled={disabled}
        >
          <Upload /> SchoolSoft table
        </button>
        <button
          aria-pressed={mode === 'json'}
          onClick={() => changeMode('json')}
          disabled={disabled}
        >
          <FileJson /> Grade JSON
        </button>
      </div>
      <fieldset disabled={disabled}>
        {mode === 'json' && (
          <>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept=".json,application/json"
              aria-label="Choose grade JSON file"
              onChange={(event) => {
                void readFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <button className={styles.button} onClick={() => fileInput.current?.click()}>
              <Upload /> Choose JSON file
            </button>
          </>
        )}
        <label htmlFor="grade-paste">
          {mode === 'json'
            ? 'Or paste a version 1 grade JSON document'
            : 'Paste the SchoolSoft grade table, including term headings'}
        </label>
        <textarea
          id="grade-paste"
          value={input}
          onChange={(event) => {
            fileRead.current++;
            setFileError('');
            setInput(event.target.value);
          }}
          placeholder={
            mode === 'json'
              ? '{ "format": "schoolsoftplus.final-grades", "version": 1, ... }'
              : 'Subject\t24/25 Fall\t24/25 Spring\tComments\nEnglish\tC\tB\t'
          }
          rows={5}
          spellCheck={false}
        />
        <p>
          {mode === 'schoolsoft'
            ? 'English and Swedish headings, copied spreadsheet tables, missing grades and parenthesized grades are supported.'
            : 'Use a SchoolSoftPlus export or a file made to the documented JSON schema. Your account details are never included.'}
        </p>
        {fileError && (
          <p className={styles.importError} role="alert">
            {fileError}
          </p>
        )}
        {preview &&
          ('error' in preview ? (
            <p className={styles.importError} role="status">
              {preview.error}
            </p>
          ) : (
            <div className={styles.importPreview}>
              <h3>
                {preview.subjects.length} subjects / {preview.periods.length} periods
              </h3>
              <p>{preview.periods.join(' / ') || 'No periods'}</p>
              <div className={styles.previewRows}>
                {preview.subjects.slice(0, 5).map((subject) => (
                  <div key={subject.id}>
                    <strong>{subject.subject}</strong>
                    <span>
                      {subject.grades
                        .map((cell) =>
                          cell.grade ? (cell.isPreviousTerm ? `(${cell.grade})` : cell.grade) : '--'
                        )
                        .join(' / ')}
                    </span>
                  </div>
                ))}
              </div>
              {preview.subjects.length > 5 && (
                <p>And {preview.subjects.length - 5} more subjects.</p>
              )}
              {preview.warnings.length > 0 && (
                <div role="status">
                  <h3>Check before importing</h3>
                  <ul>
                    {preview.warnings.slice(0, 10).map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                  {preview.warnings.length > 10 && (
                    <p>
                      {preview.warnings.length - 10} more warnings. Review the subject record after
                      importing.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        <div className={styles.sectionHeader}>
          <p>
            {subjectCount
              ? `Replaces your ${subjectCount} current subjects. Nothing is saved until you choose Save changes.`
              : 'Importing creates an editable draft. Save when you are ready.'}
          </p>
          <button
            className={styles.primaryButton}
            disabled={disabled || Boolean(fileError) || !preview || 'error' in preview}
            onClick={() => {
              if (preview && !('error' in preview)) onImport(preview.subjects);
            }}
          >
            Use these grades <ArrowRight />
          </button>
        </div>
      </fieldset>
    </section>
  );
}
