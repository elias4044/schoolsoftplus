# Grade exchange and SchoolSoft import

The final-grades page supports a versioned JSON exchange file and pasted SchoolSoft tables. Both paths produce a read-only preview; the imported records become editable after applying it. Applying an import replaces the current list locally; the user must explicitly save it to update their account. Target grades in the merit planner are never exported or imported.

This is an application format, not an official SchoolSoft or Swedish education standard.

## Version 1 JSON

Export uses `final-grades.v1.json`, UTF-8, and MIME type `application/json`. Import accepts a `.json` file or pasted JSON text. The maximum input size is 2 MiB (2,097,152 UTF-8 bytes). A leading Unicode BOM is accepted.

The schema ships at `/schemas/final-grades.v1.schema.json`, with source at [public/schemas/final-grades.v1.schema.json](../public/schemas/final-grades.v1.schema.json) or hosted at [https://ssp.elias4044.com/schemas/final-grades.v1.schema.json](https://ssp.elias4044.com/schemas/final-grades.v1.schema.json). The runtime validator is [lib/final-grades/format.ts](../lib/final-grades/format.ts).

```json
{
  "format": "schoolsoftplus.final-grades",
  "version": 1,
  "exportedAt": "2026-11-07T12:00:00.000Z",
  "periods": ["24/25 Fall", "24/25 Spring"],
  "subjects": [
    {
      "id": "english",
      "subject": "English",
      "comment": "Practise speaking",
      "manual": false,
      "grades": [
        { "period": "24/25 Fall", "grade": "C", "isPreviousTerm": false, "raw": "C" },
        { "period": "24/25 Spring", "grade": "B", "isPreviousTerm": true, "raw": "(B)" }
      ]
    }
  ]
}
```

All identifiers and grades in examples are illustrative.

| Field | Contract |
| --- | --- |
| `format` | Required literal `schoolsoftplus.final-grades`. |
| `version` | Required numeric integer `1`. Unknown versions fail rather than being guessed. |
| `exportedAt` | Optional ISO 8601 UTC timestamp ending in `Z`, at most 40 characters. Export includes it. It describes the file, not the last account save. |
| `periods` | Required unique array, oldest to newest, at most 20 nonblank names of up to 60 characters. Labels are opaque strings, not parsed dates. |
| `subjects` | Required array, at most 80 subjects. Empty arrays are valid. |
| `subjects[].id` | Required unique, stable, nonblank string, at most 140 characters. Opaque; UUIDs or external IDs work. |
| `subjects[].subject` | Required nonblank display name, up to 120 characters. Subject names need not be unique; IDs must be. |
| `subjects[].comment` | Optional text up to 1000 characters, defaults to the empty string. Unicode, line breaks and punctuation are preserved. |
| `subjects[].manual` | Optional boolean provenance hint, defaults to `false`. It does not change merit. |
| `subjects[].grades` | Required array of at most 20 cells, at most one cell per period per subject. Cells may be sparse. |
| `grades[].period` | Required exact reference to one of the top-level period names. |
| `grades[].grade` | Required uppercase `A`, `B`, `C`, `D`, `E`, `F`, or JSON `null`. `null` means ungraded; F is a recorded zero-point grade. Empty strings and lowercase letters are invalid JSON grade values. |
| `grades[].isPreviousTerm` | Optional boolean, defaults to `false`. `true` marks a grade carried forward rather than newly awarded. |
| `grades[].raw` | Optional source text, at most 20 characters. If omitted, derived from `grade` and `isPreviousTerm` (`B`, `(B)`, or an empty string). Calculations always use the structured fields, never `raw`. |

Import orders each subject's cells by top-level `periods` and fills omitted cells with ungraded records. This preserves chronology even when different subjects have sparse histories. Unknown JSON properties are accepted and discarded; this is not an extension-preserving archive. Export includes only the documented record fields and does not leak account identifiers, inferred merit flags, authentication information or planner targets. File parsing preserves text; account saving applies the API's existing trimming rules.

The JSON Schema covers field types, limits, nonblank required text and unique period names. The runtime validator additionally enforces unique subject IDs, unique period references within each subject, references into `periods`, and the byte-size limit. Run both if validating in another language. Schema `default` values are annotations; consumers must apply them themselves.

Storage text limits are measured in UTF-16 code units, matching JavaScript `string.length`. JSON Schema measures `maxLength` in Unicode code points, so another-language consumer must also apply the storage limit when strings contain supplementary characters such as emoji. The runtime validator is authoritative for import acceptance.

## Use from another tool

Build a JSON object with the exact format identifier and version, put period names in chronological order, assign stable subject IDs, and write UTF-8 JSON. Users can choose the file under **Import grades > Grade JSON**. The preview shows subjects, periods and sample rows before applying anything.

Within this repository, the helpers have no UI dependencies:

```ts
import { exportFinalGradesFile, parseFinalGradesFile } from '@/lib/final-grades/format';

const file = parseFinalGradesFile(jsonText); // throws a readable Error on invalid input
console.log(file.periods, file.subjects);
const exportedText = exportFinalGradesFile(file.subjects);
```

`exportFinalGradesFile` derives period order from recorded sequences and validates before returning pretty-printed JSON. An empty subject list exports with no periods because persistent storage is subject-based. Use `getGradePeriods` to match the UI's inferred order. Within each subject the canonical array is ordered oldest to newest; the latest non-null cell supplies the current grade. An empty latest cell does not erase an earlier awarded grade.

### Save through the API

The exchange envelope is a file format, not a replacement for the authenticated HTTP contract. After validation, submit only `{ subjects: file.subjects }` to `PUT /api/final-grades`. Never send the whole file as the request body. Existing account authentication is required; the import does not grant access.

```ts
const file = parseFinalGradesFile(jsonText);
const response = await fetch('/api/final-grades', {
  method: 'PUT',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subjects: file.subjects }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error ?? 'Could not save final grades');
```

Reading `GET /api/final-grades` returns an account document, not this exchange envelope. Use its `finalGrades.subjects` as input to `exportFinalGradesFile`; a missing document can be exported as an empty list. See the [route contract](backend/routes/final-grades.md) for authentication and limits.

## SchoolSoft table importer

Implementation: [lib/final-grades/schoolsoft-import.ts](../lib/final-grades/schoolsoft-import.ts). The importer is a local parser; it does not log in to SchoolSoft, fetch records, execute clipboard HTML or send pasted data elsewhere.

```ts
import { parseSchoolSoftGrades } from '@/lib/final-grades/schoolsoft-import';

const result = parseSchoolSoftGrades(pastedTable);
// result: { subjects: FinalGradeSubject[], periods: string[], warnings: string[] }
// Throws for an unusable table; warnings describe recoverable issues.
```

It supports:

- Tab-separated copied tables, preserving empty cells and trailing blank columns.
- Spreadsheet quoted cells, including escaped double quotes, tabs and line breaks in comments.
- Plain text separated by two or more spaces. Single-space text is ambiguous and should be copied again with tabs.
- English `Subject` / `Comments` and Swedish `Ämne` (with its normal Swedish spelling) / `Notering` / `Noteringar` headings, case insensitive.
- A single header row, aligned year/season header rows with an empty subject column, and SchoolSoft's wrapped year/season headings.
- Repeated `Subject` or Swedish subject-column labels are excluded from period names, including labels repeated in aligned header rows. They never consume a grade column or shift the latest term's grade.
- Uppercase/lowercase A-F and parentheses such as `( c )`. Parentheses set `isPreviousTerm: true`; unmatched parentheses are not interpreted as grades.
- Empty cells, hyphens, en/em dashes and `N/A` as ungraded. An unrecognized cell becomes `null` with a warning and retains up to 20 characters of its source text in `raw`.
- Missing trailing grade cells as ungraded, with a warning. Extra columns become a comment; without an explicit comment heading this produces a warning.
- Missing headings when a row contains recognizable grade cells. Period names become `Period 1`, `Period 2`, etc., and a warning asks the user to check the order.

The parser normalizes Windows/old-Mac line endings, a leading BOM, and nonbreaking spaces. Blank rows, repeated subject headings and known total rows are skipped. Comments are retained as plain text. Every imported row receives a new UUID, so duplicate names remain separate records.

Limits match storage: 80 subjects, 20 periods, 120-character subject names, 60-character period names and 1000-character comments. Duplicate term names, excessive dimensions, oversized names/comments, unclosed quotes, or no usable table fail explicitly. Byte limits are applied by the import UI before calling this parser; standalone users should apply `MAX_GRADE_IMPORT_BYTES` themselves.

### Example pasted table

The separators below are actual tabs:

```text
Subject	24/25 Fall	24/25 Spring	Comments
English	C	(B)	Carried forward
Mathematics	D	C	
Art		E	
```

The parser preserves Art's empty first-period cell. The UI previews up to five subjects and ten warnings, reports additional counts, and applies the entire parsed record. Imported data stays unsaved until **Save changes**. Import replaces rather than merges records; exporting first is a convenient backup.

`parseFinalGradesPaste` in `analytics.ts` remains a compatibility wrapper returning only the subject array, or `[]` on failure. New integrations should use `parseSchoolSoftGrades` for diagnostics.

## Versioning and compatibility

Do not reinterpret an existing version's grade scale, field meaning or chronology rules. A future incompatible change must use a new numeric version and schema URL. Readers should reject unsupported versions and ignore unknown properties of supported versions. Preserve stable subject IDs when transforming a JSON file. SchoolSoft paste import intentionally creates fresh IDs.

Run `node --test tests/final-grades.test.cjs` for calculation, parser, validation and round-trip coverage. The JSON format itself does not certify programme eligibility or language-bonus qualification; calculations remain the app's planning estimates.

## UI integration

`GradeImport` owns source selection, local parsing, file loading, warnings and preview. It calls `onImport(subjects)` only after the user chooses **Use these grades**. The page clears planner targets, swaps the local records and marks the draft unsaved. File loading guards against stale reads when users switch sources or edit pasted text. A failed import does not replace the current records.

`GradeSelect` supplies custom dropdown visuals over the existing Radix Select primitive. The primitive handles focus, keyboard navigation, typeahead, portal placement and dismissal; no visible native select menu is used. File picking retains a hidden browser file input behind a styled action so the operating system can grant access to a user-selected file.

The summary remains present in Overview, Subjects and Merit planner to keep the section selector at a stable vertical position. The selector sticks inside the dashboard's scrolling area. The desktop planner result sits below that selector; tablet and phone layouts stack the result before target controls.

Motion uses the existing grade ease-out token: a 200ms sliding section indicator, 200ms section reveals staggered by 40ms with a maximum delay of 120ms, 180ms dropdown opening and 120ms closing, and 250ms scenario-bar updates. Keyboard-focused section changes skip reveals and keyboard dropdown interactions skip opening/closing motion. Reduced motion removes travel and all dropdown animation, retaining a gentle 120ms content fade. Reading figures are never counted up or moved independently.
