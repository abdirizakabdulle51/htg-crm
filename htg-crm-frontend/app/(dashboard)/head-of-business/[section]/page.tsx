import { redirect } from "next/navigation";

const sectionRedirects: Record<string, string> = {
  accounts: "/hob/accounts",
  approvals: "/hob/approvals",
  countries: "/hob/countries",
  pipeline: "/hob/pipeline",
  reports: "/hob/reports",
  risks: "/hob/risks",
  sectors: "/hob/sectors",
  teams: "/hob/teams",
};

export default function HeadOfBusinessSectionPage({
  params,
}: {
  params: { section: string };
}) {
  redirect(sectionRedirects[params.section] ?? "/hob");
}
