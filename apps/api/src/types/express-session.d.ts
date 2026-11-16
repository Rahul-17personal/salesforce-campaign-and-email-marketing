declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    pkceVerifier?: string;
    csrfToken?: string;
    salesforceConnection?: {
      userId: string;
      orgId: string;
      username: string;
      displayName: string;
      email?: string;
      instanceUrl: string;
      encryptedAccessToken: string;
      encryptedRefreshToken?: string;
      connectedAt: string;
    };
  }
}
