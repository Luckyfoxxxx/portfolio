import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  deleteSession,
} from "../../../../lib/auth/session";

export async function POST(request: NextRequest) {
  // CSRF: reject cross-origin POSTs.
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
