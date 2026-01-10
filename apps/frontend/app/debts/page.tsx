'use client';

import {
  AlertTriangle,
  Building2,
  Car,
  CreditCard,
  GraduationCap,
  Home,
  Plus,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

interface Debt {
  id: string;
  name: string;
  type: 'mortgage' | 'car' | 'student' | 'credit-card' | 'personal' | 'other';
  balance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate: number; // Day of month
}

const mockDebts: Debt[] = [
  {
    id: '1',
    name: 'Home Mortgage',
    type: 'mortgage',
    balance: 285000,
    interestRate: 4.5,
    minimumPayment: 1850,
    dueDate: 15,
  },
  {
    id: '2',
    name: 'Car Loan - Tesla',
    type: 'car',
    balance: 32500,
    interestRate: 5.9,
    minimumPayment: 650,
    dueDate: 1,
  },
  {
    id: '3',
    name: 'Student Loan',
    type: 'student',
    balance: 18200,
    interestRate: 3.2,
    minimumPayment: 280,
    dueDate: 25,
  },
  {
    id: '4',
    name: 'Credit Card - Chase',
    type: 'credit-card',
    balance: 4800,
    interestRate: 19.99,
    minimumPayment: 150,
    dueDate: 20,
  },
];

const debtTypeIcons: Record<Debt['type'], React.ReactNode> = {
  mortgage: <Home className="w-5 h-5" />,
  car: <Car className="w-5 h-5" />,
  student: <GraduationCap className="w-5 h-5" />,
  'credit-card': <CreditCard className="w-5 h-5" />,
  personal: <Wallet className="w-5 h-5" />,
  other: <Building2 className="w-5 h-5" />,
};

const debtTypeColors: Record<Debt['type'], string> = {
  mortgage: 'from-blue-500 to-blue-600',
  car: 'from-emerald-500 to-emerald-600',
  student: 'from-purple-500 to-purple-600',
  'credit-card': 'from-rose-500 to-rose-600',
  personal: 'from-amber-500 to-amber-600',
  other: 'from-surface-200 to-surface-300',
};

export default function DebtsPage() {
  const [debts] = useState<Debt[]>(mockDebts);

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMonthlyPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const highestInterest = Math.max(...debts.map((d) => d.interestRate));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <main role="main" aria-label="Debts page" className="min-h-screen bg-surface-0">
      {/* Header */}
      <div className="border-b border-surface-300/50 bg-surface-50/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-rose-400" />
                Debts & Liabilities
              </h1>
              <p className="text-sm text-surface-300 mt-1">
                Track and manage your outstanding debts
              </p>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-lokifi to-electric hover:from-lokifi-dark hover:to-electric/90 rounded-xl text-white font-medium transition-all duration-200 shadow-lg shadow-lokifi/30"
              aria-label="Add a new debt to track"
            >
              <Plus className="w-4 h-4" />
              Add Debt
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Debt */}
          <div className="border border-rose-500/20 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <TrendingDown className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <p className="text-sm text-surface-300 mb-1">Total Debt</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalDebt)}</p>
          </div>

          {/* Monthly Payments */}
          <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-lokifi/10 rounded-xl">
                <Wallet className="w-5 h-5 text-lokifi-light" />
              </div>
            </div>
            <p className="text-sm text-surface-300 mb-1">Monthly Payments</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalMonthlyPayments)}</p>
          </div>

          {/* Highest Interest */}
          <div className="border border-amber-500/20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-sm text-surface-300 mb-1">Highest Interest Rate</p>
            <p className="text-3xl font-bold text-white">{highestInterest.toFixed(2)}%</p>
          </div>
        </div>

        {/* Debts List */}
        <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-surface-300/50">
            <h2 className="text-lg font-semibold text-white">Your Debts</h2>
          </div>
          <div className="divide-y divide-surface-300/50">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="p-6 hover:bg-surface-200/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${debtTypeColors[debt.type]} flex items-center justify-center text-white shadow-lg`}
                    >
                      {debtTypeIcons[debt.type]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{debt.name}</h3>
                      <p className="text-sm text-surface-300">
                        {debt.interestRate}% APR · Due on {debt.dueDate}
                        {['st', 'nd', 'rd'][debt.dueDate - 1] || 'th'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{formatCurrency(debt.balance)}</p>
                    <p className="text-sm text-surface-300">
                      Min: {formatCurrency(debt.minimumPayment)}/mo
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty state if no debts */}
        {debts.length === 0 && (
          <div className="border border-surface-300/50 rounded-2xl bg-surface-100/50 backdrop-blur-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Debts Recorded</h3>
            <p className="text-surface-300 mb-6">
              Great job! You don&apos;t have any debts tracked yet.
            </p>
            <button
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lokifi to-electric rounded-xl text-white font-medium"
              aria-label="Add your first debt to start tracking"
            >
              <Plus className="w-4 h-4" />
              Add Your First Debt
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
