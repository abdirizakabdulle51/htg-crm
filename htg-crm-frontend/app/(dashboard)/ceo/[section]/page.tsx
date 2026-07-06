"use client";
import { useParams } from "next/navigation";
export default function Section() {
  const { section } = useParams();
  return (
    <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
      <p className="text-lg font-medium capitalize">{String(section).replace(/-/g, " ")}</p>
      <p className="text-sm mt-1">This section is coming soon.</p>
    </div>
  );
}
