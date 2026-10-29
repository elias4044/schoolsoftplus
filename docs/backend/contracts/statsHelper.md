# app/api/lib/statsHelper.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `4d6d5fb1b62c16ae1a3bf23d06223db8207da9365543857b3d3209a227cfdbb9`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## bumpCounter

```ts
export function bumpCounter(field: string, by = 1): void;
```

## bumpHistogram

```ts
export function bumpHistogram(bucket: string, key: string | number): void;
```

## trackLoginEvent

```ts
export function trackLoginEvent(school: string): void;
```

## trackAiMessage

```ts
export function trackAiMessage(): void;
```

## trackNoteCreated

```ts
export function trackNoteCreated(): void;
```

## trackScheduleView

```ts
export function trackScheduleView(): void;
```

## trackAssignmentsFetch

```ts
export function trackAssignmentsFetch(): void;
```

## trackLunchFetch

```ts
export function trackLunchFetch(): void;
```

## trackNewsFetch

```ts
export function trackNewsFetch(): void;
```

## trackMessageSent

```ts
export function trackMessageSent(): void;
```

## trackConversationCreated

```ts
export function trackConversationCreated(): void;
```

## trackReactionAdded

```ts
export function trackReactionAdded(): void;
```
