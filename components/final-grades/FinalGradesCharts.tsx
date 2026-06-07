"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { FinalGradesInsights } from "@/lib/final-grades/types";
import { FINAL_GRADE_LETTERS } from "@/lib/final-grades/analytics";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const gradeColors = {
  A: "oklch(0.75 0.18 278)",
  B: "oklch(0.75 0.17 245)",
  C: "oklch(0.75 0.16 210)",
  D: "oklch(0.72 0.18 175)",
  E: "oklch(0.70 0.18 148)",
  F: "oklch(0.62 0.18 25)",
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "oklch(0.72 0 0)", boxWidth: 10, font: { size: 11 } } },
    tooltip: {
      backgroundColor: "oklch(0.18 0.02 278 / 95%)",
      borderColor: "oklch(1 0 0 / 12%)",
      borderWidth: 1,
    },
  },
};

export function FinalGradeDistributionChart({ insights }: { insights: FinalGradesInsights }) {
  const data = useMemo(
    () => ({
      labels: FINAL_GRADE_LETTERS,
      datasets: [
        {
          data: FINAL_GRADE_LETTERS.map(letter => insights.gradeDistribution[letter]),
          backgroundColor: FINAL_GRADE_LETTERS.map(letter => gradeColors[letter]),
          borderWidth: 0,
        },
      ],
    }),
    [insights]
  );

  return (
    <div className="h-56">
      <Doughnut data={data} options={{ ...options, cutout: "62%" }} />
    </div>
  );
}

export function FinalMeritBarChart({ insights }: { insights: FinalGradesInsights }) {
  const ranked = insights.subjects
    .filter(subject => subject.currentGrade)
    .sort((a, b) => b.meritPoints - a.meritPoints)
    .slice(0, 18);

  const data = useMemo(
    () => ({
      labels: ranked.map(subject => subject.subject.length > 14 ? `${subject.subject.slice(0, 13)}…` : subject.subject),
      datasets: [
        {
          label: "Merit points",
          data: ranked.map(subject => subject.meritPoints),
          backgroundColor: ranked.map(subject => subject.countsAsLanguageBonus ? "oklch(0.70 0.22 278)" : "oklch(0.60 0.18 210 / 75%)"),
          borderRadius: 6,
        },
      ],
    }),
    [ranked]
  );

  return (
    <div className="h-64">
      <Bar
        data={data}
        options={{
          ...options,
          scales: {
            x: { ticks: { color: "oklch(0.62 0 0)", font: { size: 10 } }, grid: { display: false } },
            y: { min: 0, max: 20, ticks: { color: "oklch(0.62 0 0)", stepSize: 5 }, grid: { color: "oklch(1 0 0 / 6%)" } },
          },
        }}
      />
    </div>
  );
}
