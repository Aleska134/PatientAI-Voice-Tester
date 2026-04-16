import type { LeadRecord } from '@/types/lead';

const leadStore: LeadRecord[] = [];

export function insertLead(lead: LeadRecord): LeadRecord {
  leadStore.push(lead);
  return lead;
}

export function listLeads(): LeadRecord[] {
  return [...leadStore].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
