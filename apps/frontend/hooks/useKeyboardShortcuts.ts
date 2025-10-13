"use client";
import { useEffect } from 'react';
import { useDrawingStore, DrawingTool } from '@/lib/stores/drawingStore';

const TOOL_SHORTCUTS: Record<string, DrawingTool> = {
  'v': 'cursor',
  't': 'trendline',
  'h': 'hline',
  'r': 'rectangle',
  'c': 'circle',
  'a': 'arrow',
  'n': 'textNote',
  'f': 'fibonacciRetracement',
  'p': 'parallelChannel',
  'g': 'gannFan',
  'e': 'elliottWave',
};

const SHIFT_TOOL_SHORTCUTS: Record<string, DrawingTool> = {
  'h': 'vline', // Shift+H for vertical line
  'f': 'fibonacciExtension', // Shift+F for fib extension
  'p': 'pitchfork', // Shift+P for pitchfork
};

export const useKeyboardShortcuts = () => {
  const { setActiveTool, isDrawing, cancelDrawing, deleteSelectedObjects } = useDrawingStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle Escape key - cancel current drawing or clear selection
      if (e.key === 'Escape') {
        if (isDrawing) {
          cancelDrawing();
        }
        return;
      }

      // Handle Delete key - delete selected objects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedObjects();
        return;
      }

      // Handle tool shortcuts
      const key = e.key.toLowerCase();
      
      if (e.shiftKey && SHIFT_TOOL_SHORTCUTS[key]) {
        e.preventDefault();
        setActiveTool(SHIFT_TOOL_SHORTCUTS[key]);
      } else if (!e.shiftKey && TOOL_SHORTCUTS[key]) {
        e.preventDefault();
        setActiveTool(TOOL_SHORTCUTS[key]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, isDrawing, cancelDrawing, deleteSelectedObjects]);
};

// Context menu hook for right-click interactions
export const useContextMenu = () => {
  const { 
    selectObject, 
    duplicateObject, 
    deleteObject, 
    setObjectProperties 
  } = useDrawingStore();

  const showContextMenu = (objectId: string, x: number, y: number) => {
    // This would show a context menu at the specified position
    // For now, we'll just select the object
    selectObject(objectId);
  };

  return { showContextMenu };
};
