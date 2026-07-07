import {
  LayoutDashboard, Building2, TrendingUp, CheckSquare,
  Target, Globe, BarChart3, AlertTriangle,
  FileText, DollarSign, Users, Activity, Calendar,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const hobNavItems: NavItem[] = [
  { href: "/hob",           label: "Dashboard",          icon: LayoutDashboard },
  { href: "/hob/countries", label: "Countries",          icon: Globe },
  { href: "/hob/pipeline",  label: "Pipeline",           icon: TrendingUp },
  { href: "/hob/sectors",   label: "Sectors",            icon: BarChart3 },
  { href: "/hob/teams",     label: "Teams",              icon: Users },
  { href: "/hob/accounts",  label: "Strategic Accounts", icon: Building2 },
  { href: "/hob/approvals", label: "Approvals",          icon: CheckSquare },
  { href: "/hob/risks",     label: "Risks",              icon: AlertTriangle },
  { href: "/hob/reports",   label: "Reports",            icon: FileText },
];

const amNavItems: NavItem[] = [
  { href: "/am",               label: "Dashboard",        icon: LayoutDashboard },
  { href: "/am/customers",     label: "My Customers",     icon: Building2 },
  { href: "/am/opportunities", label: "My Opportunities", icon: TrendingUp },
  { href: "/am/tasks",         label: "My Tasks",         icon: CheckSquare },
  { href: "/am/activities",    label: "My Activities",    icon: Activity },
  { href: "/am/renewals",      label: "Renewals",         icon: Target },
  { href: "/am/calendar",      label: "Calendar",         icon: Calendar },
  { href: "/am/performance",   label: "My Performance",   icon: BarChart3 },
  { href: "/am/reports",       label: "Reports",          icon: FileText },
];

export const roleNavItems: Record<string, NavItem[]> = {
  AM: amNavItems,
  ACCOUNT_MANAGER: amNavItems,
  "Account Manager": amNavItems,
  account_manager: amNavItems,
  COUNTRY_GM: [
    { href: "/gm",           label: "Dashboard",        icon: LayoutDashboard },
    { href: "/gm/team",      label: "Team Performance", icon: Users },
    { href: "/gm/pipeline",  label: "Country Pipeline", icon: TrendingUp },
    { href: "/gm/tenants",   label: "Tenants",          icon: Building2 },
    { href: "/gm/renewals",  label: "Renewals",         icon: Target },
    { href: "/gm/approvals", label: "Approvals",        icon: CheckSquare },
    { href: "/gm/risks",     label: "Risks",            icon: AlertTriangle },
    { href: "/gm/reports",   label: "Reports",          icon: FileText },
  ],
  HOB: hobNavItems,
  HEAD_OF_BUSINESS: hobNavItems,
  head_of_business: hobNavItems,
  HoB: hobNavItems,
  "Head of Business": hobNavItems,
  CEO: [
    { href: "/ceo",           label: "Dashboard",           icon: LayoutDashboard },
    { href: "/executive-overview",  label: "Executive Overview",  icon: Globe },
    { href: "/country-performance", label: "Country Performance", icon: BarChart3 },
    { href: "/revenue",       label: "Revenue",             icon: DollarSign },
    { href: "/strategic-risks", label: "Strategic Risks",     icon: AlertTriangle },
    { href: "/reports",      label: "Reports",             icon: FileText },
  ],
  ADMIN: [
    { href: "/ceo",           label: "Dashboard",           icon: LayoutDashboard },
    { href: "/executive-overview",  label: "Executive Overview",  icon: Globe },
    { href: "/country-performance", label: "Country Performance", icon: BarChart3 },
    { href: "/revenue",       label: "Revenue",             icon: DollarSign },
    { href: "/strategic-risks", label: "Strategic Risks",     icon: AlertTriangle },
    { href: "/reports",      label: "Reports",             icon: FileText },
  ],
};
