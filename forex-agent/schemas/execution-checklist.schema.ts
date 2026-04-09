/**
 * Draft schema artifact for execution_checklists.
 */

export type AccountType = 'personal' | 'prop' | 'funded';

export type ChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  category: 'risk' | 'setup' | 'event' | 'discipline';
};

export type ExecutionChecklist = {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  items: ChecklistItem[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export const validateExecutionChecklistDraft = (checklist: ExecutionChecklist): string[] => {
  const errors: string[] = [];
  if (!checklist.name.trim()) errors.push('name is required');
  if (checklist.items.length === 0) errors.push('at least one checklist item is required');
  if (checklist.items.some((item) => !item.label.trim())) errors.push('all checklist items need labels');
  return errors;
};
