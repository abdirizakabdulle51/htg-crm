import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "crm-frontend";

  if (!issuer) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const logoutUrl = new URL(`${issuer.replace(/\/$/, "")}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("post_logout_redirect_uri", new URL("/", request.url).toString());
  logoutUrl.searchParams.set("client_id", clientId);

  return NextResponse.redirect(logoutUrl);
}
