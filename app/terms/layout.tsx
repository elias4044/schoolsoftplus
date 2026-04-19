import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Privacy",
  description:
    "Plain-language terms of service and privacy policy for SchoolSoft+. No legalese — everything you need to know about how your data is handled.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms & Privacy · SchoolSoft+",
    description:
      "How SchoolSoft+ handles your credentials, cookies, Firebase data, and AI usage. Clear, honest, no tracking.",
    url: "https://ssp.elias4044.com/terms",
  },
  robots: { index: true, follow: true },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
