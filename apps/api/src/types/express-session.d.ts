import "express-session";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
    user?: {
      id: string;
      fullName: string;
      email: string;
      role: "admin" | "marketer" | "viewer";
    };
  }
}
