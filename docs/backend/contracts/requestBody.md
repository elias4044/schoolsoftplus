# app/api/lib/requestBody.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `2cf3d7143c6ba339da24666de68269f164fa53694d8a22d415dc50fa2e198cdf`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## readRouteBody

```ts
export async function readRouteBody(request: Request): Promise<Record<string, unknown>>;
```

## Runtime validation implementation

This complete module supplies checks beyond TypeScript declarations.

```ts
import { isAccountReference, resolveAccountReference } from './accountRegistry';
import {
  boolean,
  InputError,
  isObject,
  nonEmptyText,
  oneOf,
  readJsonObject,
  text,
  validateFields,
} from './routeValidation';

const documentId = (value: unknown) =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 1500 &&
  !value.includes('/') &&
  value !== '.' &&
  value !== '..';
const userId = isAccountReference;
const members = (value: unknown) =>
  Array.isArray(value) && value.length <= 49 && value.every(userId);
const schemas: Record<string, Record<string, (value: unknown) => boolean>> = {
  '/api/login': {
    username: nonEmptyText(200),
    password: nonEmptyText(1000),
    usertype: oneOf(['1', '2', '3', '4']),
  },
  '/api/auth/login': {
    username: nonEmptyText(200),
    password: nonEmptyText(1000),
    school: nonEmptyText(100),
    orgid: text(30),
  },
  '/api/auth/token': {
    code: nonEmptyText(4096),
    verifier: nonEmptyText(256),
    school: nonEmptyText(100),
    orgid: text(30),
  },
  '/api/auth/refresh': { refreshToken: nonEmptyText(8192), school: nonEmptyText(100) },
  '/api/auth/v2/refresh-token-login': {
    refreshToken: nonEmptyText(8192),
    school: nonEmptyText(100),
    orgid: text(30),
  },
  '/api/friends': { targetUsername: userId, fromUsername: userId, accept: boolean },
  '/api/conversations': {
    type: oneOf(['dm', 'group']),
    targetUsername: userId,
    groupName: nonEmptyText(80),
    groupDescription: text(200),
    encrypted: boolean,
    members,
  },
  '/api/conversations/[conversationId]': {
    content: text(20_000),
    action: oneOf([
      'mark_read',
      'rename',
      'add_member',
      'remove_member',
      'leave',
      'transfer_admin',
    ]),
    groupName: nonEmptyText(80),
    groupDescription: text(200),
    targetUsername: userId,
    replyTo: (value) => isObject(value) && documentId(value.messageId),
    shareCard: (value) =>
      isObject(value) &&
      ['note', 'grade', 'flashdeck'].includes(String(value.type)) &&
      documentId(
        value.type === 'note'
          ? value.noteId
          : value.type === 'grade'
            ? String(value.assignmentId ?? '')
            : value.deckId
      ),
  },
  '/api/conversations/[conversationId]/[messageId]': {
    action: oneOf(['edit', 'pin', 'unpin', 'react']),
    content: nonEmptyText(2000),
    emoji: nonEmptyText(32),
  },
  '/api/group-invites': {
    conversationId: documentId,
    targetUsername: userId,
    inviteId: documentId,
    accept: boolean,
  },
  '/api/presence': { status: oneOf(['online', 'idle', 'offline']) },
  '/api/profile': {
    displayName: text(80),
    bio: text(500),
    pronouns: text(40),
    location: text(80),
    website: text(200),
    pfpUrl: text(500),
    coverUrl: text(500),
    accentColor: text(30),
    github: text(100),
    twitter: text(100),
    instagram: text(100),
    linkedin: text(200),
    dmPrivacy: oneOf(['everyone', 'nobody']),
    ringtone: oneOf(['default', 'classic', 'digital', 'soft', 'pulse', 'custom']),
    ringtoneCustomUrl: text(500),
  },
  '/api/github/issues/create': {
    title: nonEmptyText(256),
    body: text(20_000),
    type: oneOf(['bug', 'feature', 'question']),
  },
  '/api/referrals/set-ref': {
    code: (value) => typeof value === 'string' && /^[A-Za-z0-9]{6,12}$/.test(value),
  },
  '/api/ai/note': {
    action: nonEmptyText(40),
    content: text(100_000),
    title: text(500),
    selection: text(100_000),
  },
  '/api/ai/flashcards': {
    text: nonEmptyText(100_000),
    count: (value) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 50,
    language: text(100),
    instructions: text(10_000),
  },
  '/api/ai/insight': {
    systemPrompt: nonEmptyText(100_000),
    fetchAssignments: boolean,
    fetchSchedule: boolean,
    fetchLunch: boolean,
    fetchNews: boolean,
    week: (value) => typeof value === 'string' && /^(?:[1-9]|[1-4]\d|5[0-3])$/.test(value),
    year: (value) => typeof value === 'string' && /^20\d{2}$/.test(value),
  },
};

export async function readRouteBody(request: Request): Promise<Record<string, unknown>> {
  const body = await readJsonObject(request);
  if (
    body.school !== undefined &&
    (typeof body.school !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.school))
  )
    throw new InputError('Invalid school');
  const pathname = new URL(request.url).pathname.replace(/\/$/, '');
  const route = pathname.startsWith('/api/conversations/')
    ? pathname.split('/').length === 4
      ? '/api/conversations/[conversationId]'
      : '/api/conversations/[conversationId]/[messageId]'
    : pathname;
  validateFields(body, schemas[route] ?? {});
  if (pathname.includes('/passkey/') && request.method === 'POST') {
    if (
      !isObject(body.response) ||
      !documentId(body.response.id) ||
      !isObject(body.response.response)
    )
      throw new InputError('Invalid passkey response');
  }
  if (
    pathname === '/api/group-invites' &&
    request.method === 'PATCH' &&
    typeof body.accept !== 'boolean'
  )
    throw new InputError('accept is required');
  if (pathname === '/api/presence' && !('status' in body))
    throw new InputError('status is required');
  if (schemas[route]?.targetUsername) {
    for (const field of ['targetUsername', 'fromUsername']) {
      if (typeof body[field] === 'string') body[field] = await resolveAccountReference(body[field]);
    }
    if (Array.isArray(body.members))
      body.members = [...new Set(await Promise.all(body.members.map(resolveAccountReference)))];
  }
  return body;
}
```
