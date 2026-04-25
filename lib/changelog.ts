export type ChangelogTag = "feature" | "improvement" | "fix" | "security" | "breaking";

export interface ChangelogItem {
  text: string;
  tag?: ChangelogTag;
}

export interface ChangelogSection {
  title: string;
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date string
  title: string;
  summary: string;
  tags: ChangelogTag[];
  sections: ChangelogSection[];
  githubUrl?: string;
  highlight?: boolean; // pin to top / show as "new"
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2026-04-25",
    title: "Messaging & Social Profiles",
    summary:
      "Real-time direct messaging between students, rich social profiles, emoji reactions, reply threads, and push notifications — SchoolSoft+ is now a full school social platform.",
    tags: ["feature", "improvement"],
    highlight: true,
    githubUrl: "https://github.com/elias4044/schoolsoftplus/releases/tag/v1.4.0",
    sections: [
      {
        title: "✉️ Real-time Messaging",
        items: [
          { text: "Brand-new direct message system — send and receive messages with any student at your school instantly", tag: "feature" },
          { text: "Messages arrive in real-time via Firestore listeners — no page refresh needed", tag: "feature" },
          { text: "Unread count badge shows in the sidebar, always up to date", tag: "feature" },
          { text: "Keyboard shortcut Alt+M jumps straight to your inbox", tag: "feature" },
          { text: "Emoji reactions — tap the reaction button on any message to respond with a single emoji", tag: "feature" },
          { text: "Reply threads — quote any message to keep conversation context clear", tag: "feature" },
          { text: "Message timestamps with smart relative formatting (\"just now\", \"5 min ago\", \"yesterday\")", tag: "improvement" },
          { text: "Push notifications via the browser Notifications API — get a ping when someone messages you", tag: "feature" },
          { text: "Conversation list with last-message preview and unread indicator", tag: "feature" },
        ],
      },
      {
        title: "👤 Social Profiles",
        items: [
          { text: "Every student now has a public profile page — show your name, school, a short bio, and profile colour", tag: "feature" },
          { text: "Profile pages are accessible at /profile or by searching for any student in the DM compose screen", tag: "feature" },
          { text: "Custom profile accent colour — personalise with a colour picker", tag: "feature" },
          { text: "\"Message\" button on profile pages launches a conversation instantly", tag: "feature" },
          { text: "Avatar initials with gradient background derived from your name", tag: "improvement" },
          { text: "Profile settings moved to their own card in /settings for easier access", tag: "improvement" },
        ],
      },
      {
        title: "🔔 Notifications",
        items: [
          { text: "New notifications system — in-app bell icon with a live unread count", tag: "feature" },
          { text: "Notification entries for new messages, reactions, and replies", tag: "feature" },
          { text: "\"Mark all read\" clears badge instantly", tag: "improvement" },
        ],
      },
      {
        title: "🐞 Fixes & Polish",
        items: [
          { text: "Fixed mobile sidebar closing prematurely when navigating to messages", tag: "fix" },
          { text: "Improved loading skeleton in conversation list to prevent layout shift", tag: "fix" },
          { text: "Messages page is now fully responsive on small screens", tag: "improvement" },
        ],
      },
    ],
  },
];
