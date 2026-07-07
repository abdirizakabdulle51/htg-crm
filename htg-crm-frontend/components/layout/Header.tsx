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
      description: "Country execution dashboard for revenue, pipeline, customers, renewals, and daily operational priorities.",
    },
    "/gm/team": {
      title: "Team Performance",
      description: "Monitor Account Manager performance, target achievement, customer assignments, and pipeline execution.",
    },
    "/gm/pipeline": {
      title: "Country Pipeline",
      description: "Manage sales opportunities, pipeline progression, and expected revenue across your country.",
    },
    "/gm/tenants": {
      title: "Country Customers",
      description: "Monitor customer health, cloud consumption, renewals, and revenue across your country.",
    },
    "/gm/renewals": {
      title: "Renewal Center",
      description: "Track upcoming contract renewals, renewal risk, and customer retention activities.",
    },
    "/gm/approvals": {
      title: "Approval Center",
      description: "Review and approve proposals, pricing requests, and commercial exceptions.",
    },
    "/gm/risks": {
      title: "Risk Center",
      description: "Monitor customer health, churn exposure, operational risks, and executive escalations.",
    },
    "/gm/reports": {
      title: "Country Reports",
      description: "Generate operational reports, revenue summaries, pipeline analytics, and customer exports.",
    },
    "/hob": {
      title: "Commercial Command Center",
      description: "Company-wide commercial performance, pipeline, country execution, and intervention intelligence.",
    },
    "/hob/countries": {
      title: "Country Portfolio",
      description: "Compare country performance, targets, health, and commercial intervention priorities.",
    },
    "/hob/pipeline": {
      title: "Commercial Pipeline",
      description: "Cross-country pipeline visibility, stage health, and commercial intervention priorities.",
    },
    "/hob/sectors": {
      title: "Sector Performance",
      description: "Commercial performance across industries, growth, and market opportunities.",
    },
    "/hob/teams": {
      title: "Commercial Teams",
      description: "Monitor Country GM execution, coaching priorities, and regional performance.",
    },
    "/hob/accounts": {
      title: "Strategic Accounts",
      description: "Company-wide strategic customers requiring executive commercial attention.",
    },
    "/hob/approvals": {
      title: "Commercial Approvals",
      description: "Review high-value proposals, discounts, and commercial exceptions.",
    },
    "/hob/risks": {
      title: "Commercial Risk Center",
      description: "Monitor commercial exposure, customer health, and country-level risks.",
    },
    "/hob/reports": {
      title: "Commercial Reports",
      description: "Commercial reporting, exports, and management summaries.",
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
