import axios from "axios";

/**
 * Checks if the user session is still valid by hitting the SchoolSoft session endpoint.
 * @param {string} cookies - The cookie string from the user's session.
 * @param {string} username - The username of the user.
 * @returns {Promise<boolean>} true if authenticated, false otherwise.
 */
export async function authUserWithUsername(cookies, username) {

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
        validateStatus: () => true,
      }
    );

    // Check if first request succeeded before making second request
    if (response.status !== 200) {
      console.warn(`authUser: Session check failed with status: ${response.status}`);
      return false;
    }

    const response2 = await axios.get(
      "https://sms.schoolsoft.se/engelska/rest-api/student/header/student",
      {
        responseType: "json",
        headers: {
          Cookie: cookies,
          "User-Agent": "Mozilla/5.0",
          Referer: "https://sms.schoolsoft.se/engelska/",
          Origin: "https://sms.schoolsoft.se",
        },
        validateStatus: () => true,
      }
    );

    // Check if second request succeeded
    if (response2.status !== 200) {
      console.warn(`authUser: Student header fetch failed with status: ${response2.status}`);
      return false;
    }

    // Check if data exists
    if (!response2.data) {
      console.warn("authUser: response2.data is empty or undefined");
      return false;
    }

    // Safe access to username
    let fetchedUsername = response2.data.firstName + "." + response2.data.lastName;
    fetchedUsername = fetchedUsername.toLowerCase();

    // Verify username matches
    if (fetchedUsername !== username) {
      console.warn(`authUser: Username mismatch. Expected: ${username}, Got: ${fetchedUsername}`);
      return false;
    }

    return true;

  } catch (error) {
    console.error("authUser: Unexpected network error:", error.message);
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", error.response.data);
    }
    return false;
  }
}