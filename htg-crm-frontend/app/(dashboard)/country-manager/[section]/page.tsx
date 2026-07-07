import { redirect } from "next/navigation";

const sectionRedirects: Record<string, string> = {
  approvals: "/gm/approvals",
  alerts: "/gm/risks",
  pipeline: "/gm/pipeline",
  renewals: "/gm/renewals",
  reports: "/gm/reports",
  risks: "/gm/risks",
  team: "/gm/team",
  tenants: "/gm/tenants",
};

export default function CountryManagerSectionPage({
  params,
}: {
  params: { section: string };
}) {
  redirect(sectionRedirects[params.section] ?? "/gm");
}
