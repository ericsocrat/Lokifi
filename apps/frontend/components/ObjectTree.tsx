'use client';
import { useDrawingObjects, useDrawingSelectedObjectId, useDrawingActions } from '@/lib/stores/drawingStore';
import { usePaneStore } from '@/lib/stores/paneStore';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import React, { useState } from 'react';

interface ObjectTreeProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ObjectTree: React.FC<ObjectTreeProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const objects = useDrawingObjects();
  const selectedObjectId = useDrawingSelectedObjectId();
  const {
    selectObject,
    deleteObject,
    duplicateObject,
    setObjectProperties,
    moveObjectToPane,
    getObjectsByPane,
    clearAllObjects,
  } = useDrawingActions();

  const { panes } = usePaneStore();
  const [expandedPanes, setExpandedPanes] = useState<Set<string>>(new Set(['price-pane']));
  const [contextMenu, setContextMenu] = useState<{
    objectId: string;
    x: number;
    y: number;
  } | null>(null);

  const togglePaneExpansion = (paneId: string) => {
    const newExpanded = new Set(expandedPanes);
    if (newExpanded.has(paneId)) {
      newExpanded.delete(paneId);
    } else {
      newExpanded.add(paneId);
    }
    setExpandedPanes(newExpanded);
  };

  const handleObjectSelect = (objectId: string) => {
    selectObject(objectId === selectedObjectId ? null : objectId);
  };

  const handleContextMenu = (e: React.MouseEvent, objectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      objectId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleToggleVisibility = (objectId: string, visible: boolean) => {
    setObjectProperties(objectId, { visible: !visible });
  };

  const handleToggleLock = (objectId: string, locked: boolean) => {
    setObjectProperties(objectId, { locked: !locked });
  };

  const handleDelete = (objectId: string) => {
    deleteObject(objectId);
    setContextMenu(null);
  };

  const handleDuplicate = (objectId: string) => {
    const newId = duplicateObject(objectId);
    selectObject(newId);
    setContextMenu(null);
  };

  const handleMoveToPane = (objectId: string, targetPaneId: string) => {
    moveObjectToPane(objectId, targetPaneId);
    setContextMenu(null);
  };

  // Close context menu on click outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return () => {}; // Always return cleanup function
  }, [contextMenu]);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[#1e222d] border-l border-[#2a2e39] flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 bg-[#2a2e39] hover:bg-[#363a45] rounded flex items-center justify-center mb-4"
          title="Expand Object Tree"
        >
          <Layers className="w-4 h-4 text-[#787b86]" />
        </button>

        {/* Show object count when collapsed */}
        <div className="w-8 h-6 bg-[#2a2e39] rounded text-xs text-[#787b86] flex items-center justify-center">
          {objects.length}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-[#1e222d] border-l border-[#2a2e39] flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2a2e39] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#787b86]" />
          <h2 className="text-sm font-medium text-[#d1d4dc]">Objects</h2>
          <span className="text-xs text-[#787b86] bg-[#2a2e39] px-1.5 py-0.5 rounded">
            {objects.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {objects.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Delete all drawing objects?')) {
                  clearAllObjects();
                }
              }}
              className="w-6 h-6 hover:bg-red-500/20 rounded flex items-center justify-center"
              title="Clear All Objects"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="w-6 h-6 hover:bg-[#2a2e39] rounded flex items-center justify-center"
            title="Collapse Object Tree"
          >
            <ChevronRight className="w-3 h-3 text-[#787b86]" />
          </button>
        </div>
      </div>

      {/* Object Tree */}
      <div className="flex-1 overflow-y-auto">
        {panes.map((pane: { id: string; type: string }) => {
          const paneObjects = getObjectsByPane(pane.id);
          const isExpanded = expandedPanes.has(pane.id);

          return (
            <div key={pane.id} className="border-b border-[#2a2e39]/50 last:border-b-0">
              {/* Pane Header */}
              <button
                onClick={() => togglePaneExpansion(pane.id)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#2a2e39]/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-[#787b86]" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[#787b86]" />
                )}
                <span className="text-sm text-[#d1d4dc]">
                  {pane.type === 'price' ? 'Price Chart' : 'Indicators'}
                </span>
                <span className="text-xs text-[#787b86] bg-[#2a2e39] px-1.5 py-0.5 rounded ml-auto">
                  {paneObjects.length}
                </span>
              </button>

              {/* Pane Objects */}
              {isExpanded && (
                <div className="pb-2">
                  {paneObjects.length === 0 ? (
                    <div className="px-8 py-3 text-xs text-[#787b86] italic">
                      No drawing objects
                    </div>
                  ) : (
                    paneObjects
                      .sort(
                        (
                          a: { properties: { zIndex: number } },
                          b: { properties: { zIndex: number } }
                        ) => b.properties.zIndex - a.properties.zIndex
                      )
                      .map(
                        (object: {
                          id: string;
                          type: string;
                          properties: { name: string; locked: boolean; visible: boolean };
                          style: { color: string };
                        }) => (
                          <div
                            key={object.id}
                            className={`mx-2 mb-0.5 rounded transition-colors ${
                              selectedObjectId === object.id
                                ? 'bg-[#2962ff]/20 border border-[#2962ff]/50'
                                : 'hover:bg-[#2a2e39]/50 border border-transparent'
                            }`}
                            onClick={() => handleObjectSelect(object.id)}
                            onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, object.id)}
                          >
                            <div className="px-2 py-1.5 flex items-center gap-2">
                              {/* Object Type Icon */}
                              <div className="w-3 h-3 flex items-center justify-center">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: object.style.color }}
                                />
                              </div>

                              {/* Object Name */}
                              <span className="flex-1 text-xs text-[#d1d4dc] truncate">
                                {object.properties.name}
                              </span>

                              {/* Object Controls */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                <button
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleToggleVisibility(object.id, object.properties.visible);
                                  }}
                                  className="w-5 h-5 hover:bg-[#363a45] rounded flex items-center justify-center"
                                  title={object.properties.visible ? 'Hide' : 'Show'}
                                >
                                  {object.properties.visible ? (
                                    <Eye className="w-3 h-3 text-[#787b86]" />
                                  ) : (
                                    <EyeOff className="w-3 h-3 text-[#787b86]/50" />
                                  )}
                                </button>

                                <button
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleToggleLock(object.id, object.properties.locked);
                                  }}
                                  className="w-5 h-5 hover:bg-[#363a45] rounded flex items-center justify-center"
                                  title={object.properties.locked ? 'Unlock' : 'Lock'}
                                >
                                  {object.properties.locked ? (
                                    <Lock className="w-3 h-3 text-[#787b86]" />
                                  ) : (
                                    <Unlock className="w-3 h-3 text-[#787b86]/50" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {objects.length === 0 && (
          <div className="p-6 text-center text-[#787b86]">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No drawing objects</p>
            <p className="text-xs mt-1 opacity-70">Select a tool to draw</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl py-1 z-50 min-w-40"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: 'translate(-100%, 0)',
          }}
        >
          <button
            onClick={() => handleDuplicate(contextMenu.objectId)}
            className="w-full px-3 py-2 text-left text-sm text-[#d1d4dc] hover:bg-[#2a2e39] flex items-center gap-2"
          >
            <Copy className="w-4 h-4 text-[#787b86]" />
            Duplicate
          </button>

          <div className="h-px bg-[#2a2e39] my-1" />

          <div className="px-3 py-1 text-xs text-[#787b86] uppercase tracking-wide">Move to</div>
          {panes.map((pane: { id: string; type: string }) => (
            <button
              key={pane.id}
              onClick={() => handleMoveToPane(contextMenu.objectId, pane.id)}
              className="w-full px-5 py-1.5 text-left text-sm text-[#d1d4dc] hover:bg-[#2a2e39]"
            >
              {pane.type === 'price' ? 'Price Chart' : 'Indicators'}
            </button>
          ))}

          <div className="h-px bg-[#2a2e39] my-1" />

          <button
            onClick={() => handleDelete(contextMenu.objectId)}
            className="w-full px-3 py-2 text-left text-sm text-[#f23645] hover:bg-[#f23645]/10 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

