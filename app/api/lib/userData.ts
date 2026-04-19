import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/api/lib/firebaseAdmin";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";

type UserEntry = {
  username: string;
  data: {
    notes: { note: string; time: string }[];
    goals: { goal: string; time: string }[];
  };
};

type DataKey = "notes" | "goals";
type ItemKey = "note" | "goal";

// -----------------------------------------------------------------------------
// Shared logic for GET (fetch), POST (create), DELETE (remove) on user data.
// -----------------------------------------------------------------------------

/** GET /api/notes  or  GET /api/goals */
export async function getUserData(
  req: NextRequest,
  dataKey: DataKey
): Promise<NextResponse> {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school, username } = sess;
  const normalised = username.toLowerCase().trim();

  if (!normalised) {
    return NextResponse.json(
      { success: false, error: "Username not found in session." },
      { status: 400 }
    );
  }

  if (!(await authUserWithUsername(cookies, normalised, school))) {
    return NextResponse.json(
      { success: false, error: "Authentication failed." },
      { status: 401 }
    );
  }

  try {
    const statsDoc = await db.collection("stats").doc("loginStats").get();
    if (!statsDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Stats document not found." },
        { status: 500 }
      );
    }

    const user = (statsDoc.data()!.users as UserEntry[]).find(
      (u) => u.username === normalised
    );
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user.data[dataKey] ?? [],
    });
  } catch (err) {
    console.error(`[get${dataKey}]`, (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/** POST /api/notes  or  POST /api/goals
 *  Body: { <itemKey>, time }
 */
export async function createUserData(
  req: NextRequest,
  dataKey: DataKey,
  itemKey: ItemKey
): Promise<NextResponse> {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school, username } = sess;
  const normalised = username.toLowerCase().trim();

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { time } = body;
  const item = body[itemKey];

  if (!item || !time) {
    return NextResponse.json(
      { success: false, error: `${itemKey} and time are required.` },
      { status: 400 }
    );
  }

  if (!(await authUserWithUsername(cookies, normalised, school))) {
    return NextResponse.json(
      { success: false, error: "Authentication failed." },
      { status: 401 }
    );
  }

  try {
    const statsRef = db.collection("stats").doc("loginStats");
    const statsDoc = await statsRef.get();
    if (!statsDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Stats document not found." },
        { status: 500 }
      );
    }

    const usersData = statsDoc.data()!;
    const users: UserEntry[] = usersData.users;
    const userIndex = users.findIndex((u) => u.username === normalised);
    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    const user = users[userIndex];
    user.data[dataKey] ??= [];

    if (user.data[dataKey].length >= 10) {
      return NextResponse.json(
        { success: false, error: `Maximum of 10 ${dataKey} reached.` },
        { status: 400 }
      );
    }

    user.data[dataKey].push({ [itemKey]: item, time } as never);
    await statsRef.set(usersData);

    return NextResponse.json(
      { success: true, data: { [itemKey]: item, time } },
      { status: 201 }
    );
  } catch (err) {
    console.error(`[create${dataKey}]`, (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/** DELETE /api/notes  or  DELETE /api/goals
 *  Body: { <itemKey>, time }
 */
export async function deleteUserData(
  req: NextRequest,
  dataKey: DataKey,
  itemKey: ItemKey
): Promise<NextResponse> {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school, username } = sess;
  const normalised = username.toLowerCase().trim();

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { time } = body;
  const item = body[itemKey];

  if (!item || !time) {
    return NextResponse.json(
      { success: false, error: `${itemKey} and time are required for deletion.` },
      { status: 400 }
    );
  }

  if (!(await authUserWithUsername(cookies, normalised, school))) {
    return NextResponse.json(
      { success: false, error: "Authentication failed." },
      { status: 401 }
    );
  }

  try {
    const statsRef = db.collection("stats").doc("loginStats");
    const statsDoc = await statsRef.get();
    if (!statsDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Stats document not found." },
        { status: 500 }
      );
    }

    const usersData = statsDoc.data()!;
    const users: UserEntry[] = usersData.users;
    const userIndex = users.findIndex((u) => u.username === normalised);
    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    const user = users[userIndex];
    user.data[dataKey] ??= [];

    const itemIndex = (user.data[dataKey] as Record<string, string>[]).findIndex(
      (i) => i[itemKey] === item && i.time === time
    );
    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, error: `${itemKey} not found.` },
        { status: 404 }
      );
    }

    user.data[dataKey].splice(itemIndex, 1);
    await statsRef.set(usersData);

    return NextResponse.json({
      success: true,
      message: `${itemKey} deleted successfully.`,
    });
  } catch (err) {
    console.error(`[delete${dataKey}]`, (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
