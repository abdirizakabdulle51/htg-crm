"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleNavItems } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const roles = (session as any)?.roles as string[] | undefined;
  const role  = roles?.[0] ?? "";
  const items = roleNavItems[role] ?? [];

  return (
    <aside className="hidden w-64 border-r bg-card md:block">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <LayoutDashboard className="h-5 w-5" />
        <span className="text-sm font-semibold">HTG CRM</span>
      </div>
      <nav className="space-y-1 p-3">
        {items.map((item) => {
          const Icon   = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                active && "bg-accent text-accent-foreground font-medium",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        {items.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Loading navigation…
          </p>
        )}
      </nav>
    </aside>
  );
}