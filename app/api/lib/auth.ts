import axios from "axios";

const DEFAULT_USER_AGENT = "Mozilla/5.0";

/**
 * Verifies that the provided cookies represent a live SchoolSoft session.
 *
 * The `school` parameter determines which school's subdirectory to hit
 * (e.g. "engelska"). Defaults to "engelska".
 */
export async function authUser(cookies: string, school = "engelska"): Promise<boolean> {
  if (!cookies) {
    console.warn("[authUser] No cookies provided.");
    return false;
  }

  try {
    const response = await axios.get(
      `https://sms.schoolsoft.se/${school}/rest-api/session`,
      {
        responseType: "json",
        headers: {
          Cookie: cookies,
          "User-Agent": DEFAULT_USER_AGENT,
          Referer: `https://sms.schoolsoft.se/${school}/`,
          Origin: "https://sms.schoolsoft.se",
        },
        validateStatus: () => true,
      }
    );

    if (response.status === 200) return true;
    console.warn(`[authUser] Session check returned ${response.status}`);
    return false;
  } catch (error) {
    console.error("[authUser] Network error:", (error as Error).message);
    return false;
  }
}

/**
 * Verifies the session AND confirms the session belongs to `expectedUsername`.
 * Username is compared as "firstname.lastname" (lower-cased), matching the
 * format SchoolSoft returns from the student header endpoint.
 */
export async function authUserWithUsername(
  cookies: string,
  expectedUsername: string,
  school = "engelska"
): Promise<boolean> {
  if (!cookies) {
    console.warn("[authUserWithUsername] No cookies provided.");
    return false;
  }

  try {
    const baseHeaders = {
      Cookie: cookies,
      "User-Agent": DEFAULT_USER_AGENT,
      Referer: `https://sms.schoolsoft.se/${school}/`,
      Origin: "https://sms.schoolsoft.se",
    };

    const sessionRes = await axios.get(
      `https://sms.schoolsoft.se/${school}/rest-api/session`,
      { responseType: "json", headers: baseHeaders, validateStatus: () => true }
    );

    if (sessionRes.status !== 200) {
      console.warn(`[authUserWithUsername] Session check failed: ${sessionRes.status}`);
      return false;
    }

    const headerRes = await axios.get(
      `https://sms.schoolsoft.se/${school}/rest-api/student/header/student`,
      { responseType: "json", headers: baseHeaders, validateStatus: () => true }
    );

    if (headerRes.status !== 200 || !headerRes.data) {
      console.warn(`[authUserWithUsername] Student header fetch failed: ${headerRes.status}`);
      return false;
    }

    const fetchedUsername =
      `${headerRes.data.firstName}.${headerRes.data.lastName}`.toLowerCase();

    if (fetchedUsername !== expectedUsername) {
      console.warn(
        `[authUserWithUsername] Username mismatch. Expected: ${expectedUsername}, Got: ${fetchedUsername}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[authUserWithUsername] Network error:", (error as Error).message);
    return false;
  }
}
