import { AIInsightBadge } from "@/components/ai/AIInsightBadge";

export function CoachingMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <AIInsightBadge />
      <p className="mt-3 text-sm">{message}</p>
    </div>
  );
}
