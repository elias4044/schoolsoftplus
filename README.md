<div align="center">
  <img src="public/logo.png" alt="SchoolSoft+ Logo" width="72" height="72" />

  <h1>SchoolSoft+</h1>

  <p>
    A fast, modern, AI-powered dashboard for your SchoolSoft account.<br/>
    Built by a student. For students.
  </p>

  <p>
    <a href="https://ssp.elias4044.com"><img src="https://img.shields.io/badge/live-ssp.elias4044.com-6366f1?style=flat-square&logo=vercel" alt="Live" /></a>
    <a href="https://developer.ssp.elias4044.com"><img src="https://img.shields.io/badge/docs-developer.ssp.elias4044.com-0ea5e9?style=flat-square&logo=readthedocs" alt="Developer Docs" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-0ea5e9?style=flat-square&logo=tailwindcss" alt="Tailwind" />
    <img src="https://img.shields.io/badge/version-1.4.4-8b5cf6?style=flat-square" alt="Version" />
  </p>

  <br/>
</div>

---

## What is SchoolSoft+?

SchoolSoft+ is an independent, open-source web app that gives your existing **SchoolSoft** account a dramatically better interface. Same data — modern experience.

> **Not affiliated with SchoolSoft AB.** This project proxies SchoolSoft's login flow on your behalf and never stores your password.

**Why?** Because SchoolSoft's interface is slow, cluttered, and stuck in 2010. SchoolSoft+ is everything it should have been.

---

## Features

### Core
| Feature | Description |
|---|---|
| **Dashboard** | Customisable drag-and-drop widget grid — schedule, assignments, lunch, news, notes, countdowns and weather all in one view |
| **Schedule** | Clean weekly timetable with subject colours and week navigation |
| **Lunch menu** | Weekly lunch menu fetched and rendered automatically |
| **News** | School news feed with full article view |
| **Subjects** | Subject list with teacher info and related assignments |
| **Countdown** | Custom countdown timers to any date — displayed as a dashboard widget |
| **Notes** | Personal rich-text notes with public shareable links |
| **Class & Staff** | Browse your class list and staff directory with search, section filters, and CSV export |

### Social & Messaging
| Feature | Description |
|---|---|
| **Messaging** | Real-time encrypted and unencrypted group and direct message chats |
| **End-to-end encryption** | AES-256-GCM encrypted group chats with per-session password unlock |
| **Friends system** | Friend requests, friend list, and friend-gated direct messages |
| **Group invites** | Admins invite users to groups; users accept or decline |
| **Online status** | Per-user presence: Online (< 3 min), In SchoolSoft+ (3–15 min), Offline (> 15 min) |
| **GIF support** | Giphy-powered GIF picker in all chats including encrypted ones |
| **People search** | Search any SchoolSoft+ user, view their profile, add friends |

### AI & Productivity
| Feature | Description |
|---|---|
| **AI Assistant** | Conversational AI (Google Gemini) with full access to your schedule, assignments, and more |
| **Shared AI conversations** | Share AI chat threads via public link |

### Platform
| Feature | Description |
|---|---|
| **Live stats** | Public stats page with real-time aggregate usage across all users |
| **Keyboard shortcuts** | `Alt+1–7`, `Alt+N/M/U/P/,/A/Q` for instant navigation anywhere in the app |
| **Dark-first design** | Designed in `oklch` colour space for pixel-perfect dark mode |
| **PWA / installable** | Web app manifest for Add to Home Screen on mobile |
| **Private by default** | Credentials forwarded directly to SchoolSoft and immediately discarded — never stored |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 · oklch colour space |
| UI components | shadcn/ui · Radix UI primitives |
| Animation | Framer Motion · GSAP |
| Database | Firebase Firestore (notes, messages, friends, presence, stats) |
| Auth | httpOnly session cookies proxied from SchoolSoft + Firebase custom tokens |
| AI | Google Gemini via `@google/genai` |
| HTML parsing | Cheerio + iconv-lite (ISO-8859-1 → UTF-8) |
| Drag and drop | @dnd-kit |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A SchoolSoft account (student or teacher)
- Firebase project with Firestore enabled
- Google Gemini API key (optional — only needed for AI features)

### Local Development

```bash
# 1. Clone
git clone https://github.com/elias4044/schoolsoftplus.git
cd schoolsoftplus

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local — see Environment Variables below

# 4. Run
npm run dev
# → http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Firebase Admin SDK (server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Gemini AI (optional — AI Assistant won't work without it)
GEMINI_API_KEY=your-gemini-key

# App base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Project Structure

```
schoolsoftplus/
├── app/
│   ├── (auth)/                  # Login page (unauthenticated)
│   ├── (dashboard)/             # Main app pages (authenticated)
│   │   ├── dashboard/           # Customisable widget grid
│   │   ├── schedule/            # Weekly timetable
│   │   ├── lunch/               # Lunch menu
│   │   ├── news/                # School news
│   │   ├── subjects/            # Subject list
│   │   ├── countdown/           # Countdown timers
│   │   ├── notes/               # Rich-text notes
│   │   ├── messages/            # Real-time messaging
│   │   ├── people/              # SchoolSoft+ user search
│   │   ├── class/               # Class & staff directory
│   │   ├── profile/             # User profile
│   │   └── settings/            # App settings
│   ├── api/
│   │   ├── login/ logout/       # Auth proxy
│   │   ├── schedule/            # Timetable proxy
│   │   ├── lunch/               # Lunch menu proxy
│   │   ├── news/                # News proxy
│   │   ├── subjects/            # Subjects proxy
│   │   ├── people/              # class + staff HTML scrapers
│   │   ├── conversations/       # Messaging — conversation CRUD
│   │   ├── messages/            # Messaging — message CRUD
│   │   ├── friends/             # Friends system
│   │   ├── presence/            # Online status heartbeat
│   │   ├── group-invites/       # Group invite flow
│   │   ├── ai/                  # Gemini proxy + rate limiting
│   │   ├── notes/               # Notes CRUD
│   │   ├── stats/               # Public aggregate stats
│   │   ├── users/               # User search
│   │   └── lib/                 # Shared server helpers
│   │       ├── firebaseAdmin.ts
│   │       ├── schoolsoft.ts    # Axios client + session helpers
│   │       ├── auth.ts          # Session validation
│   │       ├── profileDb.ts
│   │       ├── messagingDb.ts
│   │       ├── friendsDb.ts
│   │       ├── presenceDb.ts
│   │       ├── groupInvitesDb.ts
│   │       └── statsHelper.ts
│   ├── stats/                   # Public stats page
│   ├── changelog/               # Changelog page
│   ├── open-source/             # Open source info
│   ├── terms/                   # Terms & Privacy
│   └── login-help/              # Login troubleshooting
├── components/
│   ├── sidebar.tsx              # Main nav + keyboard shortcuts
│   ├── LandingPage.tsx          # Public landing page
│   ├── ai-chat-panel.tsx        # AI assistant slide-out panel
│   ├── NoteEditor.tsx           # Rich-text note editor
│   ├── UserProfileModal.tsx     # Profile modal with friend actions
│   ├── widgets/                 # Dashboard widget components
│   └── ui/                      # shadcn/ui base components
└── lib/
    ├── auth-context.tsx         # Auth state (login/logout)
    ├── useSession.ts            # Session hook
    ├── useMessages.ts           # Real-time messaging hook
    ├── useFriends.ts            # Real-time friends hook
    ├── usePresence.ts           # Online status hooks
    ├── useNotifications.ts      # Push notification helper
    ├── crypto.ts                # AES-256-GCM E2EE helpers
    ├── firebase.ts              # Firebase client SDK
    └── widgets/                 # Widget registry + layout hook
```

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `profiles_v1` | User display names, bios, profile pictures |
| `conversations_v1` | Group and DM conversation metadata |
| `messages_v1` | Individual messages (plain + E2EE ciphertext) |
| `friendships_v1` | Friend requests and accepted friendships |
| `presence_v1` | Per-user online status heartbeats |
| `group_invites_v1` | Pending group join invitations |
| `notes_v2` | User notes with optional public share tokens |
| `countdowns_v1` | User countdown timers |
| `stats` | Anonymous aggregate usage stats |

---

## Contributing

Contributions are what make open source great — any PR is hugely appreciated.

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on the development workflow and coding conventions.

### Ways to Help

- [Report a bug](https://github.com/elias4044/schoolsoftplus/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/elias4044/schoolsoftplus/issues/new?template=feature_request.md)
- Improve documentation
- Browse the [Developer Portal](https://developer.ssp.elias4044.com) for API docs and integration guides ([elias4044/ssp-developer](https://github.com/elias4044/ssp-developer))
- Star the repo ⭐

---

## Privacy & Security

- Passwords are **never stored** — forwarded directly to SchoolSoft over HTTPS and immediately discarded
- Session tokens are stored as **httpOnly cookies** (inaccessible to JavaScript)
- E2EE group chat keys are **never sent to the server** — derived client-side and stored only in `sessionStorage`
- Only notes, messages, friend data, and anonymous aggregate stats are stored in Firebase
- No advertising, no tracking, no third-party analytics

See [Terms & Privacy](https://ssp.elias4044.com/terms) for full details.

---

## License

MIT © [Elias](https://github.com/elias4044) — see [LICENSE](LICENSE) for details.

You're free to use, modify, and distribute this code. A credit or link back is highly appreciated.

---

<div align="center">
  <p>Built by <a href="https://github.com/elias4044">Elias</a></p>
  <p>
    <a href="https://ssp.elias4044.com">Live site</a> ·
    <a href="https://developer.ssp.elias4044.com">Developer docs</a> ·
    <a href="https://ssp.elias4044.com/stats">Stats</a> ·
    <a href="https://ssp.elias4044.com/open-source">Open Source</a>
  </p>
</div>
