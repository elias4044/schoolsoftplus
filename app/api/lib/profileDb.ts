import { db } from "./firebaseAdmin";

const COL = "profiles_v1";

export interface UserProfile {
  username: string;       // key — SchoolSoft userName
  displayName: string;    // custom display name (editable)
  bio: string;
  location: string;
  website: string;
  pfpUrl: string;         // hosted on freeimage.host
  // read-only snapshot fields (refreshed from session on every save)
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  updatedAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToProfile(doc: FirebaseFirestore.DocumentSnapshot<any>): UserProfile {
  const d = doc.data()!;
  return {
    username:    doc.id,
    displayName: d.displayName ?? "",
    bio:         d.bio ?? "",
    location:    d.location ?? "",
    website:     d.website ?? "",
    pfpUrl:      d.pfpUrl ?? "",
    firstName:   d.firstName ?? "",
    lastName:    d.lastName ?? "",
    email:       d.email ?? "",
    schoolName:  d.schoolName ?? "",
    userType:    d.userType ?? "",
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
  location?: string;
  website?: string;
  pfpUrl?: string;
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
  const payload = { ...update, updatedAt: Date.now() };
  await ref.set(payload, { merge: true });
  const doc = await ref.get();
  return docToProfile(doc);
}
