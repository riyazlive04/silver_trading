import { auth } from "@/auth";
import { NextResponse } from "next/server";

const SUPER_ADMIN_ONLY_PREFIXES = ["/settings/platform"];
const ADMIN_ONLY_PREFIXES = ["/settings"];
const PUBLIC_PATHS = ["/login", "/admin", "/superadmin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublic) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  if (SUPER_ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (
    ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) &&
    role !== "ADMIN" &&
    role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
