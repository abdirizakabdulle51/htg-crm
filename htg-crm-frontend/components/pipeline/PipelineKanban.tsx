import { PIPELINE_STAGES } from "@/lib/constants";
import type { Lead } from "@/types/crm";
import { LeadCard } from "@/components/pipeline/LeadCard";

export function PipelineKanban({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {PIPELINE_STAGES.map((stage) => (
        <section className="min-h-48 rounded-lg border bg-muted/30 p-3" key={stage}>
          <h3 className="mb-3 text-sm font-semibold capitalize">{stage}</h3>
          <div className="space-y-3">
            {leads
              .filter((lead) => lead.stage === stage)
              .map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
