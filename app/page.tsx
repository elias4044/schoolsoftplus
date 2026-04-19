import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "SchoolSoft+ — A better student dashboard",
  description:
    "Fast, modern, AI-powered interface for your SchoolSoft account. Draggable dashboard, keyboard shortcuts, AI assistant, notes, and live stats. Built by a student, for students.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SchoolSoft+ — A better student dashboard",
    description:
      "Fast, modern, AI-powered interface for your SchoolSoft account.",
    url: "https://ssp.elias4044.com",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
