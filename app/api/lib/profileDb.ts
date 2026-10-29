import { resolveAccountReference } from './accountRegistry';
import { db } from './firebaseAdmin';
import { assertUserId } from './identity';

const COL = 'profiles_v1';

export interface UserProfile {
  username: string;
  loginUsername: string;
  userId: string;
  displayName: string; // custom display name (editable)
  bio: string;
  pronouns: string;
  location: string;
  website: string;
  pfpUrl: string; // hosted on imgbb
  coverUrl: string; // banner image, hosted on imgbb
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

function docToProfile(doc: FirebaseFirestore.DocumentSnapshot): UserProfile {
  const d = doc.data()!;
  return {
    username: doc.id,
    userId: doc.id,
    loginUsername: d.loginUsername ?? d.username ?? doc.id,
    displayName: d.displayName ?? '',
    bio: d.bio ?? '',
    pronouns: d.pronouns ?? '',
    location: d.location ?? '',
    website: d.website ?? '',
    pfpUrl: d.pfpUrl ?? '',
    coverUrl: d.coverUrl ?? '',
    accentColor: d.accentColor ?? '',
    github: d.github ?? '',
    twitter: d.twitter ?? '',
    instagram: d.instagram ?? '',
    linkedin: d.linkedin ?? '',
    ringtone: d.ringtone ?? 'default',
    ringtoneCustomUrl: d.ringtoneCustomUrl ?? '',
    dmPrivacy: d.dmPrivacy === 'nobody' ? 'nobody' : 'everyone',
    firstName: d.firstName ?? '',
    lastName: d.lastName ?? '',
    email: d.email ?? '',
    schoolName: d.schoolName ?? '',
    userType: d.userType ?? '',
    joinedAt: typeof d.joinedAt === 'number' ? d.joinedAt : Date.now(),
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  userId = await resolveAccountReference(userId);
  const doc = await db.collection(COL).doc(userId).get();
  if (!doc.exists) return null;
  return docToProfile(doc);
}

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

export async function upsertProfile(userId: string, update: ProfileUpdate): Promise<UserProfile> {
  assertUserId(userId);
  const ref = db.collection(COL).doc(userId);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    const payload: Record<string, unknown> = { ...update, userId, updatedAt: Date.now() };
    // Set joinedAt only on first creation
    if (!existing.exists) payload.joinedAt = Date.now();
    transaction.set(ref, payload, { merge: true });
  });
  const doc = await ref.get();
  return docToProfile(doc);
}
