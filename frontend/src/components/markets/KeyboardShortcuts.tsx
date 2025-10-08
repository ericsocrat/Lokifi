/**
 * KeyboardShortcuts Component
 * 
 * Displays keyboard shortcuts help modal
 */

import { Keyboard, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open shortcuts with '?'
      if (e.key === '?' && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-neutral-800 hover:bg-neutral-700 rounded-full text-white shadow-lg transition-all hover:scale-110 z-50"
        title="Keyboard Shortcuts (Press ?)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-500" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          <ShortcutSection title="Navigation">
            <ShortcutItem keys={['/']} description="Focus search" />
            <ShortcutItem keys={['Esc']} description="Clear search / Close modal" />
            <ShortcutItem keys={['?']} description="Show keyboard shortcuts" />
          </ShortcutSection>
          
          <ShortcutSection title="Actions">
            <ShortcutItem keys={['R']} description="Refresh data" />
            <ShortcutItem keys={['E']} description="Export to CSV" />
            <ShortcutItem keys={['W']} description="Toggle watchlist" />
          </ShortcutSection>
          
          <ShortcutSection title="Sorting">
            <ShortcutItem keys={['S']} description="Sort by symbol" />
            <ShortcutItem keys={['P']} description="Sort by price" />
            <ShortcutItem keys={['C']} description="Sort by change %" />
            <ShortcutItem keys={['M']} description="Sort by market cap" />
          </ShortcutSection>
        </div>
        
        <div className="mt-6 pt-6 border-t border-neutral-800">
          <p className="text-sm text-neutral-400 text-center">
            Press <kbd className="px-2 py-1 bg-neutral-800 rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

function ShortcutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-400 mb-3">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function ShortcutItem({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-neutral-300 text-sm">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key: any, i: any) => (
          <kbd
            key={i}
            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm font-mono text-white shadow-sm"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
