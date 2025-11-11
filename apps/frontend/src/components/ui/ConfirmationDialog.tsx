import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showDontAskAgain?: boolean;
  onDontAskAgainChange?: (checked: boolean) => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showDontAskAgain = false,
  onDontAskAgainChange,
}) => {
  const [dontAskAgain, setDontAskAgain] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (showDontAskAgain && onDontAskAgainChange) {
      onDontAskAgainChange(dontAskAgain);
    }
    onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="bg-neutral-800 border border-white/15 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 id="dialog-title" className="text-lg font-semibold text-white mb-3">
          {title}
        </h2>

        {/* Message */}
        <p className="text-neutral-300 mb-6 leading-relaxed">{message}</p>

        {/* Don't ask again checkbox */}
        {showDontAskAgain && (
          <label className="flex items-center gap-2 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="w-4 h-4 rounded border-white/15 bg-neutral-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-neutral-400">Don't ask me again</span>
          </label>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
            autoFocus
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
