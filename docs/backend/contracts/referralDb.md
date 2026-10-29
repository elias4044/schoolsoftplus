# app/api/lib/referralDb.ts

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/referralDb.ts#L1) | [Contract index](README.md) | [Architecture](../architecture.md)

Source SHA-256: `c9ef9c544df7ca73bd7d7cabbd08887247e751d6581bd75feab871daf3c4339f`. These are source-derived declarations, not a claim that TypeScript types alone validate runtime data. Read the domain guides for semantics and side effects. Non-ASCII text is escaped in excerpts.

## ReferredUserEntry

```ts
export interface ReferredUserEntry {
  userId: string;
  joinedAt: number;
}
```

## ReferralData

```ts
export interface ReferralData {
  code: string;
  totalReferrals: number;
  referredUsers: ReferredUserEntry[];
  createdAt: number;
  updatedAt: number;
}
```

## LeaderboardEntry

```ts
export interface LeaderboardEntry {
  userId: string;
  totalReferrals: number;
  rank: number;
}
```

## getOrCreateReferralCode

```ts
export async function getOrCreateReferralCode(userId: string): Promise<ReferralData>;
```

## getReferralData

```ts
export async function getReferralData(userId: string): Promise<ReferralData | null>;
```

## getUserIdByCode

```ts
export async function getUserIdByCode(code: string): Promise<string | null>;
```

## creditReferral

```ts
export async function creditReferral(
  referrerUsername: string,
  newUsername: string
): Promise<boolean>;
```

## getLeaderboard

```ts
export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]>;
```
