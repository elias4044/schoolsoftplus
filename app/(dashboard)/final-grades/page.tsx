"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  FINAL_GRADE_LETTERS,
  FINAL_GRADE_POINTS,
  computeFinalGradesInsights,
  parseFinalGradesPaste,
} from "@/lib/final-grades/analytics";
import type { FinalGradeCell, FinalGradeLetter, FinalGradeSubject } from "@/lib/final-grades/types";
import { FinalGradeDistributionChart, FinalMeritBarChart } from "@/components/final-grades/FinalGradesCharts";

const samplePaste = `Subject\t23/24
Fall\t23/24
Spring\t24/25
Fall\t24/25
Spring\t25/26
Fall\tComments
Art\tE\tD\t(D)\t(D)\tC\t
English\tC\tB\tB\tB\tA\t
Mathematics\tB\tB\tB\tA\tB\t
Modern Languages, language options, Spanish\tC\tC\tC\tC\tC\t`;

function gradeClass(grade: FinalGradeLetter | null): string {
  switch (grade) {
    case "A": return "bg-violet-500/15 text-violet-200 border-violet-400/30";
    case "B": return "bg-blue-500/15 text-blue-200 border-blue-400/30";
    case "C": return "bg-cyan-500/15 text-cyan-200 border-cyan-400/30";
    case "D": return "bg-emerald-500/15 text-emerald-200 border-emerald-400/30";
    case "E": return "bg-green-500/15 text-green-200 border-green-400/30";
    case "F": return "bg-red-500/15 text-red-200 border-red-400/30";
    default: return "bg-white/5 text-muted-foreground border-white/10";
  }
}

function blankSubject(): FinalGradeSubject {
  return {
    id: crypto.randomUUID(),
    subject: "",
    grades: [{ period: "Final grade", grade: "C", isPreviousTerm: false, raw: "C" }],
    comment: "",
    manual: true,
  };
}

function syncRaw(cell: FinalGradeCell): FinalGradeCell {
  const raw = cell.grade ? (cell.isPreviousTerm ? `(${cell.grade})` : cell.grade) : "";
  return { ...cell, raw };
}

export default function FinalGradesPage() {
  const [subjects, setSubjects] = useState<FinalGradeSubject[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const insights = useMemo(() => computeFinalGradesInsights(subjects), [subjects]);
  const periods = useMemo(() => {
    const seen = new Set<string>();
    for (const subject of subjects) {
      for (const grade of subject.grades) seen.add(grade.period);
    }
    return Array.from(seen);
  }, [subjects]);

  useEffect(() => {
    apiFetch<{ success: boolean; finalGrades: { subjects: FinalGradeSubject[] } | null }>("/api/final-grades")
      .then(data => setSubjects(data.finalGrades?.subjects ?? []))
      .catch(error => {
        const msg = error instanceof ApiError ? error.message : "Could not load final grades.";
        setMessage(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(nextSubjects = subjects) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch<{ success: boolean; finalGrades: { subjects: FinalGradeSubject[] } }>(
        "/api/final-grades",
        { method: "PUT", body: { subjects: nextSubjects } as unknown as BodyInit }
      );
      setSubjects(res.finalGrades.subjects);
      setMessage("Saved securely to your account.");
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Could not save final grades.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  function importPaste() {
    const parsed = parseFinalGradesPaste(pasteText);
    if (!parsed.length) {
      setMessage("I could not find any grades in that paste. Try copying the whole SchoolSoft table.");
      return;
    }
    setSubjects(parsed);
    setMessage(`Imported ${parsed.length} subjects. Review them, then save.`);
  }

  function updateSubject(id: string, patch: Partial<FinalGradeSubject>) {
    setSubjects(current => current.map(subject => subject.id === id ? { ...subject, ...patch } : subject));
  }

  function updateGrade(subjectId: string, period: string, grade: FinalGradeLetter | null) {
    setSubjects(current =>
      current.map(subject => {
        if (subject.id !== subjectId) return subject;
        const existing = subject.grades.find(cell => cell.period === period);
        const grades = existing
          ? subject.grades.map(cell => cell.period === period ? syncRaw({ ...cell, grade }) : cell)
          : [...subject.grades, syncRaw({ period, grade, isPreviousTerm: false, raw: "" })];
        return { ...subject, grades };
      })
    );
  }

  function addManualSubject() {
    setSubjects(current => [blankSubject(), ...current]);
  }

  function removeSubject(id: string) {
    setSubjects(current => current.filter(subject => subject.id !== id));
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading final grades…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Final grades</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Import from SchoolSoft, adjust manually, calculate merit, and spot the subjects where effort moves the needle.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addManualSubject}>
            <Plus className="h-4 w-4" /> Add subject
          </Button>
          <Button onClick={() => save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </motion.div>

      {message && (
        <div className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Import from SchoolSoft
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={pasteText}
              onChange={event => setPasteText(event.target.value)}
              placeholder={samplePaste}
              className="min-h-48 w-full resize-y rounded-xl border border-white/10 bg-white/3 p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Parenthesized grades like <span className="font-mono">(C)</span> are kept as previous-term grades.
              </p>
              <Button onClick={importPaste} disabled={!pasteText.trim()}>
                <Sparkles className="h-4 w-4" /> Parse paste
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Merit</p>
              <p className="mt-1 text-4xl font-bold text-primary">{insights.merit.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">of {insights.maxMerit} maximum</p>
            </CardContent>
          </Card>
          <Card className="border-white/10">
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Approved</p>
              <p className="mt-1 text-3xl font-bold">{insights.approvedCount}</p>
              <p className="text-xs text-muted-foreground">{insights.failingCount} failing grades</p>
            </CardContent>
          </Card>
          <Card className="border-white/10">
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Average</p>
              <p className="mt-1 text-3xl font-bold">{insights.averagePoints.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">points per subject</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Grade mix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinalGradeDistributionChart insights={insights} />
          </CardContent>
        </Card>
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle>Merit by subject</CardTitle>
          </CardHeader>
          <CardContent>
            <FinalMeritBarChart insights={insights} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Improvement insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.improvementCandidates.length ? insights.improvementCandidates.map(candidate => (
              <div key={candidate.subject} className="flex items-center justify-between gap-3 rounded-lg bg-white/4 p-3">
                <div>
                  <p className="font-medium">{candidate.subject}</p>
                  <p className="text-xs text-muted-foreground">{candidate.reason}</p>
                </div>
                <Badge className={gradeClass(candidate.currentGrade)}>
                  {candidate.currentGrade} → {candidate.nextGrade}
                </Badge>
              </div>
            )) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Add grades to get improvement ideas.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> Watchlist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.decliningSubjects.length ? insights.decliningSubjects.map(subject => (
              <div key={`${subject.subject}-${subject.period}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/4 p-3">
                <div>
                  <p className="font-medium">{subject.subject}</p>
                  <p className="text-xs text-muted-foreground">Dropped in {subject.period}</p>
                </div>
                <Badge className={gradeClass(subject.to)}>
                  {subject.from} → {subject.to}
                </Badge>
              </div>
            )) : (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No clear drops detected.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 py-12 text-center text-sm text-muted-foreground">
              Paste your SchoolSoft grade table or add subjects manually.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Subject</th>
                    {periods.map(period => <th key={period} className="px-2 py-2">{period}</th>)}
                    <th className="px-2 py-2">Merit</th>
                    <th className="px-2 py-2">Comment</th>
                    <th className="py-2 pl-2" />
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => {
                    const insightSubject = insights.subjects.find(item => item.id === subject.id);
                    return (
                      <tr key={subject.id} className="border-b border-white/6 align-top">
                        <td className="py-3 pr-3">
                          <Input
                            value={subject.subject}
                            onChange={event => updateSubject(subject.id, { subject: event.target.value })}
                            placeholder="Subject"
                            className="min-w-48"
                          />
                          <div className="mt-1 flex gap-1">
                            {insightSubject?.includedInBaseMerit && <Badge variant="outline">Best 16</Badge>}
                            {insightSubject?.countsAsLanguageBonus && <Badge variant="outline">Language bonus</Badge>}
                          </div>
                        </td>
                        {periods.map(period => {
                          const cell = subject.grades.find(grade => grade.period === period);
                          return (
                            <td key={period} className="px-2 py-3">
                              <select
                                value={cell?.grade ?? ""}
                                onChange={event => updateGrade(subject.id, period, event.target.value ? event.target.value as FinalGradeLetter : null)}
                                className={`h-8 rounded-lg border px-2 text-sm outline-none ${gradeClass(cell?.grade ?? null)}`}
                              >
                                <option value="">—</option>
                                {FINAL_GRADE_LETTERS.map(letter => <option key={letter} value={letter}>{letter}</option>)}
                              </select>
                            </td>
                          );
                        })}
                        <td className="px-2 py-3 font-semibold tabular-nums">
                          {insightSubject ? FINAL_GRADE_POINTS[insightSubject.currentGrade ?? "F"].toFixed(1) : "0.0"}
                        </td>
                        <td className="px-2 py-3">
                          <Label className="sr-only">Comment</Label>
                          <Input
                            value={subject.comment}
                            onChange={event => updateSubject(subject.id, { comment: event.target.value })}
                            placeholder="Optional"
                            className="min-w-44"
                          />
                        </td>
                        <td className="py-3 pl-2">
                          <Button variant="ghost" size="icon-sm" onClick={() => removeSubject(subject.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
