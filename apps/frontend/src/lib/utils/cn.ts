import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx and tailwind-merge
 * This utility combines multiple class names and resolves Tailwind CSS conflicts
 *
 * @example
 * cn('px-2 py-1', 'px-4') // -> 'py-1 px-4' (px-4 wins)
 * cn('bg-red-500', condition && 'bg-blue-500') // Conditional classes
 * cn(['flex', 'items-center']) // Array of classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

