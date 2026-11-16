import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: "AUTHENTICATION_REQUIRED", message: "Please sign in to continue." });
    return;
  }
  next();
}
