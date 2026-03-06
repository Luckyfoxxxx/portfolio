import { randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { sessions, users } from "@portfolio/db";
import type { Session, User } from "@portfolio/db";
import { db } from "../db/index.js";

export const SESSION_COOKIE = "portfolio_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<Session> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const result = await db
    .insert(sessions)
    .values({ id, userId, expiresAt })
    .returning();

  return result[0]!;
}

export async function validateSession(
  sessionId: string
): Promise<{ user: User; session: Session } | null> {
  const result = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  return result[0] ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// In Next.js 15 Route Handlers, cookies() must be awaited
export async function setSessionCookie(sessionId: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

export async function getSession(): Promise<{
  user: User;
  session: Session;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return validateSession(sessionId);
}
