import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { users } from "@portfolio/db";
import { checkRateLimit, resetRateLimit } from "../../../../lib/auth/rate-limit.js";
import {
  createSession,
  setSessionCookie,
} from "../../../../lib/auth/session.js";
import { db } from "../../../../lib/db/index.js";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>)["username"] !== "string" ||
    typeof (body as Record<string, unknown>)["password"] !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { username, password } = body as { username: string; password: string };

  const userResults = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = userResults[0];

  // Always verify to prevent timing attacks, even if user not found
  const dummyHash =
    "$argon2id$v=19$m=65536,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const isValid = user
    ? await verify(user.passwordHash, password)
    : await verify(dummyHash, password).catch(() => false);

  if (!user || !isValid) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  resetRateLimit(ip);
  const session = await createSession(user.id);
  await setSessionCookie(session.id, session.expiresAt);

  return NextResponse.json({ success: true });
}
