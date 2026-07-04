import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teamPerformance } from "@/components/dashboard/mock-data";
import { cn, formatDate, formatPercent, formatUSD } from "@/lib/utils";
import type { PipelineOwnerBreakdown, TeamTarget } from "@/types/crm";

type TeamPerformanceTableProps = {
  team?: TeamTarget[] | null;
  owners?: PipelineOwnerBreakdown[] | null;
  selectedSector?: string | null;
};

function healthFor(gap: number, target: number): "RED" | "YELLOW" | "GREEN" {
  if (target <= 0) return "YELLOW";
  const pct = (gap / target) * 100;
  if (pct >= 5) return "GREEN";
  if (pct >= -10) return "YELLOW";
  return "RED";
}

function healthClass(health: "RED" | "YELLOW" | "GREEN") {
  if (health === "GREEN") return "bg-green-500 text-white";
  if (health === "YELLOW") return "bg-yellow-500 text-white";
  return "bg-red-500 text-white";
}

export function TeamPerformanceTable({ team, owners, selectedSector }: TeamPerformanceTableProps) {
  if (!team) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{formatUSD(member.revenueUsd)}</TableCell>
                  <TableCell>{formatUSD(member.pipelineUsd)}</TableCell>
                  <TableCell>{formatPercent(member.targetAttainment)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  const ownerMap = new Map((owners ?? []).map((owner) => [owner.user_id, owner]));
  const rows = team
    .map((member) => {
      const target = member.quarterly_target_usd ?? member.annual_target_usd / 4;
      const gap = member.gap_usd ?? member.achieved_usd - target;
      const owner = ownerMap.get(member.user_id);

      return {
        ...member,
        displayTarget: target,
        displayGap: gap,
        displayHealth: member.health ?? owner?.health ?? healthFor(gap, target),
        pipelineValue: member.pipeline_value_usd ?? owner?.value ?? 0,
      };
    })
    .sort((a, b) => a.displayGap - b.displayGap);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Team Performance</CardTitle>
        {selectedSector ? <Badge variant="secondary">{selectedSector}</Badge> : null}
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>AM Name</TableHead>
              <TableHead className="text-right">Q Target</TableHead>
              <TableHead className="text-right">Achieved</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="text-right">Pipeline Value</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((member) => (
              <TableRow key={member.user_id}>
                <TableCell>
                  <Link className="font-medium hover:underline" href={`/account-manager/${member.user_id}/dashboard`}>
                    {member.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right">{formatUSD(member.displayTarget)}</TableCell>
                <TableCell className="text-right">{formatUSD(member.achieved_usd)}</TableCell>
                <TableCell className={cn("text-right font-medium", member.displayGap < 0 ? "text-red-600" : "text-green-600")}>
                  {formatUSD(member.displayGap)}
                </TableCell>
                <TableCell>
                  <Badge className={healthClass(member.displayHealth)}>{member.displayHealth}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatUSD(member.pipelineValue)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {member.last_activity_at ? formatDate(member.last_activity_at) : "No activity"}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/account-manager/${member.user_id}/dashboard`}>View Details</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
