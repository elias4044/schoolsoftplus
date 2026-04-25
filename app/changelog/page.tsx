import type { Metadata } from "next";
import ChangelogPage from "./ChangelogPage";

export const metadata: Metadata = {
  title: "Changelog — SchoolSoft+",
  description: "See what's new in SchoolSoft+. Release notes, new features, improvements, and bug fixes.",
  alternates: { canonical: "/changelog" },
};

export default function Page() {
  return <ChangelogPage />;
}
