import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const routeRoles: Record<string, string[]> = {
  "/admin": ["ADMIN", "Admin", "admin", "SYSTEM_ADMIN", "System Admin", "system_admin"],
  "/account-manager": ["AM", "ACCOUNT_MANAGER", "Account Manager", "account_manager"],
  "/am": ["AM", "ACCOUNT_MANAGER", "Account Manager", "account_manager"],
  "/country-manager": ["COUNTRY_GM", "Country GM", "country_gm", "GM"],
  "/gm": ["COUNTRY_GM", "Country GM", "country_gm", "GM"],
  "/head-of-business": ["HOB", "HEAD_OF_BUSINESS", "head_of_business", "HoB", "Head of Business"],
  "/hob": ["HOB", "HEAD_OF_BUSINESS", "head_of_business", "HoB", "Head of Business"],
  "/ceo":             ["CEO", "ADMIN"],
  "/executive-overview": ["CEO", "ADMIN"],
};

const roleHomeRoute: Record<string, string> = {
  ADMIN: "/admin",
  Admin: "/admin",
  admin: "/admin",
  SYSTEM_ADMIN: "/admin",
  "System Admin": "/admin",
  system_admin: "/admin",
  AM: "/am",
  ACCOUNT_MANAGER: "/am",
  "Account Manager": "/am",
  account_manager: "/am",
  COUNTRY_GM:  "/gm",
  "Country GM": "/gm",
  country_gm: "/gm",
  GM: "/gm",
  HOB: "/hob",
  HEAD_OF_BUSINESS: "/hob",
  head_of_business: "/hob",
  HoB: "/hob",
  "Head of Business": "/hob",
  CEO:              "/ceo",
};

export default withAuth(
  function middleware(req) {
    const path        = req.nextUrl.pathname;
    const tokenRoles  = readRoles(req.nextauth.token);
    const primaryRole = tokenRoles.find((r) => r in roleHomeRoute) ?? "";

    const matchedBase = Object.keys(routeRoles).find(
      (base) => path === base || path.startsWith(base + "/")
    );

    if (matchedBase) {
      const allowed = routeRoles[matchedBase];
      if (!allowed.some((role) => tokenRoles.includes(role))) {
        if (!primaryRole) return NextResponse.next();
        return NextResponse.redirect(new URL(roleHomeRoute[primaryRole], req.url));
      }
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: { authorized: ({ token }) => Boolean(token) },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/account-manager/:path*",
    "/am/:path*",
    "/country-manager/:path*",
    "/gm/:path*",
    "/head-of-business/:path*",
    "/hob/:path*",
    "/ceo/:path*",
    "/executive-overview/:path*",
  ],
};

function readRoles(token: unknown): string[] {
  if (!token || typeof token !== "object") return [];
  const direct = (token as { roles?: unknown }).roles;
  if (Array.isArray(direct)) return direct.filter((r): r is string => typeof r === "string");
  const realm = (token as { realm_access?: { roles?: unknown } }).realm_access?.roles;
  if (Array.isArray(realm)) return realm.filter((r): r is string => typeof r === "string");
  return [];
}
