# AuthV2

After weeks of work and reverse engineering, I'm excited to introduce **AuthV2**.
> Proper documentation coming soon!

## What is AuthV2?

AuthV2 is the authentication method used by SchoolSoft’s mobile apps.

To understand it, first you need to understand how SchoolSoft’s regular web authentication works. The web login uses **session-based authentication**, where you enter your username and password, the server verifies them, and then returns a session cookie such as `JSESSIONID` along with a user identifier or hash. This session is usually short-lived and will expire after about an hour.

This is classic “cookie-based session authentication”: the server stores the user’s session on the backend, and the browser just carries the session cookie. The server trusts that cookie as proof of identity, but only for a limited time (~1 hour). After that, the user must log in again.

AuthV2 is different. It’s not about long‑lived browser sessions; it’s about a **token‑based flow** that the mobile app can re‑use for days without forcing the user to manually log in every hour.


## Why this matters

This means the server only trusts the session cookie for a limited time. After the session expires, the user has to log in again.

In theory, an app could store the username and password and re-authenticate automatically, but that would be a serious security risk. Session-based authentication exists specifically to avoid storing raw credentials and to limit how long a login remains valid.

However, short‑lived sessions are not ideal for mobile apps:
- The app must frequently ask the user to log in.
- Background operations (syncing, notifications) break when the session expires.
- The user experience is much worse than on the official SchoolSoft app, which *doesn’t* require re‑login every hour.

So, we need a different mechanism: one that still starts with username/password, but instead of a short cookie, it gives us a **longer‑lived token** that the app can safely cache and use.


## What is PKCE, and why it matters

The mobile app login flow uses **OAuth 2.0 Authorization Code flow with PKCE**, which is where parameters like `code_challenge`, `code_challenge_method`, `client_id`, `redirect_uri`, `state`, `response_type`, and `orgid` come from.

**PKCE** stands for **Proof Key for Code Exchange**. It is an extension to OAuth 2.0 designed to protect public clients (like mobile apps and SPAs) that cannot safely store a client secret. The idea is simple but powerful:

1. The app generates a **temporary secret** called the `code_verifier`.  
2. The app then computes a **hash** of that secret, called the `code_challenge`.  
3. The app sends the `code_challenge` (not the raw secret) to the authorization server.  
4. Later, when exchanging the authorization code for an access token, the app must send back the original `code_verifier`.  
5. The server recomputes the hash of the `code_verifier` and checks that it matches the `code_challenge` it stored earlier.  

If the hashes match, the server issues the token. If not, the exchange fails.

This protects against a specific attack: if an attacker intercepts the authorization code (e.g., via a misconfigured redirect URI handling), they still cannot get the token without knowing the `code_verifier`. The code alone is useless.

In other words, **PKCE adds a “proof” that the same client that initiated the login is the one requesting the token**, even if the code is somehow leaked.

Because mobile apps are public clients and cannot keep a client secret secure, **PKCE is the recommended way to use OAuth in native apps**.


## How AuthV2 solves this

SchoolSoft’s mobile app appears to use a separate authentication flow from the website.

Instead of relying on a short-lived browser session, the mobile app uses a flow based on **OAuth 2.0 authorization code flow with PKCE**. This is why the login page includes parameters like `code_challenge`, `code_challenge_method`, `client_id`, `redirect_uri`, `state`, `response_type`, and `orgid`.

That flow works like this:

1. Your app (or your backend) initiates login by calling SchoolSoft’s student login URL with the PKCE parameters.  
2. The user enters their SchoolSoft username and password.  
3. If the credentials are valid, SchoolSoft returns an **authorization code** (often via `redirect_uri` or, in your case, as a JSON response).  
4. Your app then calls the token exchange endpoint (`/rest-api/login/token`) and sends:
   - the `code`,
   - the original `code_verifier`,
   - client identifier (`clientId=eApp`),
   - and the grant type (`grantType=code`).
5. SchoolSoft verifies the PKCE proof and, if valid, returns an **access token** (often a JWT or a simple bearer token).  

This access token is then used as a **Bearer token** in API requests:

```http
Authorization: Bearer <token>
```

Because the token can live for days (you return `expires_in: 2592000`, which is 30 days), the app avoids the need to log in every hour and can perform background syncs, fetch schedules, and receive notifications without interrupting the user.

In AuthV2 terms: we’re **not** using the short‑lived `JSESSIONID`‑based session cookie at all. Instead, we’re reusing the same PKCE‑based flow the official mobile app uses, but wiring it through your backend so the app never stores the raw credentials.


## Why this is useful

This explains how the mobile app can keep working without forcing the user to log in every hour.

Instead of depending on a short browser session, it can use a token-based flow that is better suited for mobile use. The token can be cached on the device, refreshed when needed, and reused for weeks, while the server still controls lifetime and revocation.

This also explains how features like background syncing or push notifications can work without repeatedly asking the user to sign in. The app can:
- authenticate silently using the cached token,
- refresh the token (if SchoolSoft supports refresh tokens or a new authorization code flow),
- and only prompt the user to re‑enter their credentials when the token is truly invalid or expired.

In short, AuthV2 **bridges the web‑session model and the mobile‑token model**:
- It starts where the user normally logs in (username/password).
- It finishes with a mobile‑friendly, long‑lived token.
- And it does all of that without ever storing the user’s password in your database or LocalStorage.


## What I found

The login flow redirects to:

```
https://sms.schoolsoft.se/YOUR_SCHOOL/react/#/login/student
```

This URL alone is not enough. It requires several parameters:

- `code_challenge`
- `code_challenge_method`
- `client_id`
- `redirect_uri`
- `state`
- `response_type`
- `orgid`

These parameters are part of the PKCE-based login flow and are used to protect the authorization exchange.

`client_id=eApp` identifies the mobile app client, `redirect_uri` is the deep‑link URL that SchoolSoft will try to redirect to after login, and `response_type=code` tells the server that this is an OAuth 2.0 Authorization Code flow. The `state` parameter is used to prevent CSRF-style attacks by ensuring the callback matches the original request.

`code_challenge` and `code_challenge_method` are the PKCE specific parts: the former is the hash of the `code_verifier`, and the latter indicates how that hash was computed (usually `S256` for SHA‑256). Without them, the flow would be a “plain” authorization code flow, which is much less secure for public clients.


## Implementation overview

My login route automates the process like this:

1. **Generate a PKCE verifier and challenge.**  
   A helper function (`makePkcePair()`) creates a random `code_verifier` and its `code_challenge` using SHA‑256.

2. **Send the user credentials to SchoolSoft’s password login endpoint.**  
   The route calls:
   ```
   https://sms.schoolsoft.se/YOUR_SCHOOL/rest-api/login/student/password
   ```
   with the username, password, and PKCE parameters (`code_challenge`, `client_id`, `redirect_uri`, `state`, etc.). This is the “authorization request” step.

3. **Receive an authorization code.**  
   SchoolSoft returns the `code` in the JSON response (or, in other PKCE flows, via a redirect). This code is short‑lived and one‑time‑use.

4. **Exchange the code and verifier for an access token.**  
   The backend calls:
   ```
   https://sms.schoolsoft.se/YOUR_SCHOOL/rest-api/login/token
   ```
   with:
   - `clientId`,
   - `grantType=code`,
   - the `code`,
   - and the `code_verifier`.  
   SchoolSoft verifies the PKCE proof and returns the access token (or a JSON object containing `access_token` and metadata).

5. **Use that token to authenticate against the mobile API.**  
   The backend can either:
   - proxy requests to SchoolSoft, attaching the `Authorization: Bearer <token>` header, or  
   - pass the token back to your app so it can call the mobile API directly.

   - Or, the best part, you can translate the bearer to a session cookie. This allowes intereacting with the regular API too.

This lets the app perform the login flow programmatically while still following the same authentication model as the official client. The app never sees or stores the username and password; it only receives and caches the token, which is much safer and more aligned with modern mobile auth patterns.


## Important security note

I do **not** store usernames or passwords in LocalStorage or in my own database.

That would be insecure and defeat the purpose of session- and token-based authentication. The safer approach is to keep credentials ephemeral and rely on the token returned by the authentication server. The token can be revoked or expire on the server side, limiting the risk if the app or device is ever compromised.

In AuthV2, the user’s password is used only once, during the initial exchange, and then discarded. The long‑lived part of the session is the token, not the password. This is the core idea behind PKCE and OAuth 2.0: **you prove your identity once, and then you carry a secure, limited‑lifetime token instead of the raw credentials.**