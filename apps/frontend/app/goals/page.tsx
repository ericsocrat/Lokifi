'use client';

import { usePreferences } from '@/src/components/dashboard/PreferencesContext';
import { useCurrencyFormatter } from '@/src/components/dashboard/useCurrencyFormatter';
import {
  Calculator,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Edit2,
  Flag,
  GraduationCap,
  Home,
  MoreHorizontal,
  Palmtree,
  PiggyBank,
  Plane,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

// Types
interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: GoalCategory;
  priority: 'high' | 'medium' | 'low';
  monthlyContribution: number;
  color: string;
  icon: GoalCategory;
  createdAt: string;
}

type GoalCategory =
  | 'emergency'
  | 'retirement'
  | 'house'
  | 'vacation'
  | 'education'
  | 'investment'
  | 'other';

// Mock data for goals
const mockGoals: FinancialGoal[] = [
  {
    id: '1',
    name: 'Emergency Fund',
    targetAmount: 25000,
    currentAmount: 18750,
    deadline: '2026-06-01',
    category: 'emergency',
    priority: 'high',
    monthlyContribution: 500,
    color: '#10B981',
    icon: 'emergency',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Dream Home Down Payment',
    targetAmount: 100000,
    currentAmount: 45000,
    deadline: '2028-01-01',
    category: 'house',
    priority: 'high',
    monthlyContribution: 2000,
    color: '#8B5CF6',
    icon: 'house',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    name: 'Japan Trip 2026',
    targetAmount: 8000,
    currentAmount: 3200,
    deadline: '2026-09-01',
    category: 'vacation',
    priority: 'medium',
    monthlyContribution: 300,
    color: '#F59E0B',
    icon: 'vacation',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    name: 'Retirement Fund',
    targetAmount: 500000,
    currentAmount: 125000,
    deadline: '2050-01-01',
    category: 'retirement',
    priority: 'high',
    monthlyContribution: 1500,
    color: '#06B6D4',
    icon: 'retirement',
    createdAt: '2023-06-01',
  },
  {
    id: '5',
    name: 'MBA Education',
    targetAmount: 60000,
    currentAmount: 15000,
    deadline: '2027-09-01',
    category: 'education',
    priority: 'medium',
    monthlyContribution: 800,
    color: '#EC4899',
    icon: 'education',
    createdAt: '2024-04-15',
  },
];

// Icon mapping
const categoryIcons: Record<GoalCategory, React.ReactNode> = {
  emergency: <PiggyBank className="w-5 h-5" />,
  retirement: <Palmtree className="w-5 h-5" />,
  house: <Home className="w-5 h-5" />,
  vacation: <Plane className="w-5 h-5" />,
  education: <GraduationCap className="w-5 h-5" />,
  investment: <TrendingUp className="w-5 h-5" />,
  other: <Target className="w-5 h-5" />,
};

// Progress Ring Component
function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#8B5CF6',
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-3"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// Goal Card Component
function GoalCard({
  goal,
  formatCurrency,
  onEdit,
  onDelete,
}: {
  goal: FinancialGoal;
  formatCurrency: (amount: number) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const deadline = new Date(goal.deadline);
  const monthsLeft = Math.max(
    0,
    Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  );

  const priorityColors = {
    high: 'bg-rose-500/20 text-rose-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="bg-surface-1 rounded-2xl p-6 border border-surface-3 hover:border-lokifi-500/30 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
          >
            {categoryIcons[goal.category]}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-lokifi-400 transition-colors">
              {goal.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[goal.priority]}`}>
                {goal.priority}
              </span>
              <span className="text-xs text-surface-11 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {monthsLeft} months left
              </span>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
            aria-expanded={showMenu}
            aria-label="Goal options menu"
            aria-haspopup="menu"
          >
            <MoreHorizontal className="w-4 h-4 text-surface-11" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 bg-surface-2 border border-surface-3 rounded-lg shadow-xl py-1 min-w-30 z-10"
              role="menu"
            >
              <button
                onClick={() => {
                  onEdit(goal.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-surface-11 hover:bg-surface-3 flex items-center gap-2"
                role="menuitem"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete(goal.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-surface-3 flex items-center gap-2"
                role="menuitem"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="flex items-center gap-6 mb-4">
        <ProgressRing progress={progress} color={goal.color} />
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-2xl font-bold text-white">
              {formatCurrency(goal.currentAmount)}
            </span>
            <span className="text-sm text-surface-11">of {formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: goal.color }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
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
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-surface-1 rounded-2xl p-5 border border-surface-3">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
        <span className="text-sm text-surface-11">{title}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-surface-11 mt-1">{subtitle}</p>}
    </div>
  );
}

// Main Page Component
export default function GoalsPage() {
  const { currency: _currency } = usePreferences();
  const { formatCurrency } = useCurrencyFormatter();
  const [goals, setGoals] = useState<FinancialGoal[]>(mockGoals);
  const [filter, setFilter] = useState<'all' | GoalCategory>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'progress' | 'amount'>('deadline');

  // Calculate totals
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalMonthly = goals.reduce((sum, g) => sum + g.monthlyContribution, 0);
  const overallProgress = (totalSaved / totalTarget) * 100;

  // Filter and sort goals
  const filteredGoals = goals
    .filter((g) => filter === 'all' || g.category === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          return b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount;
        case 'amount':
          return b.targetAmount - a.targetAmount;
        default:
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
    });

  const handleEdit = (_id: string) => {
    // TODO: Open edit modal with id parameter
  };

  const handleDelete = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  const categories: { value: 'all' | GoalCategory; label: string }[] = [
    { value: 'all', label: 'All Goals' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'retirement', label: 'Retirement' },
    { value: 'house', label: 'House' },
    { value: 'vacation', label: 'Vacation' },
    { value: 'education', label: 'Education' },
    { value: 'investment', label: 'Investment' },
  ];

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-surface-0 via-surface-0 to-lokifi-950/20 p-6"
      role="main"
      aria-label="Financial Goals page"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-lokifi-500/20 rounded-xl">
                <Flag className="w-7 h-7 text-lokifi-400" />
              </div>
              Financial Goals
            </h1>
            <p className="text-surface-11 mt-2">Track your progress towards financial freedom</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-lokifi-500 to-electric-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-lokifi-500/20">
            <Plus className="w-5 h-5" />
            Add New Goal
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Target"
            value={formatCurrency(totalTarget)}
            icon={<Target className="w-5 h-5" />}
            color="#8B5CF6"
          />
          <SummaryCard
            title="Total Saved"
            value={formatCurrency(totalSaved)}
            icon={<Wallet className="w-5 h-5" />}
            color="#10B981"
            subtitle={`${overallProgress.toFixed(1)}% of target`}
          />
          <SummaryCard
            title="Monthly Contribution"
            value={formatCurrency(totalMonthly)}
            icon={<CircleDollarSign className="w-5 h-5" />}
            color="#06B6D4"
            subtitle="Auto-allocated"
          />
          <SummaryCard
            title="Active Goals"
            value={goals.length.toString()}
            icon={<Sparkles className="w-5 h-5" />}
            color="#F59E0B"
            subtitle={`${goals.filter((g) => g.priority === 'high').length} high priority`}
          />
        </div>

        {/* Overall Progress */}
        <div className="bg-surface-1 rounded-2xl p-6 border border-surface-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Overall Progress</h2>
              <p className="text-sm text-surface-11">
                {formatCurrency(totalTarget - totalSaved)} remaining to reach all goals
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-surface-11" />
              <span className="text-sm text-surface-11">
                Est. completion:{' '}
                {new Date(
                  Date.now() +
                    ((totalTarget - totalSaved) / totalMonthly) * 30 * 24 * 60 * 60 * 1000
                ).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="h-4 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-lokifi-500 to-electric-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-sm text-surface-11">{formatCurrency(0)}</span>
            <span className="text-sm font-medium text-lokifi-400">
              {overallProgress.toFixed(1)}%
            </span>
            <span className="text-sm text-surface-11">{formatCurrency(totalTarget)}</span>
          </div>
        </div>

        {/* Filters */}
        <div
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
          role="group"
          aria-label="Filter and sort goals"
        >
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === cat.value
                    ? 'bg-lokifi-500 text-white'
                    : 'bg-surface-2 text-surface-11 hover:bg-surface-3'
                }`}
                aria-pressed={filter === cat.value}
                aria-label={`Filter by ${cat.label}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <label htmlFor="sort-goals" className="sr-only">
            Sort goals by
          </label>
          <select
            id="sort-goals"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-lokifi-500"
            aria-label="Sort goals by"
          >
            <option value="deadline">Sort by Deadline</option>
            <option value="progress">Sort by Progress</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>

        {/* Goals Grid */}
        {filteredGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
            {filteredGoals.map((goal) => (
              <div key={goal.id} role="listitem">
                <GoalCard
                  goal={goal}
                  formatCurrency={formatCurrency}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="bg-surface-1 rounded-2xl p-12 border border-surface-3 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-surface-2 rounded-full flex items-center justify-center">
              <Target className="w-8 h-8 text-surface-11" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No goals found</h3>
            <p className="text-surface-11 mb-4">
              {filter === 'all'
                ? "You haven't set any financial goals yet"
                : `No goals in the ${filter} category`}
            </p>
            <button
              className="px-4 py-2 bg-lokifi-500 text-white rounded-lg hover:bg-lokifi-600 transition-colors"
              aria-label="Create your first financial goal"
            >
              Create Your First Goal
            </button>
          </div>
        )}

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-lokifi-500/10 to-electric-500/10 rounded-2xl p-6 border border-lokifi-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-lokifi-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-lokifi-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Goal-Setting Tips</h3>
              <ul className="space-y-2 text-sm text-surface-11">
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-lokifi-400" />
                  Start with an emergency fund covering 3-6 months of expenses
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-lokifi-400" />
                  Set realistic deadlines based on your monthly savings capacity
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-lokifi-400" />
                  Prioritize high-interest debt payoff alongside savings goals
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-lokifi-400" />
                  Review and adjust your goals quarterly
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
