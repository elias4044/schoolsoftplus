import axios from "axios";

/**
 * Checks if the user session is still valid by hitting the SchoolSoft session endpoint.
 * @param {string} cookies - The cookie string from the user's session.
 * @returns {Promise<boolean>} true if authenticated, false otherwise.
 */
export async function authUser(cookies) {

  if (!cookies) {
    console.warn("authUser: No cookies provided.");
    return false;
  }

  try {
    const response = await axios.get(
      "https://sms.schoolsoft.se/engelska/rest-api/session",
      {
        responseType: "json",
        headers: {
          Cookie: cookies,
          "User-Agent": "Mozilla/5.0",
          Referer: "https://sms.schoolsoft.se/engelska/",
          Origin: "https://sms.schoolsoft.se",
        },
        validateStatus: () => true, // prevents axios from throwing on non-2xx
      }
    );

    if (response.status === 200) {
      return true;
    }

    if (response.status === 401) {
      console.warn("authUser: Session expired (401).");
      return false;
    }

    console.warn(`authUser: Unexpected status code: ${response.status}`);
    return false;
  } catch (error) {
    console.error("authUser: Unexpected network error:", error.message);
    return false;
  }
}
