/**
 * EmptyState Component
 * 
 * Displays helpful empty states for market pages
 */

import { SearchX, TrendingUp, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  type: 'search' | 'error' | 'no-data';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ type, title, description, action }: EmptyStateProps) {
  const icons = {
    search: SearchX,
    error: AlertCircle,
    'no-data': TrendingUp,
  };
  
  const Icon = icons[type];
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-neutral-900/50 rounded-full p-6 mb-4">
        <Icon className="w-12 h-12 text-neutral-600" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-neutral-400 text-center max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
