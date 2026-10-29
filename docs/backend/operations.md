# Operations and troubleshooting

This page describes configuration and verification for the checked-in backend. It does not certify production configuration or contact live services. Never copy actual service-account JSON, passwords, cookies, SchoolSoft tokens, or API keys into documentation or test fixtures.

## Environment inventory

| Variable | Consumer and purpose |
| --- | --- |
| FIREBASE_SERVICE_ACCOUNT_KEY | Base64 of complete service-account JSON; Firebase Admin initialization, Firestore and custom tokens |
| GEMINI_API_KEY | AI note/flashcard/insight provider calls |
| GITHUB_TOKEN | Optional for reading issues, required for creating them |
| IMGBB_API_TOKEN | Both image-upload handlers |
| GIPHY_API_KEY | GIF search/trending |
| MOBILE_JWT_SECRET | HS256 signing/verification helpers; required for `/api/auth/token` |
| NEXT_PUBLIC_APP_URL | Browser AuthV2 callback base; distinct from NEXT_PUBLIC_BASE_URL |
| PASSKEY_RP_ID | WebAuthn relying-party host |
| PASSKEY_RP_NAME | Registration display name; default SchoolSoft+ |
| PASSKEY_ORIGIN | Expected complete origin for WebAuthn verification |
| PASSKEY_ENCRYPTION_KEY | 64 hex characters representing 32 bytes for AES-256-GCM refresh-token encryption |
| NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID | Each has the NEXT_PUBLIC_FIREBASE_ prefix; browser Firebase initialization |
| NEXT_PUBLIC_GA_MEASUREMENT_ID | Browser analytics and Firebase config measurementId |
| NEXT_PUBLIC_TURN_URL, NEXT_PUBLIC_TURN_USERNAME, NEXT_PUBLIC_TURN_CREDENTIAL | Optional browser-visible WebRTC relay configuration |
| NODE_ENV | Framework-provided production cookie Secure behavior |

The example environment file also lists GOOGLE_CLOUD_PROJECT_ID, DISCORD_WEBHOOK_URL, and NEXT_PUBLIC_BASE_URL. The reviewed backend does not read them. In particular, the Firebase status route does not call Google Cloud Monitoring, and AuthV2 initiation reads NEXT_PUBLIC_APP_URL instead of BASE_URL. MOBILE_JWT_SECRET and APP_URL are read by the implementation even though absent from that example file.

Passkey encryption uses a fresh twelve-byte IV and appends a sixteen-byte GCM authentication tag to base64 ciphertext. Losing/changing the key makes existing stored tokens unreadable until users log in through AuthV2 again. Configure the exact RP/origin used by the browser. A locally served app cannot use production WebAuthn settings interchangeably.

## Timeout and capacity inventory

| Area | Source limit |
| --- | --- |
| Shared SchoolSoft Axios client | Eight seconds; zero redirects; 20,000,000 response bytes |
| Session fallback refresh/exchange | Five seconds per network step; live shared session verification uses eight-second client |
| Dedicated AuthV2/mobile/passkey network calls | Generally eight seconds, with five-second mobile identity bridge calls |
| AI | Thirty seconds per provider request |
| File destination download | Ten seconds, no redirects |
| ImgBB, Giphy, GitHub, weather/geocoding | Eight-second abort signals |
| JSON stream | 4,000,000 bytes |
| Upload request | File limit plus 64 KiB multipart allowance |
| Grade tracker serialized body | 800,000 bytes in addition to stream limit |
| In-memory rate limiter | Sixty-second fixed windows; 5,000 active keys maximum, then 503 busy |
| Presence route | maxDuration 20; max 100 requested users |

Timeouts apply to individual calls. Verification, migration, and aggregation can extend total request duration. Hosting/platform limits still apply separately. No general endpoint retry or provider circuit breaker is present.

## Local verification

Install project dependencies and configure a separate development Firebase project before authenticated manual testing. The source initializes Admin at import time and does not automatically select an emulator. Do not assume a local Next.js server means writes stay local.

```sh
npm ci
npm run dev
```

On Windows, the available fallback for local filesystem-link trouble is `npm run dev -- --webpack`. The backend uses Node APIs and Firebase Admin; an Edge-only runtime is not interchangeable. `next.config.ts` keeps Firebase Admin external and applies security headers across routes. No additional REST CORS policy is defined.

For source regression checks:

```sh
node --test tests/backend-routes.test.cjs tests/identity-migration.test.cjs tests/presence-regression.test.cjs tests/schoolsoft-session.test.cjs
npx tsc --noEmit
npm run lint
node scripts/backend-docs.cjs --check
```

The test files use controlled substitutes to exercise local code. They do not prove live SchoolSoft contracts, Firebase rules enforcement, WebAuthn device behavior, production index readiness, token rotation across instances, or external service availability. There is no npm test script in this project's package.json; use the explicit Node test command.

At the documentation review, `identity-migration.test.cjs` could not load because it imports the absent `scripts/migrate-user-ids.cjs`. That suite is not passing in this checkout. The other three files completed with thirty passing checks, including the backend suite's progressive-migration cases. Do not interpret the missing standalone migration utility as a supported operational command.

## Diagnose by boundary

| Symptom | What to inspect |
| --- | --- |
| Protected route 401 despite Firebase sign-in | Browser SSP cookies and SchoolSoft session validity; Firebase auth is separate |
| `/api/news` or `/api/file` 401 after classic login | These require a SchoolSoft access token through AuthV2 |
| Any protected request 503 | Live SchoolSoft verification can fail before the route's own data work |
| 409 while account starts loading | Alias ownership conflict or a stale social reference; retry only after refreshing account state, preserve conflicting data |
| Empty successful class/staff/legacy news data | Inspect source HTML and parser selectors, not only HTTP status |
| Grade scan skips records | Check reported/expired status, assessment availability, and inference inputs; scan is intentionally tolerant |
| Message duplication after retry | Sending has no idempotency key; a prior transaction may have completed before the response was lost |
| Profile updated but request failed | Conversation propagation is awaited after profile persistence |
| Presence response says online but DB timestamp is old | Server throttle can skip persistence while echoing requested status |
| Firebase permission denied | Numeric UID, identityVersion 2 claim, membership, correct project, deployed rules, stale pre-migration client |
| Firebase query requires an index | Match exact fields/order to firestore.indexes.json, including client and legacy variants; inspect serving state in the intended project |
| Health says unavailable or stale usage | `service_status/firestore` is externally maintained; check writer/freshness |
| Stats do not equal traffic totals | Counters cover selected successful feature paths and some fire-and-forget writes |
| Passkey REFRESH_EXPIRED or decrypt failure | AuthV2 login to renew stored token; verify encryption key continuity |
| Mobile Bearer token fails on notes | General routes only consume browser-session cookies in this checkout |

## Migration release considerations

Back up Firestore before an identity cutover. Deploy compatible indexes/rules/application together, stop old clients or services that still write username-owned records, and force stale clients to reload and sign in to Firebase with identityVersion 2. Monitor alias completion and conflict archives. A source audit cannot prove the old writers have stopped or the indexes are serving.

Migration updates multiple collections and can resume on later verified requests. Preserve private conflict archives until ownership conflicts are resolved. An administrator should inspect source/target ownership before repairing records rather than deleting aliases to silence a 409.

## Documentation maintenance

The generated route pages include a SHA-256 source fingerprint. `--check` compares generated output against the current tree and fails on missing route explanations, stale outputs, and broken relative Markdown links. It also inventories shared helper contracts. It does not infer that prose remains semantically correct after a helper change: review the domain guide and route note alongside the diff.

The developer site's loader and renderer can be checked with its own `npm test`. To render every local document with that site's actual implementation, run `node scripts/check-backend-docs-loader.cjs` with its checkout at `../ssp-developer`, or pass its directory as the first argument. This uses its installed dependencies without changing its files. It checks index inclusion, rendered heading anchors, and relative document links. It indexes repository Markdown rather than reading this checkout at runtime. Confirm local parsing/link resolution first; public availability requires the documents to be pushed to the indexed main branch.
