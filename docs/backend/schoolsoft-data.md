# SchoolSoft data routes

These routes use the verified session described in [architecture](architecture.md). The SchoolSoft client fixes the origin and school path, sends cookies or a SchoolSoft access token, and bounds individual upstream requests. Aggregations can make several sequential or parallel requests, so an eight-second per-request timeout is not an eight-second total response guarantee.

## Assignments and planning

`GET /api/assignments/week?week=44&year=2026` requires both query fields. It forwards to `/rest-api/student/ps/assignments/start-page?week=44&year=2026` and returns `{success:true,data:upstreamPayload}`. It increments the assignment-fetch counter on success. It does not store assignments in Firestore.

`GET /api/assignment/[id]` defaults to assignment mode. Only `type=planning` switches branches; other strings still use assignment mode.

In assignment mode it fetches `/rest-api/student/ps/assignments/{id}/view`, then requests sections, connected plannings, assessment, and available assessment-grid columns in parallel. Each `GRADECRITERIA` section triggers a selected-criteria request using `typeId`, falling back to section ID. The returned `assignment` contains numeric ID, title, subtitle, description, status, dates/times, subject metadata, submission/result statuses, and the full `_raw` view. Arrays default to empty; assessment is normalized to review, teacher/student comments, `partialMoments`, and `assessedCriteriaTabs`.

In planning mode it loads `/plannings/{id}/planning_parts/tabs`, uses only the first tab, and fetches its view and sections. Empty tabs or absent view produce 404. The response keeps the same envelope but returns the planning view without assignment normalization, empty connected plannings, empty assessment, and empty grading arrays.

```js
const item = await fetch('/api/assignment/12345').then(r => r.json());
console.log(item.assignment.title, item.assessment.teacherComment);
const planning = await fetch('/api/assignment/12345?type=planning').then(r => r.json());
```

The `safeFetch` helper in this route only absorbs upstream 403/404 as null. Other errors can fail the entire aggregation. The comment suggesting every sub-request is nonfatal is broader than the implementation.

## Subjects and grade scans

| Route | Work and response |
| --- | --- |
| `GET /api/subjects` | Fetch `/subjectroom/all`; for every activity fetch entities, unread count, and teachers in parallel. Return `{success,subjects}`. Each entity gains `entityType`, chosen from whether `planningId` is truthy. A failure within one subject's enrichment gives that subject empty entities/teachers and unread zero. Failure of the initial list fails the route. |
| `GET /api/subjects/[id]` | Fetch room view, examinations with `activityId`, submissions with `activityId`, and table rows in parallel. Return `{success,subject,overview:{examinations,submissions},assignments}`. A failed component fails the whole route. |
| `GET /api/subjects/results_all` | Fetch `/subjectroom/results/grid/rows`, return `{success,rows}` without local row normalization. |
| `POST /api/subjects/[id]/grades` | Scan assessments from subject table rows. No request body is required. Return `{success,scanned,total,skipped,grades}` without saving a tracker. |

The scan selects reported assignment rows plus expired, not-yet-reported assignment rows. Reported rows skip the view request. Expired candidates must have a view whose result status is `REPORTED`. It fetches assessments in batches of four, skips unusable rows, and returns only rows with a derived grade. Table 403/404 becomes an empty list. Optional scan fetches absorb 400, 403, 404, and upstream 5xx; per-item exceptions are also skipped.

An explicit letter parsed from review wins and is marked `confirmed` with source `review`. Otherwise shared inference uses criteria if tabs exist; it does not fall back to points just because those tabs contain no usable levels. Criteria levels below 7 are discarded; effective level is `0.65 * minimum + 0.35 * average`, mapped at 10.5/9.5/8.5/7.5/7 to A/B/C/D/E. Points map at 95/85/70/50/40 percent. Inferred results are `estimated`. These are application estimates, not final SchoolSoft grades.

```js
const scanResponse = await fetch('/api/subjects/120/grades', { method: 'POST' });
const scan = await scanResponse.json();
// Saving is a separate request. Pass the scan results explicitly.
await fetch('/api/grade-tracker/120', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scanned: scan.grades, subjectName: 'Mathematics' })
});
```

## Schedule, lunch, and legacy start page

`GET /api/schedule?week=44` calls `/rest-api/student/calendar/lessons/week/44`. Omitting week uses the server's current ISO week; there is no year selection in this upstream URL. Arrays are used directly; objects become `Object.values`. Lessons without truthy eventId or startDate are dropped. Duplicates are removed by startDate plus endDate, even if their event IDs differ. The first duplicate wins and the result is sorted by start time. Response: `{success:true,schedule,week}`. A successful call increments schedule views.

`GET /api/lunch?week=44` requires week, calls `/rest-api/lunchmenu/week/44`, returns `{success:true,data}`, and increments lunch fetches. Meal fields remain the upstream contract.

`GET /api/startpage` downloads `/jsp/student/right_student_startpage.jsp`, decodes ISO-8859-1, and parses homework and tests. Homework contains `dateAndSubject`, `title`, and a string array `content`; tests contain `title`, `description`, and an optional source `link`. Response: `{success:true,data:{homework,tests}}`. These are parser results from legacy markup, not the modern assignment aggregate.

## News

`GET /api/news?orgid=18` requires both a verified browser session and a SchoolSoft token. Organization defaults to the verified session organization. It requests `/eva/api/v2/student/{verifiedUserId}/schools/{orgId}/news` and returns the raw upstream JSON directly, usually an array. There is no `success` wrapper, and list descriptions are not sanitized by this handler.

`GET /api/news/[id]?orgid=18` has the same AuthV2 requirement, requests the corresponding EVA detail URL, and returns the upstream object with both `description` and `descriptionHtml` replaced by sanitized HTML. Other upstream fields, including attachments, remain. The transformation:

- Converts a supported subset of square-bracket SchoolSoft markup to HTML.
- Allows paragraphs/divs, basic emphasis/spans, lists, links, images, and line breaks.
- Converts supported inline span styles to a fixed set of formatting classes; arbitrary CSS is discarded.
- Restricts link schemes to HTTP, HTTPS, and mailto.
- Rewrites `showFileImage.jsp?fileid=...` images only when the file ID matches an IMAGE attachment on this article. Other image sources lose their source.

Rewritten images use `/api/file?id=...&type=image&responseType=redirect`. Despite that parameter value, the current file route streams bytes; it only treats `responseType=url` specially. The detail route does not increment the legacy news counter.

`GET /api/news/legacy` works with classic cookies. It parses the legacy start page's news table into `{id,title,preview}` and returns `{success:true,data:[...]}`. IDs come from `requestid` in links and may be null. It increments news fetches. It is not a fallback performed automatically by `/api/news`.

`GET /api/news/pfp?id=3020` accepts a digits-only teacher ID, requests `/jsp/student/pictureFile.jsp?teacherId=3020`, and returns binary data with upstream content type and cache control, falling back to JPEG and private/no-store. The correct URL is a query parameter, not `/api/news/id=3020`.

## Files

`GET /api/file?id=123` requires a verified session with a SchoolSoft token. It requests `/eva/api/v1/resource/attachment/{encodedId}` and expects 303 plus Location. An upstream 404 returns 404; unexpected status or destination becomes 502. The destination must be HTTPS without embedded credentials.

With `responseType=url`, it returns `{url}`. Otherwise it downloads the destination with a ten-second timeout and redirects disabled. Only a destination on `https://sms.schoolsoft.se` within the current school's path receives the Bearer token. Other HTTPS destinations receive no token.

The result is a stream with private/no-store, nosniff, and a restrictive sandbox CSP. Recognized raster image types can display inline; other types receive `Content-Disposition: attachment`. The `type` query parameter is ignored. There is no file-upload counterpart to SchoolSoft here.

```sh
curl -b cookies.txt 'http://localhost:3000/api/file?id=123&responseType=url'
curl -b cookies.txt 'http://localhost:3000/api/file?id=123' -o attachment.bin
```

## People and school discovery

`GET /api/people/class` parses the first table under `.h2_container` on `right_student_class.jsp`. Each left/right student cell can yield `{name,email,address}`. Missing email/address becomes null and address line breaks become newlines. It returns `{success,students}`.

`GET /api/people/staff` parses `right_student_staff.jsp` into named sections and a flat `staff` list. Members contain name, firstName, lastName, roles, workphone, email, contactInfo, and pictureUrl. First names are formed by removing the bold surname from the full cell text. Roles split on line breaks. The flat list deduplicates by email, falling back to name; section lists retain their own entries. Relative picture URLs are prefixed with the school's base URL.

`GET /api/schools` is public. It fetches SchoolSoft's internal login school list, extracts the first evaUrl path segment as ID, trims names, drops entries without a slug, and sorts with Swedish locale. Response: `{success:true,schools:[{name,id}]}`. Fresh success has public cache headers and a one-hour process cache. On fetch failure, a prior cached result is returned with `stale:true`; without a cached result it returns 502.

## Custom SchoolSoft proxy

`/api/custom` exports GET, POST, PUT, and DELETE. The required `x-url` header must be a relative path beginning `rest-api/` or `eva/api/`, use the allowed character set, and avoid traversal, absolute URL, or encoded CR/LF patterns. The client is fixed to the verified session's school. This is not an arbitrary-host proxy.

It forwards browser SchoolSoft cookies, uses JSON response mode, and wraps upstream data as `{success:true,data}` while preserving the upstream success status. Non-GET requests with bodies use the shared bounded JSON-object reader. It does not automatically add AuthV2 Bearer headers. Errors use `handleApiError`.

```js
const result = await fetch('/api/custom', {
  headers: { 'x-url': 'rest-api/student/ps/subjectroom/all' }
}).then(r => r.json());
```

See [the route reference](routes/README.md) for exact request reads and response branches.
