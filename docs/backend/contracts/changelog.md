# app/api/lib/changelog.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/changelog.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `41731c76344aac7fa981b4c0ea7a7a3c6017588094c0941b1a047939bd9b806b`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## ChangelogTag

```ts
export type ChangelogTag = 'feature' | 'improvement' | 'fix' | 'security' | 'breaking';
```

## ChangelogItem

```ts
export interface ChangelogItem {
  text: string;
  tag?: ChangelogTag;
}
```

## ChangelogSection

```ts
export interface ChangelogSection {
  title: string;
  items: ChangelogItem[];
}
```

## ChangelogEntry

```ts
export interface ChangelogEntry {
  version: string;
  date: string; // ISO date string
  title: string;
  summary: string;
  tags: ChangelogTag[];
  sections: ChangelogSection[];
  githubUrl?: string;
  highlight?: boolean; // pin to top / show as "new"
}
```

## CHANGELOG

Large static data; inspect the [source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/changelog.ts#L24).
