import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { config } from "../config.js";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
};

export function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(
      authHeader.slice("Bearer ".length),
      config.accessSecret
    ) as {
      sub: string;
      email: string;
    };

    request.user = {
      id: payload.sub,
      email: payload.email
    };

    return next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired access token" });
  }
}
