import { db } from "./firebaseAdmin";

const COL = "profiles_v1";

export interface UserProfile {
  username: string;       // key — SchoolSoft userName
  displayName: string;    // custom display name (editable)
  bio: string;
  pronouns: string;
  location: string;
  website: string;
  pfpUrl: string;         // hosted on imgbb
  coverUrl: string;       // banner image, hosted on imgbb
  accentColor: string;    // profile accent e.g. "#7c6af7"
  // social links
  github: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  // privacy
  dmPrivacy: "everyone" | "nobody";  // who can initiate DMs
  // read-only snapshot fields (refreshed from session on every save)
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  joinedAt: number;   // first profile creation timestamp
  updatedAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToProfile(doc: FirebaseFirestore.DocumentSnapshot<any>): UserProfile {
  const d = doc.data()!;
  return {
    username:    doc.id,
    displayName: d.displayName ?? "",
    bio:         d.bio         ?? "",
    pronouns:    d.pronouns    ?? "",
    location:    d.location    ?? "",
    website:     d.website     ?? "",
    pfpUrl:      d.pfpUrl      ?? "",
    coverUrl:    d.coverUrl    ?? "",
    accentColor: d.accentColor ?? "",
    github:      d.github      ?? "",
    twitter:     d.twitter     ?? "",
    instagram:   d.instagram   ?? "",
    linkedin:    d.linkedin    ?? "",
    dmPrivacy:   d.dmPrivacy === "nobody" ? "nobody" : "everyone",
    firstName:   d.firstName   ?? "",
    lastName:    d.lastName    ?? "",
    email:       d.email       ?? "",
    schoolName:  d.schoolName  ?? "",
    userType:    d.userType    ?? "",
    joinedAt:    typeof d.joinedAt === "number" ? d.joinedAt : Date.now(),
    updatedAt:   typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
  };
}

export async function getProfile(username: string): Promise<UserProfile | null> {
  const doc = await db.collection(COL).doc(username).get();
  if (!doc.exists) return null;
  return docToProfile(doc);
}

export interface ProfileUpdate {
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
  dmPrivacy?: string;
  // session snapshot
  firstName?: string;
  lastName?: string;
  email?: string;
  schoolName?: string;
  userType?: string;
}

export async function upsertProfile(
  username: string,
  update: ProfileUpdate
): Promise<UserProfile> {
  const ref = db.collection(COL).doc(username);
  const existing = await ref.get();
  const payload: Record<string, unknown> = { ...update, updatedAt: Date.now() };
  // Set joinedAt only on first creation
  if (!existing.exists) payload.joinedAt = Date.now();
  await ref.set(payload, { merge: true });
  const doc = await ref.get();
  return docToProfile(doc);
}
