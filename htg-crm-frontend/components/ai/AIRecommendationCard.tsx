import type { AIRecommendation } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoachingMessage } from "@/components/ai/CoachingMessage";

export function AIRecommendationCard({ recommendation }: { recommendation: AIRecommendation }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{recommendation.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CoachingMessage message={recommendation.message} />
      </CardContent>
    </Card>
  );
}
