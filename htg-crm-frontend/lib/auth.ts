import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.roles = readRealmRoles(account.access_token);
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.roles = token.roles;
      return session;
    },
  },
};

function readRealmRoles(accessToken: unknown): string[] {
  if (typeof accessToken !== "string") {
    return [];
  }

  const [, payload] = accessToken.split(".");
  if (!payload) {
    return [];
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as {
      realm_access?: { roles?: unknown };
      resource_access?: Record<string, { roles?: unknown }>;
    };
    const realmRoles = decoded.realm_access?.roles;

    if (Array.isArray(realmRoles)) {
      return realmRoles.filter((role): role is string => typeof role === "string");
    }
  } catch {
    return [];
  }

  return [];
}
