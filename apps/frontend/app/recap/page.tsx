'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';
  asset: string;
  amount: number;
  price?: number;
  date: Date;
  description: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'buy',
    asset: 'AAPL',
    amount: 500,
    price: 175.5,
    date: new Date('2026-01-07'),
    description: 'Bought 2.85 shares',
  },
  {
    id: '2',
    type: 'sell',
    asset: 'TSLA',
    amount: 1200,
    price: 248.3,
    date: new Date('2026-01-06'),
    description: 'Sold 4.83 shares',
  },
  {
    id: '3',
    type: 'dividend',
    asset: 'VTI',
    amount: 45.32,
    date: new Date('2026-01-05'),
    description: 'Quarterly dividend',
  },
  {
    id: '4',
    type: 'deposit',
    asset: 'Cash',
    amount: 2000,
    date: new Date('2026-01-04'),
    description: 'Monthly contribution',
  },
  {
    id: '5',
    type: 'buy',
    asset: 'BTC',
    amount: 850,
    price: 42350,
    date: new Date('2026-01-03'),
    description: 'Bought 0.02 BTC',
  },
];

const transactionColors: Record<
  Transaction['type'],
  { bg: string; text: string; icon: React.ReactNode }
> = {
  buy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: <ArrowDownRight className="w-4 h-4" />,
  },
  sell: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    icon: <ArrowUpRight className="w-4 h-4" />,
  },
  dividend: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    icon: <DollarSign className="w-4 h-4" />,
  },
  deposit: {
    bg: 'bg-lokifi/10',
    text: 'text-lokifi-light',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  withdrawal: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    icon: <TrendingDown className="w-4 h-4" />,
  },
};

export default function RecapPage() {
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)));
  };

  // Calculate monthly stats
  const totalBuys = transactions
    .filter((t) => t.type === 'buy')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSells = transactions
    .filter((t) => t.type === 'sell')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDividends = transactions
    .filter((t) => t.type === 'dividend')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <div className="border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-lokifi-light" />
                Activity Recap
              </h1>
              <p className="text-sm text-surface-300 mt-1">
                Review your portfolio activity and transactions
              </p>
            </div>
            <div className="flex items-center gap-2 bg-surface-100 border border-surface-300 rounded-xl p-1">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-surface-300" />
              </button>
              <span className="px-4 py-2 text-white font-medium min-w-40 text-center">
                {monthName}
              </span>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-surface-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-emerald-500/20 rounded-2xl bg-linear-to-br from-emerald-500/10 to-emerald-500/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm text-surface-300">Total Bought</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalBuys)}</p>
          </div>

          <div className="border border-rose-500/20 rounded-2xl bg-linear-to-br from-rose-500/10 to-rose-500/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-sm text-surface-300">Total Sold</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalSells)}</p>
          </div>

          <div className="border border-purple-500/20 rounded-2xl bg-linear-to-br from-purple-500/10 to-purple-500/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <DollarSign className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm text-surface-300">Dividends Received</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalDividends)}</p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-surface-300/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-surface-300" />
              Recent Activity
            </h2>
            <span className="text-sm text-surface-300">{transactions.length} transactions</span>
          </div>
          <div className="divide-y divide-surface-300/50">
            {transactions.map((tx) => {
              const style = transactionColors[tx.type];
              return (
                <div
                  key={tx.id}
                  className="p-4 hover:bg-surface-200/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center ${style.text}`}
                      >
                        {style.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{tx.asset}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text} capitalize`}
                          >
                            {tx.type}
                          </span>
                        </div>
                        <p className="text-sm text-surface-300">{tx.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${tx.type === 'sell' || tx.type === 'withdrawal' ? 'text-rose-400' : 'text-emerald-400'}`}
                      >
                        {tx.type === 'sell' || tx.type === 'withdrawal' ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-sm text-surface-300">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state */}
        {transactions.length === 0 && (
          <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-lokifi/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-lokifi-light" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Activity Yet</h3>
            <p className="text-surface-300">
              Your transaction history will appear here once you start trading.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

