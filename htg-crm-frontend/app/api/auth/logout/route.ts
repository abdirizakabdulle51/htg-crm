import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "crm-frontend";
  const appBaseUrl = process.env.NEXTAUTH_URL ?? request.url;
  const postLogoutUrl = new URL("/", appBaseUrl).toString();

  if (!issuer) {
    return NextResponse.redirect(postLogoutUrl);
  }

  const logoutUrl = new URL(`${issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutUrl);
  logoutUrl.searchParams.set("client_id", clientId);

  return NextResponse.redirect(logoutUrl);
}
