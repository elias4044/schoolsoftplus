# Architecture and request lifecycle

SchoolSoft+ runs its HTTP backend in Next.js App Router handlers under `app/api`. It combines SchoolSoft sessions and data, Firebase Admin persistence, and a small set of external services. The browser also talks directly to Firestore for realtime reads and WebRTC signaling. There is no separate Express service or universal Bearer-token middleware in this checkout.

## Three data paths

| Path | Authentication | What happens |
| --- | --- | --- |
| Browser to `/api/*` to SchoolSoft | SSP cookies, verified against SchoolSoft | REST proxying, HTML parsing, aggregation, and AuthV2 file/news access |
| Browser to `/api/*` to Firestore Admin | Same verified SchoolSoft identity | Ownership checks and application writes in helpers; Admin bypasses client Firestore rules |
| Browser to Firestore client SDK | Firebase custom-token sign-in with `identityVersion: 2` | Realtime subscriptions, restricted read receipts, and call signaling under `firestore.rules` |

The mobile authentication endpoints are a fourth entry point for obtaining tokens or session material. They do not automatically install browser cookies or make every API route accept `Authorization: Bearer`.

## A normal protected request

1. Next.js dispatches an exported method in a `route.ts` file. Dynamic route parameters are promises in this version.
2. `withValidation` checks common query fields and dynamic IDs before calling the handler. Invalid input can return 400 before authentication runs.
3. The handler calls `requireSession`, directly or through `getAuthenticatedUserId`.
4. `resolveSession` reconstructs SchoolSoft cookies. If classic session material is absent and `ssp_auth_type=authv2`, it can refresh the SchoolSoft token and exchange it for browser session material.
5. `verifySession` calls SchoolSoft `/rest-api/session`. Only that response supplies the canonical user ID and username. An expired classic session with AuthV2 available gets a retry without its old JSESSIONID.
6. `ensureAccountMigration` links and migrates the verified account. This means even a read can trigger migration writes.
7. The handler parses its own body, performs upstream requests or database work, and constructs its response.
8. The wrapper applies session cookie updates to `NextResponse` objects and adds `Cache-Control: private, no-store` unless the response already supplies a cache policy.

Verification is memoized in a `WeakMap` per request object, not across requests. A valid-looking `ssp_userid` or `ssp_username` cookie is not proof of ownership. Network failure during the live identity check becomes 503; an explicitly rejected or malformed account becomes unauthenticated.

## Common input rules

All explicit HTTP handlers use `withValidation`. The wrapper validates `week`, `year`, and `orgid` if present in the query: decimal digits, safe integer, and positive. Weeks are 1-53 and years 2000-2200. It checks a school from `x-school`, otherwise query `school`, against `[a-zA-Z0-9_-]{1,100}`. Cookie school validation also happens during session verification.

Paths beneath assignment, subjects, news, and grade-tracker require a positive numeric SchoolSoft resource ID, except the static `results_all`, `legacy`, and `pfp` segments. Every dynamic parameter also passes the document-ID check: nonempty, neither `.` nor `..`, no slash, at most 1,500 UTF-8 bytes.

`readJsonObject` reads the stream with a 4,000,000-byte cap. Missing bodies, invalid JSON, arrays, and scalar JSON are rejected. An oversized stream produces 413. It does not itself check `Content-Type` or reject unknown object keys.

`readRouteBody` adds route-specific field validation and account-alias resolution. `validateFields` validates fields that are present; it does not make every schema field required. The route must enforce required inputs. With `requireUpdate=true`, at least one supported field must be supplied. Unsupported fields are generally ignored, except where a handler explicitly rejects them, such as unknown grade settings.

String limits normally count JavaScript string length. The body and document-ID limits count bytes. Timestamps used by study tools are nonnegative safe integers in Unix milliseconds and must form a valid JavaScript Date. Token expiry fields use Unix seconds instead.

## Errors are not a single schema

| Source | Status and shape |
| --- | --- |
| Wrapper `InputError` | Its status, default 400; `{success:false,error,message}` |
| Wrapper unexpected exception | 500; `{success:false,error:"Request failed. Please try again."}` |
| `handleApiError` | Axios timeout 504; upstream 4xx preserved; other upstream failures 502; `{success:false,error}` |
| Handler-specific branch | Exact route-specific envelope; often `error` or `message`, sometimes both absent |

`handleApiError` only applies where a handler calls it. For example, an uncaught network exception in another route can become the wrapper's 500 instead of 502. Friends and group-invite handlers catch some helper errors and return 400 even when the helper originally used 404 or 409. Route pages include the response branches so callers can see these differences.

No common retry, idempotency key, CORS allowlist, or global rate limit is implemented here. Cookies use SameSite Lax and production Secure flags where set by the login flows. Do not assume a cross-origin application can call these browser endpoints merely because it can read the documentation.

## Upstream SchoolSoft client

`createSchoolsoftClient(school)` uses `https://sms.schoolsoft.se/{school}`, an 8-second Axios timeout, no redirects, a 20,000,000-byte response cap, and `allowAbsoluteUrls:false`. It adds User-Agent, Referer, and Origin. Handlers supply SchoolSoft cookies for REST/JSP calls and a SchoolSoft Bearer token for EVA news and attachments.

JSP parsers decode ISO-8859-1 with iconv-lite, then use Cheerio selectors. A selector mismatch can produce an empty successful response. That differs from an upstream transport error. Proxy responses retained as `data`, `rows`, or raw news objects are not a locally enforced upstream schema.

## Cache boundaries

The wrapper's default prevents response caching, including for authenticated GETs and most public GETs. School-list success explicitly uses a public one-hour response policy and a one-hour process cache. Teacher pictures can forward SchoolSoft's cache header. Weather, geocoding, and GitHub issues use upstream fetch revalidation while the API response itself remains private/no-store. Process caches and rate counters do not coordinate between server instances.

See [operations](operations.md) for timeouts and configuration, [authentication](authentication.md) for cookie lifetimes, and [data and realtime](data-and-realtime.md) for storage boundaries.

## Helper responsibilities

Every module in `app/api/lib` has an entry in the [contract index](contracts/README.md). This map distinguishes active request machinery from static or older helpers.

| Modules | Responsibility |
| --- | --- |
| schoolsoft | Shared client, cookie reconstruction/recovery, live session verification, per-request memoization, cookie updates |
| authenticatedUser | Small adapter returning requireSession's canonical userId or null |
| identity | School slug and positive decimal safe-integer account validation |
| accountRegistry, accountMigration | Legacy reference resolution, transactional stale-writer checks, progressive ownership migration |
| validation, routeValidation, requestBody | Scalar validators, streamed bounds, JSON parsing, query/path checks, response wrapper, route-specific input schemas |
| studyValidation, gradeValidation | Note/deck/card/countdown fields and nested grade-tracker validation |
| apiError | Axios upstream-error mapping used by SchoolSoft proxy handlers |
| firebaseAdmin | Service-account initialization and cached Firestore Admin handle |
| notesDb, countdownsDb, flashcardsDb | Owned study documents, sharing/import permissions, transactional writes/counts |
| gradeTrackerDb, finalGradesDb, layoutDb | User-keyed saved grade/layout state and snapshots |
| profileDb, messagingDb, friendsDb, groupInvitesDb, presenceDb | Profile projection, social state, membership mutations, search, and throttled presence |
| referralDb | Code reservation/lookup, idempotent per-referrer credit, leaderboard |
| passkeyDb, serverCrypto | Challenge lifecycle, credentials/index storage, AES-GCM token encryption |
| mobileAuth, auth/v2/lib | PKCE, mobile JWT utilities, provider token exchange, verified browser bridge and AuthV2 cookie writing |
| auth | Older standalone cookie/username verification helpers; these do not replace requireSession's canonical identity contract |
| loginStats, statsHelper | Transactional per-user login totals versus best-effort feature counters and UTC histograms |
| rateLimit | Bounded process-local fixed windows used by AI and issue creation |
| version, changelog | APP_VERSION comes from the first entry in `lib/changelog`; the API-local changelog module is separate static release data, with no own HTTP route |

Shared modules outside app/api include `lib/accountReferences.ts` for historical message identities and `lib/grades` for inference, scan merging, and snapshots. Grade analytics maps A/B/C/D/E/F to 20/17.5/15/12.5/10/0, removes excluded entries, optionally removes manual entries, and sorts by date. Equal weighting uses 1; recent weighting rises from 0.5 to 1 across ordered entries, unless a positive customWeight overrides it. `showEstimated` is stored but the current active-entry filter does not use it. Snapshot averages use these same analytics. Final-grade paste parsing and insights in `lib/final-grades/analytics.ts` are client features; the final-grades API only sanitizes and persists the submitted subjects.
