# Integrations and public endpoints

External-service credentials stay in server environment variables except explicitly public Firebase/analytics/TURN configuration. This page describes calls made by this application, not a promise that a provider's live API or quota remains unchanged.

## AI study features

All three AI routes require a verified session, use `GEMINI_API_KEY`, call `gemini-3.1-flash-lite`, and set a thirty-second provider timeout. A missing key is 503. Their per-user rate windows are in memory per server instance, not a distributed quota. Rate checks occur before body parsing and provider-configuration checks, so invalid requests can consume a window slot.

| Route | Limit per sixty seconds | Input and output |
| --- | --- | --- |
| `POST /api/ai/note` | 20 | `{action,content?,selection?,title?}` to `{success,result,action}` |
| `POST /api/ai/flashcards` | 8 | `{text,count?,language?}` to `{success,cards}` |
| `POST /api/ai/insight` | 12 | `{systemPrompt,fetchAssignments?,fetchSchedule?,fetchLunch?,fetchNews?,week?,year?}` to `{success,data}` |

Note actions are improve, summarize, grammar, continue, title, formal, casual, bullets, expand, shorten, explain. Content and selection each allow 100,000 characters and title 500. At least content or selection must be truthy. Selection is used by improve/grammar/formal/casual/bullets/expand/shorten/explain; summarize, continue, and title use full content. Providing only selection for those latter actions passes the initial guard but does not make their prompts use the selection. Title generation asks for at most eight words, continuation for one to three paragraphs, and summary for two to four sentences; these are prompts, not output validators. The handler returns the first text part and treats empty text as 500. It does not save a note.

Flashcard source text is trimmed and must be 20-20,000 characters. The body schema accepts integer count 1-50; generation clamps it to 3-30, default ten. Language allows 100 characters at validation but uses only the first twenty in the prompt. An `instructions` string is accepted up to 10,000 by the shared schema but is not used by the handler. Generation uses temperature 0.4 and maxOutputTokens 4096. Optional code fences are stripped; invalid JSON or a non-array is 502. Objects without string front/back are filtered; retained fields are trimmed/truncated to 2,000/2,000/500, given empty tags, and limited to thirty cards. An empty resulting array can still be successful. Generated cards are not saved automatically.

Insight accepts a nonblank systemPrompt up to 100,000. Flags select parallel data requests: assignments only with both week and year strings; lunch only with week; schedule for today's UTC date through `/rest-api/student/schedule`; news through the legacy start-page parser. Each failed data source contributes an unavailable marker rather than failing the request. No sources means a generic user message. The prompt combines these data with the caller's system instruction. Only insight increments the AI-message counter. An empty provider response becomes `No response received.` instead of failing.

```js
const result = await fetch('/api/ai/flashcards', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'The nucleus contains DNA and controls many activities of the cell.', count: 5, language: 'English' })
}).then(r => r.json());
// Persist result.cards separately with the deck cards endpoint.
```

Note and insight provider failures return 500 and include an error message field; flashcard generation uses a generic 500 message. None of these endpoints streams model output. School data requested for insight and note/flashcard input are sent to the configured AI provider.

## Image uploads

`POST /api/pfp-upload` and `POST /api/msg-upload` require a verified session and the server-only `IMAGE_HOST_API_TOKEN` (scopes `images:read` and `images:write`). Send multipart FormData with field `image` holding a File. The handlers bound request bytes before parsing and forward multipart `file` and `public=true` to `https://img.e4044.com/api/v1/images` using bearer authentication. Requests have a fifteen-second upstream timeout.

Both routes accept JPEG, PNG, and static WebP. Profile/cover uploads are limited to 5 MiB; message uploads to 10 MiB. The platform validates and scans the image. GIF, AVIF, and BMP uploads are unsupported. Giphy search and delivery remain an explicit exception.

An approved image returns HTTP 200 with `{success:true,pending:false,url}`. An upload awaiting scanning returns HTTP 202 with `{success:true,pending:true,id,state}`. Poll `GET` on the same route with `?id=<id>` until ready; GET also requires a verified session. Do not persist a pending upload as a profile or message image. The web client polls for up to two minutes. Blocked images return 422, expired images 410, and scan/service errors 502. Delivery uses public `https://img.e4044.com/i/<id>.webp` URLs and never exposes the bearer key.

After approval, save profile URLs with `PUT /api/profile`; this propagates avatars to conversation snapshots. Other API clients must also handle HTTP 202 and poll before saving the URL.


```js
const form = new FormData();
form.append('image', file);
const uploaded = await fetch('/api/pfp-upload', { method: 'POST', body: form }).then(r => r.json());
// Do not manually set multipart Content-Type; the browser supplies its boundary.
```

## GIF search

`GET /api/gif?q=cats&limit=20` requires a session and `GIPHY_API_KEY`. Query is trimmed to 100; empty query uses trending. Limit defaults twenty and must be an integer 1-30. Requests use PG rating and English search, with eight-second timeout. Success is `{success,gifs:[{id,title,preview,full,width,height}]}`. Preview uses downsampled/fallback fixed-height variants; full prefers original. Entries without preview/full URLs are removed. Missing configuration is 503 and provider failures are 502. It returns URLs, not stored image files.

## GitHub issues

`GET /api/github/issues` is public. It accepts state open/closed/all (default open), labels up to 200 characters, positive safe-integer page (default 1), and per_page 1-100 (default 25). It requests repository `elias4044/schoolsoftplus`, newest-created first, with optional server token and sixty-second upstream revalidation. Pull requests are filtered after pagination, so fewer issues than per_page is normal. `hasNext` comes from GitHub's Link header. Response is `{issues,hasNext}`, without success. Provider error status is forwarded with `{error:"GitHub API error",status}`.

`POST /api/github/issues/create` requires a session and `GITHUB_TOKEN`, with a limit of three attempts per user per minute per instance. Input: nonblank title up to 256, body up to 20,000, type bug/feature/question (default question). It appends the verified login username and school to the issue body. This publishes that attribution with the issue. Labels are bug; enhancement plus feature request; or question. The server token's account creates the issue. Success is `{success,number,html_url}`; provider rejection is 502, missing token 503. This is a real external write, not a draft endpoint.

```json
{"title":"Schedule shows a duplicate lesson","body":"Steps and expected result...","type":"bug"}
```

## Referrals

`GET /api/referrals` requires authentication and creates a referral code if absent. It returns `{success,data}` with code, totalReferrals, referredUsers, and timestamps. Referred users are enriched with ID, compatibility username field, displayName, picture, and join time. Code generation reserves an eight-character code and owner record transactionally, retrying collisions up to ten times. Codes use an unambiguous uppercase alphabet.

`GET /api/referrals/validate/[code]` is public. A trimmed uppercase alphanumeric code of length 6-12 resolves an owner; success gives `{success,referrer:{username,displayName,pfpUrl,schoolName}}`. Unknown code is 404, malformed code 400. Owner lookup has no date-expiry check despite the error saying invalid or expired.

`POST /api/referrals/set-ref` is public, takes `{code}`, verifies existence, and stores an HttpOnly thirty-day `ssp_ref` cookie. The shared validator checks the untrimmed body code first, so padding whitespace is rejected before the route's trimming. It returns `{success:true}`.

`GET /api/referrals/leaderboard?limit=20` is public; limit is an integer 1-50. It orders accounts with positive referral totals descending and enriches rank, ID/username, display name, picture, school, and total. Response: `{success,data:[...]}`. Rank is sequential by query order, not shared rank for ties.

Classic login credits a referral only when recordLogin reports the account as new and the cookie points to another owner. The credit transaction prevents counting the same referred ID twice for that referrer. It is not a global uniqueness constraint across all referrers, and AuthV2/passkey logins do not call this credit path.

## Weather

`GET /api/weather?city=Halmstad` is public. Alternatively send both lat and lon: they must be nonblank finite numbers within latitude +/-90 and longitude +/-180. A supplied city must be nonblank and at most 200 characters. Coordinates take precedence, but a supplied invalid city still fails validation. With neither location form, return 400.

City lookup requests the first English Open-Meteo geocoding result with one-day upstream revalidation. Coordinates use Nominatim reverse geocoding with a SchoolSoftPlus User-Agent; a failed reverse lookup falls back to `Your location` and empty country. Forecast requests current temperature, apparent temperature, humidity, WMO weather code, wind speed in km/h, day flag, and daily sunrise/sunset with auto timezone, one forecast day, and five-minute upstream revalidation.

Success is `{success:true,data:{city,country,temp,feelsLike,humidity,windSpeed,condition,description,isDay,sunrise,sunset,timezone,dt}}`. Temperature, apparent temperature, and wind are rounded; country is the uppercase provider country code. Sunrise, sunset, and dt are converted through JavaScript Date to Unix seconds. WMO codes map to Clear/Clouds/Fog/Drizzle/Rain/Snow/Thunderstorm; unknown codes become Clouds with Unknown description. Missing provider numeric fields use zero defaults. Date strings without offsets are interpreted by the server's JavaScript Date behavior; they are not explicitly converted using the returned timezone string. Forecast/geocode errors return 502 with their message. The outer API response still uses private/no-store.

## Statistics and health

`GET /api/stats` is public and reads `stats/loginStats`. Missing document or a read failure is 500. It projects headline login/API totals, messaging totals, feature counters, and hour/day/school/date histogram maps, defaulting absent fields to zero or empty objects. It does not expose the legacy users array. Counter names are source-defined; totalApiCalls is an instrumented feature count, not a census of every HTTP request.

`recordLogin` increments total_logins, total_successful_logins, total_api_calls, and unique_logins when appropriate, and updates `login_users/{userId}`. `trackLoginEvent` only updates UTC histograms. Mobile token paths call the histogram helper without recordLogin, and passkey authentication does not call either helper. AI note/flashcard routes do not increment the insight AI metric. Reaction totals count toggles, including removals. Most feature counters use fire-and-forget update calls and can be lost on failure or runtime shutdown.

`GET /api/stats/firebase` is public and reads `service_status/firestore`. It is not a live Google Cloud Monitoring query. Missing document or read failure is 503. A document reporting an outage or RESOURCE_EXHAUSTED returns an operational-false JSON body with HTTP 200. Missing operational defaults true; missing usage totals default to zero maps, limits to null, exceeded to an empty array. No writer or scheduler for this status document is implemented here, so freshness depends on an external updater.

`GET /api/version` is public and returns `{version:APP_VERSION}` from `app/api/lib/version.ts`. It does not read package.json dynamically. The default private/no-store response policy applies.
