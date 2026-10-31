# app/api/lib/profileDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `4395c71e828ca87b29ac477a0a2f8654888c1248ae1f3ada31f84dbdd4abaf82`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## UserProfile

```ts
export interface UserProfile {
  username: string;
  loginUsername: string;
  userId: string;
  displayName: string; // custom display name (editable)
  bio: string;
  pronouns: string;
  location: string;
  website: string;
  pfpUrl: string;
  coverUrl: string;
  accentColor: string; // profile accent e.g. "#7c6af7"
  // social links
  github: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  // calls
  ringtone: string; // ringtone ID, e.g. "default" | "classic" | "digital" | "soft" | "pulse" | "custom"
  ringtoneCustomUrl: string; // custom MP3 URL, used when ringtone === "custom"
  // privacy
  dmPrivacy: 'everyone' | 'nobody'; // who can initiate DMs
  // read-only snapshot fields (refreshed from session on every save)
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  joinedAt: number; // first profile creation timestamp
  updatedAt: number;
}
```

## getProfile

```ts
export async function getProfile(userId: string): Promise<UserProfile | null>;
```

## ProfileUpdate

```ts
export interface ProfileUpdate {
  loginUsername?: string;
  school?: string;
  displayName?: string;
  bio?: string;
  pronouns?: string;
  location?: string;
  website?: string;
  pfpUrl?: string;
  coverUrl?: string;
  accentColor?: string;
  github?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  ringtone?: string;
  ringtoneCustomUrl?: string;
  dmPrivacy?: string;
  // session snapshot
  firstName?: string;
  lastName?: string;
  email?: string;
  schoolName?: string;
  userType?: string;
}
```

## upsertProfile

```ts
export async function upsertProfile(userId: string, update: ProfileUpdate): Promise<UserProfile>;
```
