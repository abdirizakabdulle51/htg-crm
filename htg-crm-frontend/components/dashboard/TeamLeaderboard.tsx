import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { achievementPercent, healthFromAchievement, quarterlyTarget } from "@/components/dashboard/executive-utils";
import { cn, formatUSD } from "@/lib/utils";
import type { PipelineCountryBreakdown, TeamTarget } from "@/types/crm";

type TeamLeaderboardProps = {
  team?: TeamTarget[] | null;
  countries?: PipelineCountryBreakdown[] | null;
};

function medalClass(rank: number) {
  if (rank === 1) return "bg-yellow-100 text-yellow-800";
  if (rank === 2) return "bg-slate-200 text-slate-800";
  if (rank === 3) return "bg-orange-100 text-orange-800";
  return "bg-muted text-muted-foreground";
}

function healthClass(health: "RED" | "YELLOW" | "GREEN") {
  if (health === "GREEN") return "bg-green-500 text-white";
  if (health === "YELLOW") return "bg-yellow-500 text-white";
  return "bg-red-500 text-white";
}

export function TeamLeaderboard({ team, countries }: TeamLeaderboardProps) {
  const countryMap = new Map((countries ?? []).map((country) => [country.country_id, country.country]));
  const rows = (team ?? [])
    .map((member) => {
      const target = quarterlyTarget(member);
      const pct = achievementPercent(member.achieved_usd, target);
      return {
        ...member,
        target,
        pct,
        health: member.health ?? healthFromAchievement(pct),
      };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Team Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-auto">
        {!team ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-10 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Rank</th>
                <th className="py-2 text-left font-medium">AM</th>
                <th className="py-2 text-left font-medium">Country</th>
                <th className="py-2 text-right font-medium">Achieved</th>
                <th className="py-2 text-right font-medium">Target</th>
                <th className="py-2 text-left font-medium">Health</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member, index) => {
                const rank = index + 1;
                const bottom = rank > Math.max(rows.length - 2, 3) && member.pct < 80;
                return (
                  <tr className={cn("border-b last:border-0", bottom ? "bg-red-50" : "")} key={member.user_id}>
                    <td className="py-2">
                      <Badge className={medalClass(rank)}>{rank}</Badge>
                    </td>
                    <td className="py-2">
                      <Link className="font-medium hover:underline" href={`/account-manager/${member.user_id}/dashboard`}>
                        {member.name}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {member.country ?? countryMap.get(member.country_office_id) ?? member.country_office_id.slice(0, 8)}
                    </td>
                    <td className="py-2 text-right">{formatUSD(member.achieved_usd)}</td>
                    <td className="py-2 text-right">{formatUSD(member.target)}</td>
                    <td className="py-2">
                      <Badge className={healthClass(member.health)}>{member.health}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No team data</div>
        )}
      </CardContent>
    </Card>
  );
}
