export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";
export const customerStatusTone = (status: string): StatusTone => status === 'Active' ? 'success' : status === 'Lead' ? 'info' : 'neutral';
export const customerStatusLabel = (status: string) => ({ Active: 'Aktiv', Lead: 'Lead', Inactive: 'Inaktiv' }[status] ?? status);
export const priorityTone = (priority: string): StatusTone => priority === 'High' ? 'danger' : priority === 'Medium' ? 'warning' : 'neutral';
