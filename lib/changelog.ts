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
    version: "1.4.4",
    date: "2026-04-26",
    title: "Enhanced Profiles, Group Chats & Share Cards",
    summary:
      "Profiles are now fully customisable with cover images, profile pictures, social links, accent colours, and privacy controls. A new People discovery page lets you browse and message classmates. Group chats let you create named rooms with multiple members. Notes and grades can now be shared directly into any conversation as rich interactive cards.",
    tags: ["feature", "improvement"],
    highlight: true,
    githubUrl: "https://github.com/elias4044/schoolsoftplus/releases/tag/v1.4.4",
    sections: [
      {
        title: "Expanded Profiles",
        items: [
          { text: "Upload a profile picture and cover/banner image via ImgBB — click either to replace", tag: "feature" },
          { text: "New fields: pronouns, bio (500 chars), location, website", tag: "feature" },
          { text: "Social links section — GitHub, X/Twitter, Instagram, LinkedIn", tag: "feature" },
          { text: "Accent colour picker with 8 presets and a custom hex input — affects your profile card, buttons, and DM header", tag: "feature" },
          { text: "Privacy toggle — choose whether anyone or nobody can initiate DMs with you", tag: "feature" },
          { text: "Member since and last updated timestamps in the read-only account info section", tag: "improvement" },
          { text: "Cover image and avatar are instantly previewed before saving", tag: "improvement" },
          { text: "Profile data is now propagated across the app — display name, avatar, and accent reflect everywhere", tag: "improvement" },
        ],
      },
      {
        title: "People Discovery Page",
        items: [
          { text: "New /people page (Alt+U) — search for any SchoolSoft+ user by username", tag: "feature" },
          { text: "Search results show avatar, display name, pronouns, bio snippet, school, location, and role badge", tag: "feature" },
          { text: "Click a result card to view the full public profile modal", tag: "feature" },
          { text: "Quick Message button on each card opens or creates a DM conversation instantly", tag: "feature" },
          { text: "Clicking the avatar or name in a DM conversation header also opens the profile modal", tag: "improvement" },
        ],
      },
      {
        title: "Public Profile Modal",
        items: [
          { text: "Reusable profile modal shows cover banner, avatar, name, pronouns, bio, location, website, and social links", tag: "feature" },
          { text: "Accent colour is applied throughout the modal — header strip, Message button, links", tag: "improvement" },
          { text: "Available from the People page, DM conversation header, and anywhere else a username appears", tag: "feature" },
        ],
      },
      {
        title: "Group Chats",
        items: [
          { text: "Create named group conversations with any number of SchoolSoft+ users", tag: "feature" },
          { text: "Group info panel — edit group name and description, view and manage members", tag: "feature" },
          { text: "Admins can add or remove members and transfer admin rights", tag: "feature" },
          { text: "Members can leave a group at any time", tag: "feature" },
          { text: "Group avatar uses a distinct icon and the group name appears in the conversation list", tag: "improvement" },
        ],
      },
      {
        title: "Note & Grade Share Cards",
        items: [
          { text: "Share any note directly to a conversation using the Send button in the Notes editor toolbar or the message icon in the note list", tag: "feature" },
          { text: "Share a grade estimate from any assignment detail page using the animated Share button", tag: "feature" },
          { text: "Share picker is a bottom-sheet modal with a preview panel — see exactly what will be sent before selecting a conversation", tag: "feature" },
          { text: "Multi-send support — send the same card to multiple conversations without closing the picker", tag: "feature" },
          { text: "Note cards in messages show title, status badge (Draft / Published / Archived), and a two-line preview", tag: "feature" },
          { text: "Click a note card to open the full note content in a markdown-rendered modal — no ownership required", tag: "feature" },
          { text: "Full note markdown is stored in the message at send time so both sender and recipient can always read it", tag: "improvement" },
          { text: "Grade cards show the letter grade square (colour-coded A–F), assignment title, subject, and point total", tag: "feature" },
          { text: "Per-conversation error and success state in the share picker", tag: "improvement" },
        ],
      },
    ],
  },
  {
    version: "1.4.3",
    date: "2026-04-25",
    title: "AI Writing Tools & School Picker",
    summary:
      "The AI has been completely reworked — freeform chat is replaced with focused, useful features: inline writing tools built into the Notes editor and a quick-action Insights panel for your schedule, assignments, and lunch. Login now includes a searchable school picker with every SchoolSoft school.",
    tags: ["feature", "improvement"],
    highlight: true,
    githubUrl: "https://github.com/elias4044/schoolsoftplus/releases/tag/v1.4.3",
    sections: [
      {
        title: "AI Writing Tools in Notes",
        items: [
          { text: "New 'AI Tools' toolbar button in the Notes editor opens an inline action panel", tag: "feature" },
          { text: "11 focused writing actions: Improve writing, Fix grammar, Expand, Shorten, Make formal, Make casual, Continue writing, Key points, Summarize, Suggest title, Explain", tag: "feature" },
          { text: "Actions are context-aware — select text to target just that passage, or apply to the whole note", tag: "feature" },
          { text: "AI suggestions appear in a preview panel before being applied — accept or discard with one click", tag: "feature" },
          { text: "Undo AI button appears after accepting a suggestion so you can instantly revert", tag: "feature" },
          { text: "Actions are grouped into Editing, Tone, and Generate categories for quick scanning", tag: "improvement" },
          { text: "Dedicated /api/ai/note endpoint — returns only what was asked, no preambles or filler", tag: "improvement" },
        ],
      },
      {
        title: "AI Insights Panel",
        items: [
          { text: "The sidebar AI panel is redesigned as a focused Insights panel — freeform chat removed", tag: "improvement" },
          { text: "Five quick-action cards: This Week's Assignments, Today's Schedule, Lunch This Week, School News, Study Tips", tag: "feature" },
          { text: "Each card fetches live school data and generates a concise AI summary in one tap", tag: "feature" },
          { text: "Results are displayed as cards with Refresh and Copy actions", tag: "feature" },
          { text: "Dedicated /api/ai/insight endpoint fetches all required data sources in parallel before calling the model", tag: "improvement" },
        ],
      },
      {
        title: "School Selection",
        items: [
          { text: "Login page now has a searchable school picker instead of a manual text field", tag: "feature" },
          { text: "Loads all SchoolSoft schools (3000+) from a new /api/schools endpoint — no auth required", tag: "feature" },
          { text: "Schools are fetched lazily on first open and cached server-side for one hour", tag: "improvement" },
          { text: "Live client-side search filters instantly; only 100 items rendered at a time to keep the UI fast", tag: "improvement" },
          { text: "Default school is Internationella Engelska Skolan - IES Halmstad", tag: "improvement" },
          { text: "School names are used as unique keys since they are the only guaranteed-unique field", tag: "fix" },
        ],
      },
    ],
  },
  {
    version: "1.4.2",
    date: "2026-04-25",
    title: "In-App Feedback",
    summary:
      "Submit bug reports, feature requests, and questions directly from inside SchoolSoft+ — no GitHub account required. Issues are created on GitHub and linked to your SSP username automatically.",
    tags: ["feature", "improvement"],
    githubUrl: "https://github.com/elias4044/schoolsoftplus/releases/tag/v1.4.2",
    sections: [
      {
        title: "Feedback Page",
        items: [
          { text: "New /feedback page accessible from the sidebar (Alt+F)", tag: "feature" },
          { text: "Submit bug reports, feature requests, or questions without a GitHub account", tag: "feature" },
          { text: "Issues are created server-side using a GitHub token and linked to your SSP username", tag: "feature" },
          { text: "Three pre-filled markdown templates: Bug Report, Feature Request, Question / Other", tag: "feature" },
          { text: "In-app form with title field, markdown body editor, and live character counter", tag: "feature" },
          { text: "Success banner with a direct link to the newly created GitHub issue", tag: "feature" },
          { text: "Browse open and closed issues directly inside the app", tag: "feature" },
          { text: "Filter issues by label (bug, feature request, question) and search by title", tag: "improvement" },
          { text: "Pagination for long issue lists", tag: "improvement" },
          { text: "Colour-coded label badges matching GitHub label colours", tag: "improvement" },
        ],
      },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-04-25",
    title: "Changelog Page",
    summary:
      "A dedicated changelog page and in-app modal so you can always see what is new in SchoolSoft+ — available on the landing page, inside the dashboard sidebar, and at /changelog for anyone not logged in.",
    tags: ["feature", "improvement"],
    githubUrl: "https://github.com/elias4044/schoolsoftplus/releases/tag/v1.4.1",
    sections: [
      {
        title: "Changelog",
        items: [
          { text: "New /changelog page listing every release with expandable detail cards", tag: "feature" },
          { text: "In-app changelog modal accessible from the sidebar via the 'What's new' button", tag: "feature" },
          { text: "Version badge pill in the landing page header nav opens the modal inline", tag: "feature" },
          { text: "Each release shows a version number, date, summary, and colour-coded tag pills (Feature, Improvement, Fix, Security, Breaking)", tag: "feature" },
          { text: "Latest release is pinned to the top and highlighted with a gradient border and accent line", tag: "improvement" },
          { text: "Direct link to the corresponding GitHub release on every entry", tag: "improvement" },
          { text: "Modal uses a React portal so it renders above all page elements regardless of stacking context", tag: "fix" },
          { text: "Changelog link added to the landing page footer", tag: "improvement" },
        ],
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-04-25",
    title: "Messaging and Social Profiles",
    summary:
      "Real-time direct messaging between students, rich social profiles, emoji reactions, reply threads, and push notifications — SchoolSoft+ is now a full school social platform.",
    tags: ["feature", "improvement"],
    githubUrl: "https://github.com/elias4044/schoolsoftplus/releases/tag/v1.4.0",
    sections: [
      {
        title: "Real-time Messaging",
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
        title: "Social Profiles",
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
        title: "Notifications",
        items: [
          { text: "New notifications system — in-app bell icon with a live unread count", tag: "feature" },
          { text: "Notification entries for new messages, reactions, and replies", tag: "feature" },
          { text: "\"Mark all read\" clears badge instantly", tag: "improvement" },
        ],
      },
      {
        title: "Fixes and Polish",
        items: [
          { text: "Fixed mobile sidebar closing prematurely when navigating to messages", tag: "fix" },
          { text: "Improved loading skeleton in conversation list to prevent layout shift", tag: "fix" },
          { text: "Messages page is now fully responsive on small screens", tag: "improvement" },
        ],
      },
    ],
  },
];
