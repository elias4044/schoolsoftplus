<div align="center">
  <img src="public/logo.png" alt="SchoolSoft+ Logo" width="72" height="72" />

  <h1>SchoolSoft+</h1>

  <p>
    A fast, modern, AI-powered dashboard for your SchoolSoft account.<br/>
    Built by a student. For students.
  </p>

  <p>
    <a href="https://ssp.elias4044.com"><img src="https://img.shields.io/badge/live-ssp.elias4044.com-6366f1?style=flat-square&logo=vercel" alt="Live" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-0ea5e9?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  </p>

  <br/>
</div>

---

## What is SchoolSoft+?

SchoolSoft+ is an independent, open-source web app that gives your existing **SchoolSoft** account a dramatically better interface. Same data, modern experience.

> **Not affiliated with SchoolSoft AB.** This project proxies SchoolSoft's login flow on your behalf and never stores your password.

**Why?** Because SchoolSoft's interface is slow, cluttered, and stuck in 2010. SchoolSoft+ is everything it should have been.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Draggable, resizable widget grid — schedule, assignments, lunch, news, all in one view |
| **Schedule** | Clean weekly timetable with subject colors |
| **Assignments** | Assignments grouped by week with completion tracking |
| **Lunch menu** | Weekly lunch menu fetched automatically |
| **News** | School news feed |
| **AI Assistant** | Ask about your schedule, assignments, and more — powered by Google Gemini |
| **Notes** | Personal notes with rich-text editor and public share links |
| **Live stats** | Cinematic public stats page showing real-time aggregate usage |
| **Keyboard shortcuts** | `Alt+1–5`, `Alt+N`, `Alt+A` and more for instant navigation |
| **Dark-first design** | Designed in `oklch` color space for pixel-perfect dark mode |
| **Private by default** | Credentials forwarded directly to SchoolSoft, never stored |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 · oklch color space |
| UI | shadcn/ui · Radix UI primitives |
| Animation | Framer Motion |
| Database | Firebase Firestore (notes, stats) |
| Auth | httpOnly session cookies (proxied from SchoolSoft) |
| AI | Google Gemini via `@google/genai` |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A SchoolSoft account (student or teacher)
- Firebase project with Firestore enabled
- Google Gemini API key (optional — for AI features)

### Local Development

```bash
# 1. Clone
git clone https://github.com/elias4044/schoolsoftplus.git
cd schoolsoftplus

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your credentials (see below)

# 4. Run
npm run dev
# → http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Gemini AI (optional)
GEMINI_API_KEY=your-gemini-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Project Structure

```
schoolsoftplus/
├── app/
│   ├── (auth)/          # Login page (unauthenticated)
│   ├── (dashboard)/     # Main app pages (authenticated)
│   │   ├── dashboard/   # Widget grid
│   │   ├── schedule/
│   │   ├── assignments/
│   │   ├── lunch/
│   │   ├── news/
│   │   ├── notes/
│   │   └── settings/
│   ├── api/             # Next.js API routes
│   │   ├── login/       # Auth proxy
│   │   ├── schedule/
│   │   ├── assignments/
│   │   ├── ai/          # Gemini proxy + rate limiting
│   │   ├── notes/
│   │   ├── stats/       # Public aggregate stats
│   │   └── lib/         # Shared helpers (Firebase, statsHelper)
│   ├── stats/           # Public stats page
│   ├── open-source/     # Open source & contributing page
│   ├── terms/           # Terms & Privacy
│   └── login-help/      # Troubleshooting
├── components/
│   ├── sidebar.tsx      # Main nav with keyboard shortcuts
│   ├── LandingPage.tsx  # Public landing page
│   ├── widgets/         # Dashboard widgets
│   └── ui/              # shadcn/ui components
└── lib/
    ├── api-client.ts
    ├── auth-context.tsx
    └── utils.ts
```

---

## Contributing

Contributions are what make open source great. Any contribution you make is hugely appreciated.

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on the development workflow and coding conventions.

### Ways to Help

- [Report a bug](https://github.com/elias4044/schoolsoftplus/issues/new?template=bug_report.md)
- [Request a feature](https://github.com/elias4044/schoolsoftplus/issues/new?template=feature_request.md)
- Improve documentation
- Star the repo

---

## Privacy & Security

- Passwords are **never stored** — forwarded directly to SchoolSoft over HTTPS and discarded
- Session tokens are stored as **httpOnly cookies** (inaccessible to JavaScript)
- Only notes and anonymous aggregate stats are stored in Firebase
- No advertising, no tracking, no third-party analytics

See [Terms & Privacy](https://ssp.elias4044.com/terms) for full details.

---

## License

MIT © [Elias](https://github.com/elias4044) — see [LICENSE](LICENSE) for details.

You're free to use, modify, and distribute this code. A credit or link back is appreciated but not required.

---

<div align="center">
  <p>Built by <a href="https://github.com/elias4044">Elias</a></p>
  <p>
    <a href="https://ssp.elias4044.com">Live site</a> ·
    <a href="https://ssp.elias4044.com/stats">Stats</a> ·
    <a href="https://ssp.elias4044.com/open-source">Open Source</a>
  </p>
</div>

</div>
