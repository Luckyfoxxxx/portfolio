import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  deleteSession,
} from "../../../../lib/auth/session.js";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
