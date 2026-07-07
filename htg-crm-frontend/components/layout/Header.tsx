"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const country =
    (session as { country?: string } | null)?.country ??
    (session as { user?: { country?: string } } | null)?.user?.country ??
    "Kenya";
  const headerCopy = {
    "/ceo": {
      title: "Executive Intelligence Center",
      description: "Real-time company performance, revenue, forecast, strategic opportunities, and executive insights.",
    },
    "/executive-overview": {
      title: "Executive Overview",
      description: "High-level performance snapshot across the HTG Clouds business.",
    },
    "/country-performance": {
      title: "Country Performance",
      description: "Compare revenue, pipeline, target achievement, and growth across all countries.",
    },
    "/revenue": {
      title: "Revenue Analytics",
      description: "Revenue composition, sector performance, customer concentration, and growth trends.",
    },
    "/strategic-risks": {
      title: "Strategic Risk Center",
      description: "Monitor customer health, churn exposure, renewal risk, and executive escalations.",
    },
    "/reports": {
      title: "Executive Reports",
      description: "Board-ready reports, executive summaries, revenue exports, and strategic business reporting.",
    },
    "/gm": {
      title: `${country} Country Workspace`,
      description: "Country execution dashboard — pipeline, customers, targets, and daily actions.",
    },
  }[pathname] ?? {
    title: "Commercial workspace",
    description: "Q3 execution dashboard",
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-5">
      <div>
        <p className="text-sm font-medium">{headerCopy.title}</p>
        <p className="text-xs text-muted-foreground">{headerCopy.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button aria-label="Notifications" size="icon" variant="ghost">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 border px-3 text-sm" variant="ghost">
              <UserCircle className="h-4 w-4" />
              {session?.user?.name ?? session?.user?.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ redirect: false }).then(() => { window.location.href = "http://localhost:8080/realms/htg-crm/protocol/openid-connect/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000&client_id=crm-frontend"; })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
