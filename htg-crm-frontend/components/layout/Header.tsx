"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { countryNameByID } from "@/lib/countries";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type ApiEnvelope<T> = {
  data?: T | null;
};

type UserProfile = {
  country_office_id?: string;
};

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [gmCountry, setGmCountry] = useState("");
  const gmWorkspaceTitle = gmCountry ? `${gmCountry} Country Workspace` : "Country Workspace";

  useEffect(() => {
    if (!pathname?.startsWith("/gm")) return;
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    let cancelled = false;
    async function loadCountry() {
      try {
        const response = await fetch(`${API}/api/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!response.ok) throw new Error("Unable to load profile");
        const body = (await response.json()) as ApiEnvelope<UserProfile> | UserProfile;
        const profile = body && typeof body === "object" && "data" in body ? (body as ApiEnvelope<UserProfile>).data : (body as UserProfile);
        if (!cancelled) setGmCountry(countryNameByID(profile?.country_office_id));
      } catch {
        if (!cancelled) setGmCountry("");
      }
    }

    void loadCountry();
    return () => {
      cancelled = true;
    };
  }, [pathname, session, status]);

  const headerCopy = {
    "/admin": {
      title: "System Administration",
      description: "Manage users, roles, permissions, configuration, integrations, and system governance.",
    },
    "/admin/users": {
      title: "Users",
      description: "Manage CRM users, access, roles, countries, and account status.",
    },
    "/admin/roles": {
      title: "Roles & Permissions",
      description: "Manage CRM roles, workspace permissions, access levels, and governance.",
    },
    "/admin/countries": {
      title: "Countries",
      description: "Configure country offices, regional structure, GM ownership, and administrative readiness.",
    },
    "/admin/assignments": {
      title: "Assignments",
      description: "Manage customer ownership, GM assignments, and Account Manager allocation.",
    },
    "/admin/targets": {
      title: "Targets",
      description: "Configure company, country, GM, and Account Manager performance targets.",
    },
    "/admin/data": {
      title: "Data Management",
      description: "Monitor CRM data quality, imports, duplicates, synchronization, and integrity.",
    },
    "/admin/approvals": {
      title: "Approvals Configuration",
      description: "Configure approval rules, thresholds, commercial workflows, and governance.",
    },
    "/admin/integrations": {
      title: "Integrations",
      description: "Monitor external services, authentication, messaging, storage, and platform connectivity.",
    },
    "/admin/audit": {
      title: "Audit Logs",
      description: "Review user activity, system events, configuration history, and security auditing.",
    },
    "/admin/settings": {
      title: "Settings",
      description: "Configure CRM behavior, defaults, notifications, and global system preferences.",
    },
    "/admin/reports": {
      title: "Reports",
      description: "Generate administrative reports, configuration exports, audit summaries, and system analytics.",
    },
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
      title: gmWorkspaceTitle,
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
    "/am": {
      title: "Sales Workspace",
      description: "Today's priorities, customer relationships, opportunities, and revenue progress.",
    },
    "/am/customers": {
      title: "My Customers",
      description: "Manage assigned customers, health, renewals, risks, and relationship priorities.",
    },
    "/am/opportunities": {
      title: "My Opportunities",
      description: "Manage personal pipeline, opportunity stages, forecast, and next sales actions.",
    },
    "/am/tasks": {
      title: "My Tasks",
      description: "Manage daily sales activities, follow-ups, renewals, and customer commitments.",
    },
    "/am/activities": {
      title: "My Activities",
      description: "Track customer interactions, meeting outcomes, follow-ups, and relationship history.",
    },
    "/am/renewals": {
      title: "Renewals",
      description: "Manage upcoming renewals, customer retention plans, and recurring revenue.",
    },
    "/am/calendar": {
      title: "Calendar",
      description: "Manage customer meetings, renewals, follow-ups, and daily schedule.",
    },
    "/am/performance": {
      title: "My Performance",
      description: "Track personal sales performance, targets, pipeline, and achievement.",
    },
    "/am/reports": {
      title: "Reports",
      description: "Generate personal sales reports, customer exports, opportunity summaries, and activity reports.",
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
