# AuthV2

SchoolSoft+ AuthV2 uses SchoolSoft OAuth with PKCE, verifies the resulting account, and bridges access tokens into browser sessions for the existing backend routes.

- [Complete authentication guide](backend/authentication.md): initiation, SAML, callback, token refresh, passkeys, cookie lifetimes, and mobile differences.
- [Initiate browser login](backend/routes/auth-v2-initiate.md).
- [Initiate external SAML login](backend/routes/auth-v2-initiate-external.md).
- [Callback](backend/routes/auth-v2-callback.md).
- [Refresh the current browser session](backend/routes/auth-v2-token-refresh.md).
- [Login using a refresh token](backend/routes/auth-v2-refresh-token-login.md).
- [News and attachment access](backend/schoolsoft-data.md).

Classic login does not supply the SchoolSoft access token required by modern news and attachment routes. An SSP-signed mobile JWT is also a different credential: general browser API routes still require SSP cookies. This entry point preserves the `/docs/auth-v2` link used by backend error messages.
