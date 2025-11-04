import React from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface QuickActionsProps {
  onSelectAction: (query: string) => void;
}

const quickActions = [
  { label: 'How\'s my trading?', query: 'How is my trading performance overall?' },
  { label: 'Risk management?', query: 'How is my risk management based on my recent trades?' },
  { label: 'Am I gambling?', query: 'Am I showing any signs of gambling in my trading?' },
  { label: 'Trading patterns?', query: 'What are my most prominent trading patterns?' },
  { label: 'Strategy advice?', query: 'Can you give me some advice on my trading strategy?' },
];

export const QuickActions: React.FC<QuickActionsProps> = React.memo(({ onSelectAction }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-2 flex flex-wrap gap-2 justify-center" role="toolbar" aria-label="Quick action buttons">
      {quickActions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelectAction(action.query)}
          className="text-xs text-gray-300 hover:text-white border-gray-700 hover:bg-gray-800"
          aria-label={`Quick action: ${action.label}`}
        >
          <Lightbulb className="w-3 h-3 mr-1" /> {action.label}
        </Button>
      ))}
    </div>
  );
});

QuickActions.displayName = "QuickActions";
