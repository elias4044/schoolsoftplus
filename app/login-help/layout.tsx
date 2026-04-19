import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login Help",
  description:
    "Troubleshooting guide for signing in to SchoolSoft+. Step-by-step help for common login issues, username format, school slugs, and FAQ.",
  alternates: { canonical: "/login-help" },
  openGraph: {
    title: "Login Help · SchoolSoft+",
    description:
      "Can't sign in? Step-by-step troubleshooting for SchoolSoft+ login issues.",
    url: "https://ssp.elias4044.com/login-help",
  },
  robots: { index: true, follow: true },
};

export default function LoginHelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
