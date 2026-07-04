import type { CrmUser, Lead, UserRole } from "@/types/crm";

export function hasRole(user: CrmUser | null | undefined, role: UserRole) {
  return Boolean(user?.roles.includes(role));
}

export function canEditLead(user: CrmUser | null | undefined, lead: Lead) {
  if (!user) {
    return false;
  }

  return hasRole(user, "CEO") || hasRole(user, "HEAD_OF_BUSINESS") || lead.ownerId === user.id;
}
