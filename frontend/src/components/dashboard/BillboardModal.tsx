'use client';
import React from 'react';

interface BillboardModalProps {
  open: boolean;
  onClose: () => void;
}

export const BillboardModal: React.FC<BillboardModalProps> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white w-full max-w-xl rounded shadow-lg overflow-hidden animate-fadeIn">
        <div className="p-0 border-b border-gray-200">
          <div className="bg-black text-white font-bold tracking-wide text-2xl px-6 py-4">
            BILLBOARD
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm leading-relaxed text-gray-700">
          <p>
            Billboard showcases the top stocks, funds, cryptocurrencies, banks, brokerages, and
            exchanges based on aggregated usage by paid Lokifi users. It&apos;s exclusive to
            subscribers. Billboard becomes visible and your vote starts counting only after your
            paid plan begins after trial.
          </p>
          <div className="rounded border border-dashed p-4 text-center text-xs text-gray-500">
            (Subscriber-only preview placeholder)
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-black text-white rounded text-sm font-medium hover:bg-gray-800"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
