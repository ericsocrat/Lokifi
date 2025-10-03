import React from 'react';

interface ContextMenuProps {
  children?: React.ReactNode;
  x: number;
  y: number;
  onClose: () => void;
}

export default function ContextMenu({ children, x, y, onClose }: ContextMenuProps) {
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.context-menu')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      className="context-menu absolute bg-gray-800 rounded-lg shadow-lg py-1 min-w-[120px]"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}
