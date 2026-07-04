import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LeadForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Lead</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-2">
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Company" />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Contact" />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Estimated value" />
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Close date" />
          <Button className="md:col-span-2" type="button">
            Save Lead
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
