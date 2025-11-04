import { RecurrenceRule } from '@/types';

export interface TaskFormState {
  id: number | null;
  customer_id: number | null;
  customer_name?: string | null;
  priority: 'High' | 'Medium' | 'Low';
  description?: string;
  completed?: boolean;
}

export interface EventFormData {
  id?: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  color_code?: string;
  event_type?: string;
  recurrence_rule?: RecurrenceRule | string | null;
}

export interface EventFormSubmitPayload {
  event: EventFormData;
  task?: TaskFormState & { customer_id: number };
}
