"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function LoginPage() {
  useEffect(() => {
    void signIn("keycloak", { callbackUrl: "/am" });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">HTG CRM</h1>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting to Keycloak</p>
        <Button className="mt-6 w-full" onClick={() => signIn("keycloak", { callbackUrl: "/am" })}>
          Continue
        </Button>
      </div>
    </main>
  );
}
