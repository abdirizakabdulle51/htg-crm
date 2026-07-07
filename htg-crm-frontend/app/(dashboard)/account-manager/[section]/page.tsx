import { redirect } from "next/navigation";

const sectionRedirects: Record<string, string> = {
  tenants: "/am/customers",
  pipeline: "/am/opportunities",
  opportunities: "/am/opportunities",
  tasks: "/am/tasks",
  activities: "/am/activities",
  renewals: "/am/renewals",
  calendar: "/am/calendar",
  performance: "/am/performance",
  reports: "/am/reports",
};

export default function AccountManagerSectionRedirectPage({
  params,
}: {
  params: { section: string };
}) {
  redirect(sectionRedirects[params.section] ?? "/am");
}
