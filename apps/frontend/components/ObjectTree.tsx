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
import React, { useState } from 'react';
import { useDrawingStore } from '@/lib/stores/drawingStore';
import { usePaneStore } from '@/lib/stores/paneStore';

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
      <div className="w-12 bg-gray-800 border-l border-gray-700 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center mb-4"
          title="Expand Object Tree"
        >
          <Layers className="w-4 h-4 text-gray-300" />
        </button>

        {/* Show object count when collapsed */}
        <div className="w-8 h-6 bg-gray-700 rounded text-xs text-gray-300 flex items-center justify-center">
          {objects.length}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-white">Objects</h2>
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
            {objects.length}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
          title="Collapse Object Tree"
        >
          <ChevronRight className="w-3 h-3 text-gray-300" />
        </button>
      </div>

      {/* Object Tree */}
      <div className="flex-1 overflow-y-auto">
        {panes.map((pane: any) => {
          const paneObjects = getObjectsByPane(pane.id);
          const isExpanded = expandedPanes.has(pane.id);

          return (
            <div key={pane.id} className="border-b border-gray-700/50 last:border-b-0">
              {/* Pane Header */}
              <button
                onClick={() => togglePaneExpansion(pane.id)}
                className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-300">
                  {pane.type === 'price' ? 'Price Chart' : 'Indicators'}
                </span>
                <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded ml-auto">
                  {paneObjects.length}
                </span>
              </button>

              {/* Pane Objects */}
              {isExpanded && (
                <div className="pb-2">
                  {paneObjects.length === 0 ? (
                    <div className="px-8 py-4 text-xs text-gray-500 italic">No drawing objects</div>
                  ) : (
                    paneObjects
                      .sort((a: any, b: any) => b.properties.zIndex - a.properties.zIndex)
                      .map((object: any) => (
                        <div
                          key={object.id}
                          className={`mx-2 mb-1 rounded-md transition-colors ${
                            selectedObjectId === object.id
                              ? 'bg-blue-600/20 border border-blue-600/50'
                              : 'hover:bg-gray-700/50 border border-transparent'
                          }`}
                          onClick={() => handleObjectSelect(object.id)}
                          onContextMenu={(e: any) => handleContextMenu(e, object.id)}
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
                            <span className="flex-1 text-sm text-gray-300 truncate">
                              {object.properties.name}
                            </span>

                            {/* Object Controls */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  handleToggleVisibility(object.id, object.properties.visible);
                                }}
                                className="w-5 h-5 hover:bg-gray-600 rounded flex items-center justify-center"
                                title={object.properties.visible ? 'Hide' : 'Show'}
                              >
                                {object.properties.visible ? (
                                  <Eye className="w-3 h-3 text-gray-400" />
                                ) : (
                                  <EyeOff className="w-3 h-3 text-gray-500" />
                                )}
                              </button>

                              <button
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  handleToggleLock(object.id, object.properties.locked);
                                }}
                                className="w-5 h-5 hover:bg-gray-600 rounded flex items-center justify-center"
                                title={object.properties.locked ? 'Unlock' : 'Lock'}
                              >
                                {object.properties.locked ? (
                                  <Lock className="w-3 h-3 text-gray-400" />
                                ) : (
                                  <Unlock className="w-3 h-3 text-gray-500" />
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
          <div className="p-8 text-center text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No drawing objects yet</p>
            <p className="text-xs mt-1">Select a drawing tool to get started</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-2 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: 'translate(-100%, 0)',
          }}
        >
          <button
            onClick={() => handleDuplicate(contextMenu.objectId)}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>

          <div className="px-4 py-1">
            <div className="border-b border-gray-700"></div>
          </div>

          <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">
            Move to Pane
          </div>
          {panes.map((pane: any) => (
            <button
              key={pane.id}
              onClick={() => handleMoveToPane(contextMenu.objectId, pane.id)}
              className="w-full px-6 py-1 text-left text-sm text-gray-300 hover:bg-gray-700"
            >
              {pane.type === 'price' ? 'Price Chart' : 'Indicators'}
            </button>
          ))}

          <div className="px-4 py-1">
            <div className="border-b border-gray-700"></div>
          </div>

          <button
            onClick={() => handleDelete(contextMenu.objectId)}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

