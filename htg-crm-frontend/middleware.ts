import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const routeRoles: Record<string, string[]> = {
  "/account-manager": ["ACCOUNT_MANAGER"],
  "/country-manager": ["COUNTRY_GM", "Country GM", "country_gm", "GM"],
  "/gm": ["COUNTRY_GM", "Country GM", "country_gm", "GM"],
  "/head-of-business": ["HOB", "HEAD_OF_BUSINESS", "head_of_business", "HoB", "Head of Business"],
  "/hob": ["HOB", "HEAD_OF_BUSINESS", "head_of_business", "HoB", "Head of Business"],
  "/ceo":             ["CEO", "ADMIN"],
  "/executive-overview": ["CEO", "ADMIN"],
};

const roleHomeRoute: Record<string, string> = {
  ACCOUNT_MANAGER:  "/account-manager",
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
  ADMIN:            "/ceo",
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
    "/account-manager/:path*",
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
