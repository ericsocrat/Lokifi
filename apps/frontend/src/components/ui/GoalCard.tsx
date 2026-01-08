'use client';

import { cn } from '@/lib/utils/cn';
import {
  CalendarDays,
  Edit2,
  GraduationCap,
  Home,
  MoreHorizontal,
  Palmtree,
  PiggyBank,
  Plane,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { ProgressRing } from './ProgressRing';

// Types
export type GoalCategory =
  | 'emergency'
  | 'retirement'
  | 'house'
  | 'vacation'
  | 'education'
  | 'investment'
  | 'other';

export type GoalPriority = 'high' | 'medium' | 'low';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: GoalCategory;
  priority: GoalPriority;
  monthlyContribution: number;
  color: string;
  createdAt?: string;
}

interface GoalCardProps {
  /** The financial goal data */
  goal: FinancialGoal;
  /** Function to format currency values */
  formatCurrency: (amount: number) => string;
  /** Callback when edit is clicked */
  onEdit?: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when card is clicked */
  onClick?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the action menu */
  showActions?: boolean;
  /** Size variant */
  variant?: 'default' | 'compact';
}

// Icon mapping for goal categories
const categoryIcons: Record<GoalCategory, React.ReactNode> = {
  emergency: <PiggyBank className="w-5 h-5" />,
  retirement: <Palmtree className="w-5 h-5" />,
  house: <Home className="w-5 h-5" />,
  vacation: <Plane className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
  investment: <TrendingUp className="w-5 h-5" />,
  other: <Target className="w-5 h-5" />,
};

// Priority badge colors
const priorityColors: Record<GoalPriority, string> = {
  high: 'bg-rose-500/20 text-rose-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-emerald-500/20 text-emerald-400',
};

/**
 * GoalCard - A card component for displaying financial goals
 *
 * @example
 * // Basic usage
 * <GoalCard
 *   goal={myGoal}
 *   formatCurrency={(n) => `$${n.toLocaleString()}`}
 *   onEdit={(id) => console.log('Edit', id)}
 *   onDelete={(id) => console.log('Delete', id)}
 * />
 *
 * @example
 * // Compact variant
 * <GoalCard goal={myGoal} formatCurrency={format} variant="compact" />
 */
export function GoalCard({
  goal,
  formatCurrency,
  onEdit,
  onDelete,
  onClick,
  className,
  showActions = true,
  variant = 'default',
}: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Calculate derived values
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const deadline = new Date(goal.deadline);
  const monthsLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  );

  const handleEdit = useCallback(() => {
    onEdit?.(goal.id);
    setShowMenu(false);
  }, [goal.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(goal.id);
    setShowMenu(false);
  }, [goal.id, onDelete]);

  const handleCardClick = useCallback(() => {
    onClick?.(goal.id);
  }, [goal.id, onClick]);

  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'bg-surface-1 rounded-2xl border border-surface-3 hover:border-lokifi-500/30 transition-all duration-200 group',
        isCompact ? 'p-4' : 'p-6',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick ? handleCardClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleCardClick() : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-xl flex items-center justify-center',
              isCompact ? 'w-10 h-10' : 'w-12 h-12'
            )}
            style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
            aria-hidden="true"
          >
            {categoryIcons[goal.category]}
          </div>
          <div>
            <h3
              className={cn(
                'font-semibold text-white group-hover:text-lokifi-400 transition-colors',
                isCompact && 'text-sm'
              )}
            >
              {goal.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn('text-xs px-2 py-0.5 rounded-full', priorityColors[goal.priority])}
              >
                {goal.priority}
              </span>
              <span className="text-xs text-surface-11 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {monthsLeft} {monthsLeft === 1 ? 'month' : 'months'} left
              </span>
            </div>
          </div>
        </div>

        {/* Action Menu */}
        {showActions && (onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-lg hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Goal actions"
              aria-expanded={showMenu}
              aria-haspopup="menu"
            >
              <MoreHorizontal className="w-4 h-4 text-surface-11" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 bg-surface-2 border border-surface-3 rounded-lg shadow-xl py-1 min-w-30 z-10"
                role="menu"
                aria-label="Goal actions menu"
              >
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-surface-11 hover:bg-surface-3 flex items-center gap-2"
                    role="menuitem"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-surface-3 flex items-center gap-2"
                    role="menuitem"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className={cn('flex items-center gap-6', isCompact ? 'mb-3' : 'mb-4')}>
        <ProgressRing
          progress={progress}
          color={goal.color}
          size={isCompact ? 60 : 80}
          strokeWidth={isCompact ? 4 : 6}
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1 gap-2">
            <span
              className={cn('font-bold text-white truncate', isCompact ? 'text-lg' : 'text-2xl')}
            >
              {formatCurrency(goal.currentAmount)}
            </span>
            <span className="text-sm text-surface-11 whitespace-nowrap">
              of {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: goal.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      {!isCompact && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-3">
          <div>
            <p className="text-xs text-surface-11 mb-1">Monthly Contribution</p>
            <p className="text-sm font-semibold text-emerald-400">
              +{formatCurrency(goal.monthlyContribution)}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-11 mb-1">Remaining</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(remaining)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Named exports for types
export type { GoalCardProps };
export default GoalCard;

