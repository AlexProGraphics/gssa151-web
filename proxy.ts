import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, findAdminByScouterId, getSessionUser } from "@/lib/auth";

// Next.js 16 renamed `middleware` to `proxy` (runs on the nodejs runtime only).
// Es solo una segunda barrera (defensa en profundidad) — cada página de
// /admin ya se protege a sí misma con getCurrentAdmin()/redirect(); "admin"
// no es una sesión aparte, es el mismo login de scouter con este permiso
// extra comprobado vía admin_users.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const user = await getSessionUser(token);
    const admin = user ? await findAdminByScouterId(user.scouterId) : null;

    if (!admin) {
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
