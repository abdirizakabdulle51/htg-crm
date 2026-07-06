"use client";

import { useParams } from "next/navigation";

import { ExecutiveOverview } from "@/components/dashboard/ExecutiveOverview";

export default function Section() {
  const { section } = useParams();

  if (section === "overview") {
    return <ExecutiveOverview />;
  }

  return (
    <div className="flex h-96 flex-col items-center justify-center text-muted-foreground">
      <p className="text-lg font-medium capitalize">{String(section).replace(/-/g, " ")}</p>
      <p className="mt-1 text-sm">This section is coming soon.</p>
    </div>
  );
}
