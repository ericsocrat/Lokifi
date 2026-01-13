'use client';

import {
  useDrawingActions,
  useDrawingActiveTool,
  useDrawingObjects,
  useDrawingSelectedObjectId,
  type DrawingObject,
  type Point,
} from '@/lib/stores/drawingStore';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

interface DrawingOverlayProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  paneId: string;
  isDrawing: boolean;
  currentDrawing: Partial<DrawingObject> | null;
  chartDataLength?: number; // Used to trigger re-render when chart data changes
}

/**
 * Canvas overlay for drawing objects on top of the chart.
 * This approach is simpler and more reliable than using Primitives API.
 * Memoized to prevent re-renders when parent component re-renders.
 */
export const DrawingOverlay = memo(function DrawingOverlayComponent({
  chartRef,
  seriesRef,
  containerRef,
  paneId,
  isDrawing,
  currentDrawing,
  chartDataLength = 0,
}: DrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objects = useDrawingObjects();
  const selectedObjectId = useDrawingSelectedObjectId();
  const activeTool = useDrawingActiveTool();
  const {
    getObjectsByPane,
    selectObject,
    setActiveTool,
    updateObject,
    getObjectById,
    deleteObject,
  } = useDrawingActions();
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });

  // Drag state for moving objects
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragPointIndex, setDragPointIndex] = useState<number | null>(null); // null = move whole object, number = resize specific point

  // Convert time/price to pixel coordinates
  const toPixel = useCallback(
    (point: Point): { x: number; y: number } | null => {
      if (!chartRef.current || !seriesRef.current || !point.time || point.price === undefined) {
        return null;
      }

      const timeScale = chartRef.current.timeScale();
      const x = timeScale.timeToCoordinate(point.time as Time);
      const y = seriesRef.current.priceToCoordinate(point.price);

      if (x === null || y === null) return null;
      return { x, y };
    },
    [chartRef, seriesRef]
  );

  // Convert pixel coordinates back to time/price
  const fromPixel = useCallback(
    (px: number, py: number): { time: Time; price: number } | null => {
      if (!chartRef.current || !seriesRef.current) return null;

      const timeScale = chartRef.current.timeScale();
      const time = timeScale.coordinateToTime(px);
      const price = seriesRef.current.coordinateToPrice(py);

      if (time === null || price === null) return null;
      return { time, price };
    },
    [chartRef, seriesRef]
  );

  // Check if a point is near a control point (for resizing)
  const findControlPointIndex = useCallback(
    (obj: DrawingObject, px: number, py: number): number | null => {
      const tolerance = 8;
      for (let i = 0; i < obj.points.length; i++) {
        const p = toPixel(obj.points[i]);
        if (p && Math.abs(px - p.x) < tolerance && Math.abs(py - p.y) < tolerance) {
          return i;
        }
      }
      return null;
    },
    [toPixel]
  );

  // Find object at given pixel position
  const findObjectAtPosition = useCallback(
    (px: number, py: number): DrawingObject | null => {
      const paneObjects = getObjectsByPane(paneId);
      const tolerance = 10; // pixels

      // Search in reverse order (top objects first)
      for (let i = paneObjects.length - 1; i >= 0; i--) {
        const obj = paneObjects[i];
        if (!obj.properties?.visible) continue;
        if (obj.points.length === 0) continue;

        const p1 = toPixel(obj.points[0]);
        if (!p1) continue;

        switch (obj.type) {
          case 'hline':
            if (Math.abs(py - p1.y) < tolerance) return obj;
            break;
          case 'vline':
            if (Math.abs(px - p1.x) < tolerance) return obj;
            break;
          case 'textNote':
            // Simple bounding box check for text
            if (px >= p1.x && px <= p1.x + 100 && py >= p1.y - 20 && py <= p1.y + 10) {
              return obj;
            }
            break;
          default:
            if (obj.points.length >= 2) {
              const p2 = toPixel(obj.points[1]);
              if (!p2) continue;

              // Check if point is near the line/shape
              if (obj.type === 'rectangle' || obj.type === 'circle') {
                const minX = Math.min(p1.x, p2.x) - tolerance;
                const maxX = Math.max(p1.x, p2.x) + tolerance;
                const minY = Math.min(p1.y, p2.y) - tolerance;
                const maxY = Math.max(p1.y, p2.y) + tolerance;
                if (px >= minX && px <= maxX && py >= minY && py <= maxY) return obj;
              } else {
                // Line-based objects - check distance to line
                const dist = distanceToLine(px, py, p1.x, p1.y, p2.x, p2.y);
                if (dist < tolerance) return obj;
              }
            }
        }
      }
      return null;
    },
    [getObjectsByPane, paneId, toPixel]
  );

  // Calculate distance from point to line segment
  const distanceToLine = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle mouse down on canvas for selection and drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const obj = findObjectAtPosition(px, py);

      if (obj) {
        selectObject(obj.id);
        setActiveTool('cursor');

        // Check if clicking on a control point (for resizing)
        const controlPointIdx = findControlPointIndex(obj, px, py);

        // Start dragging
        setIsDragging(true);
        setDragStartPos({ x: px, y: py });
        setDragPointIndex(controlPointIdx); // null = move whole object, number = resize point

        // If it's a text note and double-click, enable editing
        if (obj.type === 'textNote' && e.detail === 2) {
          setEditingTextId(obj.id);
          setTextInputValue(obj.properties?.name || 'Text');
          const p1 = toPixel(obj.points[0]);
          if (p1) {
            setTextInputPosition({ x: p1.x, y: p1.y - 20 });
          }
        }
      } else {
        selectObject(null);
        setEditingTextId(null);
      }
    },
    [isDrawing, findObjectAtPosition, selectObject, setActiveTool, toPixel, findControlPointIndex]
  );

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !selectedObjectId || !dragStartPos) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const selectedObj = getObjectById(selectedObjectId);
      if (!selectedObj || selectedObj.properties?.locked) return;

      // Calculate delta in pixel space
      const deltaX = px - dragStartPos.x;
      const deltaY = py - dragStartPos.y;

      if (dragPointIndex !== null) {
        // Resize: move specific control point
        const oldPoint = selectedObj.points[dragPointIndex];
        const oldPixel = toPixel(oldPoint);
        if (oldPixel) {
          const newCoords = fromPixel(oldPixel.x + deltaX, oldPixel.y + deltaY);
          if (newCoords) {
            const newPoints = [...selectedObj.points];
            newPoints[dragPointIndex] = { time: newCoords.time, price: newCoords.price };
            updateObject(selectedObjectId, { points: newPoints });
          }
        }
      } else {
        // Move: translate all points
        const newPoints = selectedObj.points.map((point) => {
          const oldPixel = toPixel(point);
          if (oldPixel) {
            const newCoords = fromPixel(oldPixel.x + deltaX, oldPixel.y + deltaY);
            if (newCoords) {
              return { time: newCoords.time, price: newCoords.price };
            }
          }
          return point;
        });
        updateObject(selectedObjectId, { points: newPoints });
      }

      // Update drag start position for next frame
      setDragStartPos({ x: px, y: py });
    },
    [
      isDragging,
      selectedObjectId,
      dragStartPos,
      dragPointIndex,
      getObjectById,
      toPixel,
      fromPixel,
      updateObject,
    ]
  );

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStartPos(null);
    setDragPointIndex(null);
  }, []);

  // Handle click on canvas for selection (used when not dragging)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Click is now handled by mouseDown, but keep for text editing on single click
      if (isDrawing || isDragging) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const obj = findObjectAtPosition(px, py);

      if (obj && obj.type === 'textNote') {
        setEditingTextId(obj.id);
        setTextInputValue(obj.properties?.name || 'Text');
        const p1 = toPixel(obj.points[0]);
        if (p1) {
          setTextInputPosition({ x: p1.x, y: p1.y - 20 });
        }
      }
    },
    [isDrawing, isDragging, findObjectAtPosition, toPixel]
  );

  // Handle text input change
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInputValue(e.target.value);
  };

  // Handle text input blur/enter
  const handleTextInputBlur = useCallback(() => {
    if (editingTextId) {
      const existingObj = getObjectById(editingTextId);
      if (existingObj) {
        updateObject(editingTextId, {
          properties: {
            ...existingObj.properties,
            name: textInputValue,
          },
        });
      }
      setEditingTextId(null);
    }
  }, [editingTextId, textInputValue, getObjectById, updateObject]);

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextInputBlur();
    } else if (e.key === 'Escape') {
      setEditingTextId(null);
    }
  };

  // Draw a single object on canvas
  const drawObject = useCallback(
    (ctx: CanvasRenderingContext2D, obj: DrawingObject, isPreview = false) => {
      if (!obj.properties?.visible && !isPreview) return;
      if (obj.points.length === 0) return;

      const p1Pixel = toPixel(obj.points[0]);
      if (!p1Pixel) return;

      const isSelected = obj.id === selectedObjectId;
      ctx.strokeStyle = isPreview ? '#ffaa00' : isSelected ? '#00ff00' : obj.style.color;
      ctx.lineWidth = isSelected ? obj.style.lineWidth + 1 : obj.style.lineWidth;
      ctx.setLineDash(isPreview ? [5, 5] : []);

      const canvasWidth = ctx.canvas.width;
      const canvasHeight = ctx.canvas.height;

      switch (obj.type) {
        case 'hline': {
          // Horizontal line across entire width
          ctx.beginPath();
          ctx.moveTo(0, p1Pixel.y);
          ctx.lineTo(canvasWidth, p1Pixel.y);
          ctx.stroke();
          break;
        }

        case 'vline': {
          // Vertical line across entire height
          ctx.beginPath();
          ctx.moveTo(p1Pixel.x, 0);
          ctx.lineTo(p1Pixel.x, canvasHeight);
          ctx.stroke();
          break;
        }

        case 'trendline': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          ctx.beginPath();
          ctx.moveTo(p1Pixel.x, p1Pixel.y);
          ctx.lineTo(p2Pixel.x, p2Pixel.y);
          ctx.stroke();
          break;
        }

        case 'arrow': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          // Draw the line
          ctx.beginPath();
          ctx.moveTo(p1Pixel.x, p1Pixel.y);
          ctx.lineTo(p2Pixel.x, p2Pixel.y);
          ctx.stroke();

          // Draw arrowhead at p2
          const angle = Math.atan2(p2Pixel.y - p1Pixel.y, p2Pixel.x - p1Pixel.x);
          const arrowLength = 12;
          const arrowAngle = Math.PI / 6; // 30 degrees

          ctx.beginPath();
          ctx.moveTo(p2Pixel.x, p2Pixel.y);
          ctx.lineTo(
            p2Pixel.x - arrowLength * Math.cos(angle - arrowAngle),
            p2Pixel.y - arrowLength * Math.sin(angle - arrowAngle)
          );
          ctx.moveTo(p2Pixel.x, p2Pixel.y);
          ctx.lineTo(
            p2Pixel.x - arrowLength * Math.cos(angle + arrowAngle),
            p2Pixel.y - arrowLength * Math.sin(angle + arrowAngle)
          );
          ctx.stroke();
          break;
        }

        case 'rectangle': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          const x = Math.min(p1Pixel.x, p2Pixel.x);
          const y = Math.min(p1Pixel.y, p2Pixel.y);
          const width = Math.abs(p2Pixel.x - p1Pixel.x);
          const height = Math.abs(p2Pixel.y - p1Pixel.y);

          // Fill with semi-transparent color
          if (obj.style.fillColor && obj.style.fillOpacity) {
            ctx.fillStyle =
              obj.style.fillColor +
              Math.round(obj.style.fillOpacity * 255)
                .toString(16)
                .padStart(2, '0');
            ctx.fillRect(x, y, width, height);
          }

          // Stroke outline
          ctx.strokeRect(x, y, width, height);
          break;
        }

        case 'circle': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          const centerX = (p1Pixel.x + p2Pixel.x) / 2;
          const centerY = (p1Pixel.y + p2Pixel.y) / 2;
          const radiusX = Math.abs(p2Pixel.x - p1Pixel.x) / 2;
          const radiusY = Math.abs(p2Pixel.y - p1Pixel.y) / 2;

          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);

          // Fill with semi-transparent color
          if (obj.style.fillColor && obj.style.fillOpacity) {
            ctx.fillStyle =
              obj.style.fillColor +
              Math.round(obj.style.fillOpacity * 255)
                .toString(16)
                .padStart(2, '0');
            ctx.fill();
          }

          ctx.stroke();
          break;
        }

        case 'fibonacciRetracement': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const priceRange = (obj.points[1].price || 0) - (obj.points[0].price || 0);

          levels.forEach((level) => {
            const price = (obj.points[0].price || 0) + priceRange * level;
            const levelPoint = toPixel({ time: obj.points[0].time, price });
            if (!levelPoint) return;

            ctx.beginPath();
            ctx.moveTo(Math.min(p1Pixel.x, p2Pixel.x), levelPoint.y);
            ctx.lineTo(Math.max(p1Pixel.x, p2Pixel.x), levelPoint.y);
            ctx.stroke();

            // Label
            ctx.fillStyle = obj.style.color;
            ctx.font = '10px sans-serif';
            ctx.fillText(
              `${(level * 100).toFixed(1)}%`,
              Math.max(p1Pixel.x, p2Pixel.x) + 5,
              levelPoint.y + 3
            );
          });
          break;
        }

        case 'fibonacciExtension': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          const levels = [0, 0.618, 1, 1.618, 2.618, 4.236];
          const priceRange = (obj.points[1].price || 0) - (obj.points[0].price || 0);

          levels.forEach((level) => {
            const price = (obj.points[0].price || 0) + priceRange * level;
            const levelPoint = toPixel({ time: obj.points[0].time, price });
            if (!levelPoint) return;

            ctx.beginPath();
            ctx.moveTo(Math.min(p1Pixel.x, p2Pixel.x), levelPoint.y);
            ctx.lineTo(Math.max(p1Pixel.x, p2Pixel.x), levelPoint.y);
            ctx.stroke();

            // Label
            ctx.fillStyle = obj.style.color;
            ctx.font = '10px sans-serif';
            ctx.fillText(
              `${(level * 100).toFixed(1)}%`,
              Math.max(p1Pixel.x, p2Pixel.x) + 5,
              levelPoint.y + 3
            );
          });
          break;
        }

        case 'parallelChannel': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          // Draw main line
          ctx.beginPath();
          ctx.moveTo(p1Pixel.x, p1Pixel.y);
          ctx.lineTo(p2Pixel.x, p2Pixel.y);
          ctx.stroke();

          // Draw parallel line (offset by 50 pixels for now)
          const offset = 50;
          ctx.beginPath();
          ctx.moveTo(p1Pixel.x, p1Pixel.y - offset);
          ctx.lineTo(p2Pixel.x, p2Pixel.y - offset);
          ctx.stroke();
          break;
        }

        case 'pitchfork': {
          if (obj.points.length < 2) return;
          const p2Pixel = toPixel(obj.points[1]);
          if (!p2Pixel) return;

          // Draw as 3-pronged fork from center
          const midY = (p1Pixel.y + p2Pixel.y) / 2;
          ctx.beginPath();
          // Center line
          ctx.moveTo(p1Pixel.x, p1Pixel.y);
          ctx.lineTo(p2Pixel.x, midY);
          // Top prong
          ctx.moveTo(p1Pixel.x, p1Pixel.y);
          ctx.lineTo(p2Pixel.x, p1Pixel.y);
          // Bottom prong
          ctx.moveTo(p1Pixel.x, p1Pixel.y);
          ctx.lineTo(p2Pixel.x, p2Pixel.y);
          ctx.stroke();
          break;
        }

        case 'textNote': {
          // Draw text at the first point with background
          const text = obj.properties?.name || 'Text';
          ctx.font = `${obj.style.fontSize || 14}px sans-serif`;
          const metrics = ctx.measureText(text);
          const padding = 4;

          // Draw background
          ctx.fillStyle = isSelected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(30, 34, 45, 0.8)';
          ctx.fillRect(
            p1Pixel.x - padding,
            p1Pixel.y - (obj.style.fontSize || 14) - padding,
            metrics.width + padding * 2,
            (obj.style.fontSize || 14) + padding * 2
          );

          // Draw text
          ctx.fillStyle = obj.style.color;
          ctx.fillText(text, p1Pixel.x, p1Pixel.y);
          break;
        }

        default:
          // Fallback: draw as trendline if 2 points
          if (obj.points.length >= 2) {
            const p2Pixel = toPixel(obj.points[1]);
            if (!p2Pixel) return;

            ctx.beginPath();
            ctx.moveTo(p1Pixel.x, p1Pixel.y);
            ctx.lineTo(p2Pixel.x, p2Pixel.y);
            ctx.stroke();
          }
      }

      // Draw control points for selected objects (for resizing)
      if (isSelected && !isPreview) {
        const controlPointSize = 6;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2962ff';
        ctx.lineWidth = 2;

        obj.points.forEach((point) => {
          const pixel = toPixel(point);
          if (pixel) {
            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, controlPointSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        });
      }
    },
    [toPixel, selectedObjectId]
  );

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to container
    const rect = container.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all saved objects for this pane
    const paneObjects = getObjectsByPane(paneId);
    paneObjects.forEach((obj) => {
      drawObject(ctx, obj);
    });

    // Draw current drawing preview
    if (isDrawing && currentDrawing && currentDrawing.type && currentDrawing.points) {
      drawObject(
        ctx,
        {
          ...currentDrawing,
          id: 'preview',
          properties: {
            name: 'Preview',
            visible: true,
            locked: false,
            zIndex: 9999,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          style: currentDrawing.style || {
            color: '#60a5fa',
            lineWidth: 2,
            lineStyle: 'solid',
          },
        } as DrawingObject,
        true
      );
    }
  }, [getObjectsByPane, paneId, drawObject, isDrawing, currentDrawing]);

  // Render on objects or selection change
  useEffect(() => {
    render();
  }, [render, objects, selectedObjectId]);

  // Re-render when chart data changes (important for persisted objects on page load)
  useEffect(() => {
    if (chartDataLength > 0) {
      // Delay render to ensure chart has processed the data
      const timeout = setTimeout(() => {
        render();
      }, 200);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [chartDataLength, render]);

  // Re-render when chart scrolls/zooms
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;

    // Subscribe to time scale changes (scroll/zoom)
    const timeScale = chart.timeScale();

    // These methods return void, we need to use unsubscribe methods
    const handleRangeChange = () => {
      requestAnimationFrame(render);
    };

    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);

    // Initial render with delay to ensure chart is fully initialized
    // This is important for rendering persisted objects on page load
    const initialRenderTimeout = setTimeout(() => {
      render();
    }, 100);

    // Additional delayed render for persisted objects
    const persistedRenderTimeout = setTimeout(() => {
      render();
    }, 500);

    return () => {
      clearTimeout(initialRenderTimeout);
      clearTimeout(persistedRenderTimeout);
      timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chartRef, render]);

  // Re-render on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(render);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, render]);

  // Keyboard shortcuts for selected objects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have a selected object and not editing text
      if (!selectedObjectId || editingTextId) return;

      // Delete selected object with Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteObject(selectedObjectId);
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        selectObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, editingTextId, selectObject, deleteObject]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          zIndex: 10,
          // Enable pointer events in cursor mode for object selection and manipulation
          // Disable during drawing so chart container handles drawing events
          pointerEvents: activeTool === 'cursor' && !isDrawing ? 'auto' : 'none',
          cursor: isDragging
            ? dragPointIndex !== null
              ? 'nwse-resize'
              : 'move'
            : selectedObjectId
              ? 'move'
              : 'pointer',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      />

      {/* Text Input Overlay for editing text notes */}
      {editingTextId && (
        <input
          type="text"
          value={textInputValue}
          onChange={handleTextInputChange}
          onBlur={handleTextInputBlur}
          onKeyDown={handleTextInputKeyDown}
          autoFocus
          className="absolute bg-[#1e222d] border border-[#2962ff] text-white px-2 py-1 rounded text-sm outline-none"
          style={{
            left: textInputPosition.x,
            top: textInputPosition.y,
            zIndex: 20,
            minWidth: 100,
          }}
        />
      )}
    </>
  );
});
