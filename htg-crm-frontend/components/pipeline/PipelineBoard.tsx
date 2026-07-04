import { leads } from "@/components/dashboard/mock-data";
import { PipelineKanban } from "@/components/pipeline/PipelineKanban";

export function PipelineBoard() {
  return <PipelineKanban leads={leads} />;
}
