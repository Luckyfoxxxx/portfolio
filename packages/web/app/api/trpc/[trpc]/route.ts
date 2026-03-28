import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextResponse } from "next/server";
import { appRouter } from "@portfolio/core/router";
import { createContext } from "../../../../lib/trpc/server";

function handler(request: Request) {
  // CSRF defence in depth: reject cross-origin mutation requests.
  // sameSite=strict on the session cookie already blocks most CSRF vectors,
  // but an explicit origin check is belt-and-suspenders.
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin !== null && host !== null) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        // Malformed Origin header — reject it.
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext,
  });
}

export { handler as GET, handler as POST };
