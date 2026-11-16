# Salesforce External Client App – Phase 2 setup

This application uses the **OAuth 2.0 Web Server (Authorization Code) flow with PKCE**. Each person signs in as their own Salesforce user. The backend exchanges the authorization code and stores encrypted tokens server-side; browser JavaScript never receives Salesforce tokens.

## 1. Create an External Client App

In the Salesforce org:

1. Open **Setup → External Client App Manager**.
2. Choose **New External Client App**.
3. Enter an app name, API name and contact email.
4. In **API (Enable OAuth Settings)**, enable OAuth.
5. Add this exact callback URL for local development:

   `http://localhost:5173/api/auth/salesforce/callback`

6. Add the minimum scopes:
   - **Manage user data via APIs** (`api`)
   - **Access the identity URL service** (`id`), if shown as a separate scope
   - **Perform requests at any time** (`refresh_token, offline_access`)

7. Enable the **Web Server Flow**.
8. Require **PKCE** for supported authorization flows.
9. Because this app has a confidential backend, enable **Require Secret for Web Server Flow** and **Require Secret for Refresh Token Flow** where those options are available.
10. Configure permitted users and user/permission-set access according to your company policy. For a pilot, restrict access to approved users.
11. Save the app. Open its OAuth settings and retrieve the **Consumer Key** and **Consumer Secret**.

Salesforce recommends the web-server flow with PKCE and requires the redirect URI to exactly match an app callback URL. Do not use the username-password or user-agent flow.

## 2. Configure the local environment

From the repository root:

```powershell
Copy-Item .env.example .env
```

Generate two independent secrets in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the first output in `SESSION_SECRET` and the second in `TOKEN_ENCRYPTION_KEY_HEX`.

Then set these values in `.env`:

```dotenv
WEB_ORIGIN=http://localhost:5173
SF_LOGIN_URL=https://login.salesforce.com
SF_CLIENT_ID=PASTE_CONSUMER_KEY_HERE
SF_CLIENT_SECRET=PASTE_CONSUMER_SECRET_HERE
SF_REDIRECT_URI=http://localhost:5173/api/auth/salesforce/callback
SF_SCOPES=api id refresh_token
```

For a Salesforce sandbox, use `SF_LOGIN_URL=https://test.salesforce.com`. A supported My Domain HTTPS URL can also be used.

**Do not paste credentials into chat, source code, screenshots, or GitHub.** The real `.env` is ignored by Git.

## 3. Start the application and test

1. Stop the running dev process with `Ctrl+C`.
2. From the repository root, run `npm.cmd install` to install the Phase 2 backend packages.
3. Run `npm.cmd run dev`.
4. Open **http://localhost:5173** (use localhost, not 127.0.0.1, so the browser session cookie and OAuth callback share the same host).
5. The dashboard should show **Connect Salesforce** when server OAuth settings are complete.
6. Click it, sign in to the intended Salesforce org, approve access, and return to the dashboard.
7. Confirm that the Salesforce display name and username are shown.
8. Test **Sign out** and confirm that the dashboard returns to the disconnected state.

## 4. API endpoints added

- `GET /auth/status` – reports whether OAuth is configured and whether the current browser session is authenticated; returns a CSRF token.
- `GET /auth/salesforce` – creates OAuth state and PKCE verifier, saves them server-side and redirects to Salesforce.
- `GET /auth/salesforce/callback` – validates state, exchanges the code, verifies the Salesforce identity URL and rotates the local session ID.
- `POST /auth/logout` – validates Origin and CSRF token, attempts to revoke the refresh/access token, and destroys the local session.

The Vite development proxy exposes these under `/api`.

## 5. Session and token storage

- Local development uses Express's in-memory session store; a backend restart signs users out.
- Salesforce access and refresh tokens are encrypted with AES-256-GCM before being placed in the server-side session.
- Production requires Redis-backed sessions, HTTPS, a strong session secret, and a separate 32-byte token-encryption key. Use AWS Secrets Manager/KMS-backed operations for production key management.
- Session lifetime is currently eight hours. Salesforce refresh-token validity remains governed by the Salesforce External Client App policy and org settings.

## Troubleshooting

- `OAUTH_NOT_CONFIGURED`: verify client ID, client secret, session secret and token encryption key are present in the API's `.env`.
- `redirect_uri_mismatch`: the callback URL in Salesforce and `SF_REDIRECT_URI` must match exactly.
- `invalid_client`: verify the Consumer Key/Secret and that the Web Server Flow requires the secret as configured.
- PKCE error: verify PKCE is enabled in the External Client App and do not remove `code_challenge` / `code_verifier`.
- State validation failure: start login in one browser tab and complete the callback in the same browser; do not mix `localhost` and `127.0.0.1`.
- A Salesforce login can succeed while CRM operations remain unavailable until the next phase implements scoped REST API calls and authorization checks.

## Important design distinction

OAuth Client Credentials is for server-to-server access using a configured integration user. It does not create an individual interactive Salesforce user session. This portal's user-login requirement therefore uses the Web Server Authorization Code flow with PKCE. A separate least-privilege integration identity can be evaluated later for approved background jobs only.
