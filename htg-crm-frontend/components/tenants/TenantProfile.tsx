import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenants } from "@/components/dashboard/mock-data";
import { ServicesList } from "@/components/tenants/ServicesList";
import { UsageChart } from "@/components/tenants/UsageChart";

export function TenantProfile() {
  const tenant = tenants[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tenant.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        <UsageChart />
        <ServicesList services={tenant.services ?? []} />
      </CardContent>
    </Card>
  );
}
