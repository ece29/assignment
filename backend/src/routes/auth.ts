import bcrypt from "bcrypt";
import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import {
  clearRefreshToken,
  issueAuthTokens,
  revokeRefreshToken,
  rotateRefreshToken
} from "../lib/tokens.js";
import { asyncHandler } from "../utils/async-handler.js";
import { serializeUser } from "../utils/serializers.js";
import { loginSchema, registerSchema } from "../validators/auth.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (request, response) => {
    const { name, email, password } = registerSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return response.status(400).json({ message: "Email already registered" });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10)
      }
    });

    const tokens = await issueAuthTokens(response, user);

    return response.status(201).json({
      message: "Registration successful",
      user: serializeUser(user),
      ...tokens
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (request, response) => {
    const { email, password } = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return response.status(401).json({ message: "Invalid email or password" });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);

    if (!matches) {
      return response.status(401).json({ message: "Invalid email or password" });
    }

    const tokens = await issueAuthTokens(response, user);

    return response.json({
      message: "Login successful",
      user: serializeUser(user),
      ...tokens
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (request, response) => {
    const refreshToken = request.cookies.refreshToken as string | undefined;

    if (!refreshToken) {
      return response.status(401).json({ message: "Refresh token missing" });
    }

    try {
      const tokens = await rotateRefreshToken(response, refreshToken);
      return response.json({
        message: "Token refreshed",
        ...tokens
      });
    } catch {
      clearRefreshToken(response);
      return response.status(401).json({ message: "Invalid refresh token" });
    }
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (request, response) => {
    await revokeRefreshToken(request.cookies.refreshToken as string | undefined);
    clearRefreshToken(response);

    return response.json({ message: "Logout successful" });
  })
);
