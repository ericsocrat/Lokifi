'use client';
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
import React, { useEffect, useState } from 'react';
import { useDrawingStore } from '../lib/drawingStore';
import { usePaneStore } from '../lib/paneStore';

interface ObjectTreeProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ObjectTree: React.FC<ObjectTreeProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const {
    objects,
    selectedObjectId,
    selectObject,
    deleteObject,
    duplicateObject,
    setObjectProperties,
    moveObjectToPane,
    getObjectsByPane,
  } = useDrawingStore();

  const { panes } = usePaneStore();
  const [expandedPanes, setExpandedPanes] = useState<Set<string>>(new Set(['price-pane']));
  const [contextMenu, setContextMenu] = useState<{
    objectId: string;
    x: number;
    y: number;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Prevent hydration mismatch
  if (!isMounted) {
    return <div className="w-80 bg-bg-secondary border-l border-border-default" />;
  }

  if (isCollapsed) {
    return (
      <div className="w-12 bg-bg-secondary border-l border-border-default flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 bg-bg-elevated hover:bg-bg-elevated-hover rounded flex items-center justify-center mb-4 transition-smooth"
          title="Expand Object Tree"
        >
          <Layers className="w-4 h-4 text-text-secondary" />
        </button>

        {/* Show object count when collapsed */}
        <div className="w-8 h-6 bg-bg-elevated rounded text-xs text-text-secondary flex items-center justify-center">
          {objects.length}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-bg-secondary border-l border-border-default flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">Objects</h2>
          <span className="text-xs text-text-tertiary bg-bg-elevated px-2 py-1 rounded">
            {objects.length}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 bg-bg-elevated hover:bg-bg-elevated-hover rounded flex items-center justify-center transition-smooth"
          title="Collapse Object Tree"
        >
          <ChevronRight className="w-3 h-3 text-text-secondary" />
        </button>
      </div>

      {/* Object Tree */}
      <div className="flex-1 overflow-y-auto">
        {panes.map((pane) => {
          const paneObjects = getObjectsByPane(pane.id);
          const isExpanded = expandedPanes.has(pane.id);

          return (
            <div key={pane.id} className="border-b border-border-subtle last:border-b-0">
              {/* Pane Header */}
              <button
                onClick={() => togglePaneExpansion(pane.id)}
                className="w-full px-4 py-2 flex items-center gap-2 hover:bg-bg-elevated/50 transition-smooth"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-text-secondary" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-text-secondary" />
                )}
                <span className="text-sm font-medium text-text-secondary">
                  {pane.type === 'price' ? 'Price Chart' : 'Indicators'}
                </span>
                <span className="text-xs text-text-tertiary bg-bg-elevated px-2 py-0.5 rounded ml-auto">
                  {paneObjects.length}
                </span>
              </button>

              {/* Pane Objects */}
              {isExpanded && (
                <div className="pb-2">
                  {paneObjects.length === 0 ? (
                    <div className="px-8 py-4 text-xs text-text-tertiary italic">
                      No drawing objects
                    </div>
                  ) : (
                    paneObjects
                      .sort((a, b) => b.properties.zIndex - a.properties.zIndex)
                      .map((object) => (
                        <div
                          key={object.id}
                          className={`mx-2 mb-1 rounded-md transition-smooth ${
                            selectedObjectId === object.id
                              ? 'bg-primary/20 border border-primary/50'
                              : 'hover:bg-bg-elevated/50 border border-transparent'
                          }`}
                          onClick={() => handleObjectSelect(object.id)}
                          onContextMenu={(e) => handleContextMenu(e, object.id)}
                        >
                          <div className="px-3 py-2 flex items-center gap-2">
                            {/* Object Type Icon */}
                            <div className="w-4 h-4 flex items-center justify-center">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: object.style.color }}
                              />
                            </div>

                            {/* Object Name */}
                            <span className="flex-1 text-sm text-text-secondary truncate">
                              {object.properties.name}
                            </span>

                            {/* Object Controls */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleVisibility(object.id, object.properties.visible);
                                }}
                                className="w-5 h-5 hover:bg-bg-elevated-hover rounded flex items-center justify-center transition-smooth"
                                title={object.properties.visible ? 'Hide' : 'Show'}
                              >
                                {object.properties.visible ? (
                                  <Eye className="w-3 h-3 text-text-secondary" />
                                ) : (
                                  <EyeOff className="w-3 h-3 text-text-tertiary" />
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLock(object.id, object.properties.locked);
                                }}
                                className="w-5 h-5 hover:bg-bg-elevated-hover rounded flex items-center justify-center transition-smooth"
                                title={object.properties.locked ? 'Unlock' : 'Lock'}
                              >
                                {object.properties.locked ? (
                                  <Lock className="w-3 h-3 text-text-secondary" />
                                ) : (
                                  <Unlock className="w-3 h-3 text-text-tertiary" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {objects.length === 0 && (
          <div className="p-8 text-center text-text-tertiary">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No drawing objects yet</p>
            <p className="text-xs mt-1">Select a drawing tool to get started</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-bg-secondary border border-border-default rounded-lg shadow-xl py-2 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: 'translate(-100%, 0)',
          }}
        >
          <button
            onClick={() => handleDuplicate(contextMenu.objectId)}
            className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated transition-smooth flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>

          <div className="px-4 py-1">
            <div className="border-b border-border-default"></div>
          </div>

          <div className="px-4 py-2 text-xs text-text-tertiary uppercase tracking-wide">
            Move to Pane
          </div>
          {panes.map((pane) => (
            <button
              key={pane.id}
              onClick={() => handleMoveToPane(contextMenu.objectId, pane.id)}
              className="w-full px-6 py-1 text-left text-sm text-text-secondary hover:bg-bg-elevated transition-smooth"
            >
              {pane.type === 'price' ? 'Price Chart' : 'Indicators'}
            </button>
          ))}

          <div className="px-4 py-1">
            <div className="border-b border-border-default"></div>
          </div>

          <button
            onClick={() => handleDelete(contextMenu.objectId)}
            className="w-full px-4 py-2 text-left text-sm text-trading-loss hover:bg-trading-loss/10 transition-smooth flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
