"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import type { GradeAnalytics } from "@/lib/grades/analytics";
import { OVERALL_GRADE_STYLE, GRADE_LETTERS } from "@/lib/grades/constants";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "oklch(0.18 0.02 278 / 95%)",
      borderColor: "oklch(1 0 0 / 12%)",
      borderWidth: 1,
      padding: 10,
      titleFont: { size: 11 },
      bodyFont: { size: 11 },
    },
  },
  scales: {
    x: {
      grid: { color: "oklch(1 0 0 / 4%)" },
      ticks: { color: "oklch(0.55 0 0)", font: { size: 9 }, maxRotation: 45 },
    },
    y: {
      min: 0,
      max: 20,
      grid: { color: "oklch(1 0 0 / 4%)" },
      ticks: { color: "oklch(0.55 0 0)", font: { size: 9 }, stepSize: 5 },
    },
  },
};

function gradeColor(letter: string): string {
  return OVERALL_GRADE_STYLE[letter]?.color ?? "oklch(0.55 0 0)";
}

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return <div style={{ height }}>{children}</div>;
}

export function GradeTrendChart({
  analytics,
  subjectColor,
}: {
  analytics: GradeAnalytics;
  subjectColor: string;
}) {
  const data = useMemo(() => {
    const labels = analytics.timeline.map(t => {
      const d = new Date(t.date);
      return Number.isNaN(d.getTime())
        ? t.label
        : d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });
    });
    return {
      labels,
      datasets: [
        {
          label: "Grade",
          data: analytics.timeline.map(t => t.numeric),
          borderColor: subjectColor,
          backgroundColor: `${subjectColor}33`,
          pointBackgroundColor: analytics.timeline.map(t => gradeColor(t.grade)),
          pointBorderColor: "transparent",
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.35,
        },
        {
          label: "Moving avg",
          data: analytics.movingAvg,
          borderColor: "oklch(0.65 0.15 278 / 60%)",
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.35,
        },
      ],
    };
  }, [analytics, subjectColor]);

  if (!analytics.timeline.length) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        Scan or add grades to see trends
      </p>
    );
  }

  return (
    <ChartBox height={160}>
      <Line data={data} options={chartDefaults} />
    </ChartBox>
  );
}

export function GradeDistributionChart({ analytics }: { analytics: GradeAnalytics }) {
  const data = useMemo(() => {
    const values = GRADE_LETTERS.map(l => analytics.distribution[l] ?? 0);
    return {
      labels: [...GRADE_LETTERS],
      datasets: [
        {
          data: values,
          backgroundColor: GRADE_LETTERS.map(l => OVERALL_GRADE_STYLE[l]?.color ?? "#666"),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [analytics]);

  const total = GRADE_LETTERS.map(l => analytics.distribution[l] ?? 0).reduce((a, b) => a + b, 0);
  if (!total) {
    return <p className="text-xs text-muted-foreground text-center py-6">No distribution yet</p>;
  }

  return (
    <ChartBox height={140}>
      <Doughnut
        data={data}
        options={{
          ...chartDefaults,
          cutout: "62%",
          plugins: {
            ...chartDefaults.plugins,
            legend: {
              display: true,
              position: "right" as const,
              labels: { color: "oklch(0.55 0 0)", font: { size: 10 }, boxWidth: 10 },
            },
          },
        }}
      />
    </ChartBox>
  );
}

export function SnapshotHistoryChart({
  snapshots,
  subjectColor,
}: {
  snapshots: { at: number; averageNumeric: number }[];
  subjectColor: string;
}) {
  const data = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.at - b.at).slice(-12);
    return {
      labels: sorted.map(s =>
        new Date(s.at).toLocaleDateString("en-SE", { month: "short", day: "numeric" })
      ),
      datasets: [
        {
          label: "Average",
          data: sorted.map(s => s.averageNumeric),
          backgroundColor: `${subjectColor}55`,
          borderColor: subjectColor,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [snapshots, subjectColor]);

  if (snapshots.length < 2) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        History builds after each scan
      </p>
    );
  }

  return (
    <ChartBox height={120}>
      <Bar data={data} options={chartDefaults} />
    </ChartBox>
  );
}
