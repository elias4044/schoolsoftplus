import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Stats",
  description:
    "Real-time anonymous usage statistics for SchoolSoft+ — total sessions, AI conversations, active schools, and more.",
  alternates: { canonical: "/stats" },
  openGraph: {
    title: "SchoolSoft+ Live Stats",
    description:
      "See how students are using SchoolSoft+ in real time — logins, AI usage, feature breakdown, and peak activity.",
    url: "https://ssp.elias4044.com/stats",
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
