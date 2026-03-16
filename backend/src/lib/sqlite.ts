import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));

export function resolveSqliteUrl() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!rawUrl.startsWith("file:")) {
    return rawUrl;
  }

  const relativePath = rawUrl.replace(/^file:/, "");
  const absolutePath = path.resolve(backendRoot, relativePath);

  return `file:${absolutePath}`;
}

export function ensureSqliteSchema() {
  const dbUrl = resolveSqliteUrl();
  const dbPath = dbUrl.replace(/^file:/, "");
  const database = new Database(dbPath);

  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN NOT NULL DEFAULT 0,
      userId TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT Task_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS RefreshToken (
      id TEXT PRIMARY KEY NOT NULL,
      tokenHash TEXT NOT NULL,
      userId TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      revokedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT RefreshToken_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS Task_userId_completed_idx ON Task (userId, completed);
    CREATE INDEX IF NOT EXISTS RefreshToken_userId_idx ON RefreshToken (userId);
  `);

  database.close();
}
