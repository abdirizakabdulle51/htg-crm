import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account does not have access to this workspace.</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/account-manager">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
