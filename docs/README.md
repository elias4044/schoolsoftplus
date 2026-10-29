# SchoolSoft+ backend documentation

This doc explains all of the backend of SchoolSoft+ as of October 29 2026.

## Start here

- [Architecture and request lifecycle](backend/architecture.md): where requests go, verified identity, validation, errors, and caching.
- [Authentication](backend/authentication.md): classic cookies, mobile token exchange, AuthV2, refresh, and passkeys.
- [SchoolSoft data](backend/schoolsoft-data.md): assignments, subjects, schedule, news, people, and files.
- [Study tools](backend/study-tools.md): notes and sharing, flashcards, countdowns, layouts, and grades.
- [Social features](backend/social.md): profiles, friends, conversations, messages, invites, and presence.
- [Integrations](backend/integrations.md): AI, uploads, GIFs, GitHub, referrals, and public statistics.
- [Data and realtime](backend/data-and-realtime.md): Firestore collections, migration, rules, client listeners, and call signaling.
- [Operations and troubleshooting](backend/operations.md): configuration, verification, failure recovery, and maintenance.
- [Worked examples](backend/worked-examples.md): complete requests and illustrative responses across multi-step workflows.
- [Every route](backend/routes/README.md): all explicitly exported HTTP methods, with a separate page for each route.
- [Shared source contracts](backend/contracts/README.md): exact types and validators used by the implementation.
- [Firestore index audit](firestore-index-audit.md): the query/index audit for firestore.

Each route page explains its purpose and edge cases, provides an example, links to its implementation, and includes source-derived request/response expressions for every method. These expressions are TypeScript, not fabricated JSON responses: names such as `response.data` mean the upstream payload passes through. Shared validation and helper behavior still apply.

## Use the examples

Examples use fake IDs and data. Replace resource IDs with values returned for your own account. HTTP examples are meant for a local server at `http://localhost:3000`; the browser examples assume the app's own origin. Browser credentials and Firebase credentials are separate. A successful Firebase sign-in alone does not authenticate a cookie-backed API call.

```js
const response = await fetch('/api/session', { credentials: 'include' });
const body = await response.json();
if (!response.ok) throw new Error(body.error ?? body.message ?? 'Request failed');
console.log(body.session.userId);
```

Most responses contain `success`, but this is not universal. Check the HTTP status first. News, file URLs, version, issue lists, and Firebase status have different envelopes.

## How the developer site loads these pages

`ssp-developer/lib/docs.ts` indexes `.md` and `.mdx` files recursively beneath `docs/` in `elias4044/schoolsoftplus` on `main`. These files use ordinary GitHub Flavored Markdown, relative document links, and fenced code. No JSX, raw HTML, Mermaid renderer, frontmatter configuration, or application change is required.

For example, `docs/backend/authentication.md` becomes `/docs/backend/authentication`. File names supply navigation titles; the first folder supplies the group. Relative links are resolved against the indexed repository revision. The site checks GitHub on a five-minute cache interval. Local files become available there after they reach `main`; writing them locally does not publish them.

The [AuthV2 entry point](auth-v2.md) and [SSP routes entry point](ssp-routes.md) also preserve the existing `/docs/auth-v2` and `/docs/ssp-routes` URLs.

## Keeping the reference current

Run `node scripts/backend-docs.cjs` after changing backend contracts, then `node scripts/backend-docs.cjs --check`. The script regenerates the route index, extracted contracts, and route pages from current source plus the reviewed explanations in `docs/backend/route-notes.json`. A missing explanation fails generation instead of silently publishing an undocumented route. Update the prose and examples when behavior changes; extraction alone cannot explain authorization, intent, or multi-step side effects.
