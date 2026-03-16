import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import type { Response } from "express";

import { config } from "../config.js";
import { prisma } from "./prisma.js";

type AccessTokenPayload = {
  sub: string;
  email: string;
};

type RefreshTokenPayload = {
  sub: string;
  tokenId: string;
};

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, config.accessSecret, {
    expiresIn: config.accessTokenTtl as StringValue
  });
}

function signRefreshToken(payload: RefreshTokenPayload) {
  return jwt.sign(payload, config.refreshSecret, {
    expiresIn: `${config.refreshTokenTtlDays}d`
  });
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueAuthTokens(
  response: Response,
  user: { id: string; email: string }
) {
  const refreshRecord = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: "",
      expiresAt: new Date(
        Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000
      )
    }
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenId: refreshRecord.id
  });

  await prisma.refreshToken.update({
    where: { id: refreshRecord.id },
    data: {
      tokenHash: hashToken(refreshToken)
    }
  });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email
  });

  response.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: "/"
  });

  return { accessToken };
}

export function clearRefreshToken(response: Response) {
  response.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/"
  });
}

export async function revokeRefreshToken(token: string | undefined) {
  if (!token) {
    return;
  }

  try {
    const payload = jwt.verify(token, config.refreshSecret) as RefreshTokenPayload;

    await prisma.refreshToken.updateMany({
      where: {
        id: payload.tokenId,
        tokenHash: hashToken(token),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  } catch {
    return;
  }
}

export async function rotateRefreshToken(response: Response, token: string) {
  const payload = jwt.verify(token, config.refreshSecret) as RefreshTokenPayload;
  const record = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
    include: { user: true }
  });

  if (
    !record ||
    record.revokedAt ||
    record.expiresAt <= new Date() ||
    record.tokenHash !== hashToken(token)
  ) {
    throw new Error("Invalid refresh token");
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: {
      revokedAt: new Date()
    }
  });

  return issueAuthTokens(response, {
    id: record.user.id,
    email: record.user.email
  });
}
