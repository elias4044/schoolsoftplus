# app/api/lib/notesDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/notesDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `b2b857e38b0d54432e2d083d443f3347c5cccf8a60ab75abdbf15e654741b1ca`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## NoteStatus

```ts
export type NoteStatus = 'draft' | 'published' | 'archived';
```

## Note

```ts
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string; // markdown
  status: NoteStatus;
  shareToken: string | null;
  createdAt: number; // unix ms
  updatedAt: number;
}
```

## NotePublic

```ts
export type NotePublic = Omit<Note, 'userId' | 'shareToken'>;
```

## getNotesByUser

```ts
export async function getNotesByUser(userId: string): Promise<Note[]>;
```

## getNoteById

```ts
export async function getNoteById(id: string, userId: string): Promise<Note | null>;
```

## getNoteByShareToken

```ts
export async function getNoteByShareToken(token: string): Promise<Note | null>;
```

## createNote

```ts
export async function createNote(
  userId: string,
  title: string,
  content: string,
  status: NoteStatus = 'draft'
): Promise<Note>;
```

## updateNote

```ts
export async function updateNote(
  id: string,
  userId: string,
  updates: Partial<Pick<Note, 'title' | 'content' | 'status'>>
): Promise<Note | null>;
```

## deleteNote

```ts
export async function deleteNote(id: string, userId: string): Promise<boolean>;
```

## generateShareToken

```ts
export async function generateShareToken(id: string, userId: string): Promise<string | null>;
```

## revokeShareToken

```ts
export async function revokeShareToken(id: string, userId: string): Promise<boolean>;
```
