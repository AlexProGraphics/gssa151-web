import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

// Next.js 16 renamed `middleware` to `proxy` (runs on the nodejs runtime only).
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const user = getSessionUser(token);

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
