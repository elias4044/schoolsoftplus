import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Source",
  description:
    "SchoolSoft+ is open source under the MIT license. Explore the code, report bugs, request features, or submit a pull request on GitHub.",
  alternates: { canonical: "/open-source" },
  openGraph: {
    title: "Open Source · SchoolSoft+",
    description:
      "SchoolSoft+ is MIT licensed and built in the open. Read the code, contribute, or fork it for your own school.",
    url: "https://ssp.elias4044.com/open-source",
  },
  robots: { index: true, follow: true },
};

export default function OpenSourceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
