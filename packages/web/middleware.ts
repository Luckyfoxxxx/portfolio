import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/auth/session.js";

// Middleware runs on Edge — no DB access here.
// We only check cookie presence; actual validation happens in each route.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

  const isAuthRoute = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  if (!sessionId && !isAuthRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (sessionId && isAuthRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
