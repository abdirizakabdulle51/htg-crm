import {
  LayoutDashboard, Building2, TrendingUp, CheckSquare,
  Bell, Target, Globe, BarChart3, AlertTriangle,
  FileText, DollarSign, Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

export const roleNavItems: Record<string, NavItem[]> = {
  ACCOUNT_MANAGER: [
    { href: "/account-manager",               label: "Dashboard",      icon: LayoutDashboard },
    { href: "/account-manager/tenants",       label: "My Tenants",     icon: Building2 },
    { href: "/account-manager/pipeline",      label: "Pipeline",       icon: TrendingUp },
    { href: "/account-manager/tasks",         label: "Tasks",          icon: CheckSquare },
    { href: "/account-manager/alerts",        label: "Alerts",         icon: Bell },
    { href: "/account-manager/opportunities", label: "Opportunities",  icon: Target },
  ],
  COUNTRY_GM: [
    { href: "/country-manager",          label: "Dashboard",        icon: LayoutDashboard },
    { href: "/country-manager/overview", label: "Country Overview", icon: Globe },
    { href: "/country-manager/tenants",  label: "Tenants",          icon: Building2 },
    { href: "/country-manager/team",     label: "Team Performance", icon: Users },
    { href: "/country-manager/targets",  label: "Targets",          icon: Target },
    { href: "/country-manager/alerts",   label: "Alerts",           icon: Bell },
  ],
  HEAD_OF_BUSINESS: [
    { href: "/head-of-business",           label: "Dashboard",           icon: LayoutDashboard },
    { href: "/head-of-business/overview",  label: "Regional Overview",   icon: Globe },
    { href: "/head-of-business/countries", label: "Country Performance", icon: BarChart3 },
    { href: "/head-of-business/revenue",   label: "Revenue",             icon: DollarSign },
    { href: "/head-of-business/risks",     label: "Strategic Risks",     icon: AlertTriangle },
    { href: "/head-of-business/reports",   label: "Reports",             icon: FileText },
  ],
  CEO: [
    { href: "/ceo",           label: "Dashboard",           icon: LayoutDashboard },
    { href: "/executive-overview",  label: "Executive Overview",  icon: Globe },
    { href: "/ceo/countries", label: "Country Performance", icon: BarChart3 },
    { href: "/ceo/revenue",   label: "Revenue",             icon: DollarSign },
    { href: "/ceo/risks",     label: "Strategic Risks",     icon: AlertTriangle },
    { href: "/ceo/reports",   label: "Reports",             icon: FileText },
  ],
  ADMIN: [
    { href: "/ceo",           label: "Dashboard",           icon: LayoutDashboard },
    { href: "/executive-overview",  label: "Executive Overview",  icon: Globe },
    { href: "/ceo/countries", label: "Country Performance", icon: BarChart3 },
    { href: "/ceo/revenue",   label: "Revenue",             icon: DollarSign },
    { href: "/ceo/risks",     label: "Strategic Risks",     icon: AlertTriangle },
    { href: "/ceo/reports",   label: "Reports",             icon: FileText },
  ],
};
