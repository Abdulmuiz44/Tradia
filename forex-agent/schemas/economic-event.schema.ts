/**
 * Draft schema artifact for economic_events.
 */

export type EventImpact = 'low' | 'medium' | 'high';

export type EconomicEvent = {
  id: string;
  providerEventId?: string;
  title: string;
  country: string;
  currency: string;
  impact: EventImpact;
  scheduledAt: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  eventType: string;
  isAllDay: boolean;
  createdAt: string;
  updatedAt: string;
};

export const validateEconomicEventDraft = (event: EconomicEvent): string[] => {
  const errors: string[] = [];
  if (!event.title.trim()) errors.push('title is required');
  if (!/^[A-Z]{3}$/.test(event.currency)) errors.push('currency must be 3 uppercase letters');
  if (!event.scheduledAt) errors.push('scheduledAt is required');
  return errors;
};
