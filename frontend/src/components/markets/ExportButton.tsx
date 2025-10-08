/**
 * ExportButton Component
 * 
 * Exports market data to CSV or JSON format
 */

import { Download } from 'lucide-react';
import { useState } from 'react';

interface ExportButtonProps {
  data: any[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton({ data, filename, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const exportToCSV = () => {
    if (data.length === 0) return;
    
    setIsExporting(true);
    
    try {
      // Get headers from first item
      const headers = Object.keys(data[0]);
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map((item: any) => 
          headers.map(header => {
            const value = item[header];
            // Handle values with commas by wrapping in quotes
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value ?? '';
          }).join(',')
        )
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };
  
  return (
    <button
      onClick={exportToCSV}
      disabled={disabled || isExporting || data.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export to CSV"
    >
      <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
