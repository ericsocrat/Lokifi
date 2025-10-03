'use client';

import { Card } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BankOption {
  id: string;
  name: string;
  location: string;
  logo?: string;
}

interface BankConnectionModal {
  show: boolean;
  type: 'disclaimer' | 'connecting' | null;
  selectedBank: BankOption | null;
}

export default function BanksAndBrokeragesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [modal, setModal] = useState<BankConnectionModal>({
    show: false,
    type: null,
    selectedBank: null,
  });

  // Sample banks data - in production, this would come from an API
  const allBanks: BankOption[] = [
    { id: 'boc', name: 'Bank of Cyprus', location: 'Cyprus • Salt Edge' },
    { id: 'paypal', name: 'PayPal', location: 'Cyprus • Salt Edge' },
    { id: 'curve', name: 'Curve', location: 'Cyprus • Salt Edge' },
    { id: 'revolut', name: 'Revolut', location: 'Cyprus • Salt Edge' },
    { id: 'juni', name: 'Juni', location: 'Cyprus • Salt Edge' },
    { id: 'argentex', name: 'Argentex', location: 'Cyprus • Salt Edge' },
  ];

  const filteredBanks = searchQuery
    ? allBanks.filter(
        (bank) =>
          bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bank.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowResults(value.length > 0);
  };

  const handleBankSelect = (bank: BankOption) => {
    setModal({
      show: true,
      type: 'disclaimer',
      selectedBank: bank,
    });
    setShowResults(false);
  };

  const handleUnderstand = () => {
    // Show connecting modal
    setModal({
      ...modal,
      type: 'connecting',
    });

    // Simulate opening SaltEdge connection
    // In production, this would be a real OAuth flow
    setTimeout(() => {
      // Open SaltEdge in new window/tab
      window.open(
        'https://www.saltedge.com/connect/f2e5c4f40082f2f90f88a41f0134ecdf8e6607bd0692d01d934adeff3a9d2c22/kyc_simplified',
        '_blank',
        'width=800,height=600'
      );
    }, 500);
  };

  const handleCloseModal = () => {
    // Save connecting bank to localStorage
    if (modal.selectedBank) {
      const connectingBanks = JSON.parse(localStorage.getItem('connectingBanks') || '[]');

      // Add new connecting bank
      const newBank = {
        id: modal.selectedBank.id,
        name: modal.selectedBank.name,
        status: 'connecting',
        message: 'Connecting... Please keep an eye on the connection tab',
        value: Math.floor(Math.random() * 100000), // Random starting value for animation
      };

      // Check if bank already exists
      const existingIndex = connectingBanks.findIndex((b: any) => b.id === newBank.id);
      if (existingIndex === -1) {
        connectingBanks.push(newBank);
        localStorage.setItem('connectingBanks', JSON.stringify(connectingBanks));
      }
    }

    setModal({
      show: false,
      type: null,
      selectedBank: null,
    });

    // Redirect to Assets page to show connecting bank
    router.push('/dashboard/assets');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <Card className="w-full max-w-md bg-white shadow-lg rounded-2xl border border-gray-200 p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Banks & Brokerages</h1>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search for banks and investment apps"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results Dropdown */}
        {showResults && filteredBanks.length > 0 && (
          <div className="space-y-1">
            {filteredBanks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => handleBankSelect(bank)}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                {/* Bank Logo Placeholder */}
                <div className="w-10 h-10 bg-gray-900 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {bank.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Bank Info */}
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{bank.name}</div>
                  <div className="text-sm text-gray-500">{bank.location}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {showResults && filteredBanks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No banks found. Try a different search term.
          </div>
        )}

        {/* Empty State */}
        {!showResults && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">Start typing to search for banks and brokerages</p>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard/add-assets')}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            ← Back to Asset Selection
          </button>
        </div>
      </Card>

      {/* Disclaimer Modal */}
      {modal.show && modal.type === 'disclaimer' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full bg-white rounded-2xl p-8 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Hot Air Balloon Icon */}
            <div className="flex justify-end mb-4">
              <svg
                className="w-20 h-20"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse cx="50" cy="35" rx="25" ry="30" fill="#000" />
                <rect x="45" y="65" width="10" height="15" fill="#000" />
                <path
                  d="M 40 65 L 45 80 L 55 80 L 60 65 Z"
                  fill="none"
                  stroke="#000"
                  strokeWidth="1"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Heads Up</h2>

            <div className="space-y-4 text-gray-700 mb-6">
              <p>
                Lokifi connects your accounts via multiple established aggregators (Mastercard, MX,
                Plaid, Yodlee, Akahu, Lean Insights, Aigo, Volt) who are connected to their sources
                to log in—{' '}
                <a href="#" className="text-blue-600 underline font-medium">
                  it's absolutely safe
                </a>
                .
              </p>

              <p>
                However, financial institutions rely on legacy tech, so{' '}
                <strong className="font-semibold">100% connectivity isn't guaranteed</strong>. Some
                accounts may never connect and must be tracked manually. Even connected accounts can
                be unstable. We'll push aggregators for fixes, but account retrieval and
                balances—some banks may never be fixed.
              </p>

              <p>
                If you experience bad connections report to{' '}
                <a href="mailto:support@lokifi.app" className="text-blue-600 underline font-medium">
                  support@lokifi.app
                </a>{' '}
                for help.
              </p>

              <p>
                If you expect 100% stable connectivity, Lokifi isn't the right solution. No
                aggregator can guarantee uninterrupted account connections, and occasional issues
                are unavoidable.
              </p>
            </div>

            <button
              onClick={handleUnderstand}
              className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              I Understand
            </button>
          </Card>
        </div>
      )}

      {/* Connecting Modal */}
      {modal.show && modal.type === 'connecting' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full bg-white rounded-2xl p-8 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Open Sign Icon */}
            <div className="flex justify-end mb-4">
              <div className="relative">
                <svg
                  className="w-24 h-24"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="20"
                    y="30"
                    width="60"
                    height="40"
                    rx="4"
                    fill="none"
                    stroke="#000"
                    strokeWidth="3"
                  />
                  <text
                    x="50"
                    y="55"
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#000"
                  >
                    OPEN
                  </text>
                  <line x1="50" y1="70" x2="50" y2="85" stroke="#000" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Please keep an eye on the connection tab.
            </h2>

            <div className="space-y-4 text-gray-700 mb-6">
              <p>
                Connecting accounts can take several minutes and may require you to enter more
                details. Please keep an eye on the connection tab to make sure it works without any
                hiccups.
              </p>

              <p>In the meantime you can add more assets and start new connections.</p>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              OK, Got It
            </button>
          </Card>
        </div>
      )}
    </div>
  );
}
