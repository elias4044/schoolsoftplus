# Contributing to SchoolSoft+

First off — thank you for considering contributing! SchoolSoft+ is a student-built project and every contribution, no matter how small, makes it better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Conventions](#coding-conventions)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms. Be kind, constructive, and respectful.

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report, please check [existing issues](https://github.com/elias4044/schoolsoftplus/issues) to avoid duplicates.

When filing a bug, include:
- **What you expected** to happen
- **What actually** happened
- Steps to reproduce
- Browser / OS
- Any relevant console errors

Use the [Bug Report template](https://github.com/elias4044/schoolsoftplus/issues/new?template=bug_report.md).

### 💡 Suggesting Features

Feature suggestions are welcome! Use the [Feature Request template](https://github.com/elias4044/schoolsoftplus/issues/new?template=feature_request.md). Describe the problem it solves, not just the solution.

### 🔧 Pull Requests

1. **Fork** the repo and create your branch from `main`
2. Follow the [coding conventions](#coding-conventions)
3. **Test** your changes locally
4. Make sure `npm run build` and `npm run lint` pass
5. Open a PR with a clear description

---

## Development Setup

```bash
git clone https://github.com/elias4044/schoolsoftplus.git
cd schoolsoftplus
npm install
cp .env.example .env.local
# Fill in your Firebase + Gemini credentials
npm run dev
```

The dev server starts at `http://localhost:3000`.

---

## Coding Conventions

- **TypeScript** everywhere. No `any` unless absolutely necessary.
- **Tailwind CSS v4** for styling. Use `oklch` color values to match the design system.
  - Background: `oklch(0.10 0 0)`, cards: `oklch(0.13 0 0)`, primary: `oklch(0.62 0.16 263)`
- **Framer Motion** for animations. Keep them smooth and purposeful.
- **API routes**: use fire-and-forget pattern for stats (never `await` stat calls — they must never block the response).
- **Components**: functional, typed props, no default exports from `lib/` files.
- **File structure**: page-level components go in `app/`, shared UI in `components/`, reusable logic in `lib/`.

---

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add countdown widget
fix: schedule not loading on mobile
docs: update README setup section
style: fix alignment in sidebar
refactor: extract statsHelper into separate module
chore: bump next to 16.2.3
```

---

## Pull Request Process

1. Update `README.md` or docs if your change affects them
2. One feature / fix per PR — keep things focused
3. Be responsive to review feedback
4. PRs are merged by the maintainer once approved

Thank you for helping make SchoolSoft+ better! 🎉
