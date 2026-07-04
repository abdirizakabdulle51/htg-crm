import type { Service } from "@/types/crm";
import { Badge } from "@/components/ui/badge";

export function ServicesList({ services }: { services: Service[] }) {
  return (
    <div className="space-y-2">
      {services.map((service) => (
        <div className="flex items-center justify-between rounded-md border p-3 text-sm" key={service.id}>
          <span>{service.name}</span>
          <Badge variant="outline">{service.status}</Badge>
        </div>
      ))}
    </div>
  );
}
