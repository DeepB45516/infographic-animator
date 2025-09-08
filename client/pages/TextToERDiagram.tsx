import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Database, Wand2, Download, Copy, RefreshCw, Lightbulb, Sparkles, Eye, Code, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// ER Diagram Types
interface ERAttribute {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

interface EREntity {
  id: string;
  name: string;
  attributes: ERAttribute[];
  x: number;
  y: number;
}

interface ERRelationship {
  id: string;
  fromEntity: string;
  toEntity: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  label?: string;
  x?: number;
  y?: number;
  attributes?: ERAttribute[];
}

/**
 * CleanERDiagram Component
 * Renders an interactive ER Diagram with clean design, proper line connections,
 * and drag-and-drop functionality for entities and relationships.
 */
const CleanERDiagram: React.FC<{
  entities: EREntity[];
  relationships: ERRelationship[];
  containerWidth?: number;
  containerHeight?: number;
}> = ({ entities, relationships, containerWidth = 900, containerHeight = 700 }) => {
  const [draggedItem, setDraggedItem] = useState<{id: string, type: 'entity' | 'relationship'} | null>(null);
  const [entityPositions, setEntityPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [relationshipPositions, setRelationshipPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Calculates optimal layout for entities and relationships with better spacing.
   * This effect runs when entities or relationships data changes.
   */
  useEffect(() => {
    if (entities.length === 0) return;

    const newEntityPositions: Record<string, { x: number, y: number }> = {};
    const newRelationshipPositions: Record<string, { x: number, y: number }> = {};
    
    // Implement a more sophisticated grid layout for entities
    const cols = Math.min(3, Math.ceil(Math.sqrt(entities.length)));
    const entitySpacingX = 520; // Increased horizontal spacing between entities
    const entitySpacingY = 420; // Increased vertical spacing between entities
    const startX = 100; // Starting X position for the grid
    const startY = 100; // Starting Y position for the grid
    
    entities.forEach((entity, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const entityX = startX + col * entitySpacingX;
      const entityY = startY + row * entitySpacingY;
      newEntityPositions[entity.id] = { x: entityX, y: entityY };
    });

    // Position relationships at midpoints with a slight offset for readability
    relationships.forEach((relationship) => {
      const fromPos = newEntityPositions[relationship.fromEntity];
      const toPos = newEntityPositions[relationship.toEntity];
      
      if (fromPos && toPos) {
        const midX = (fromPos.x + toPos.x) / 2 + 80; // Reduced offset X
        const midY = (fromPos.y + toPos.y) / 2 + 10;  // Reduced offset Y
        newRelationshipPositions[relationship.id] = { x: midX - 50, y: midY - 15 };
      }
    });

    setEntityPositions(newEntityPositions);
    setRelationshipPositions(newRelationshipPositions);
    
    // Automatically adjust view to fit all elements
    resetViewToFit(newEntityPositions, newRelationshipPositions);
  }, [entities, relationships, containerWidth, containerHeight]);

  /**
   * Resets the view (zoom and pan) to fit all entities and relationships within the container.
   * @param entPos Optional entity positions to use for calculation.
   * @param relPos Optional relationship positions to use for calculation.
   */
  const resetViewToFit = useCallback((entPos?: Record<string, { x: number, y: number }>, relPos?: Record<string, { x: number, y: number }>) => {
    const currentEntityPositions = entPos || entityPositions;
    const currentRelationshipPositions = relPos || relationshipPositions;
    
    if (Object.keys(currentEntityPositions).length === 0 && Object.keys(currentRelationshipPositions).length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Calculate bounds for entities, considering their dimensions and potential attribute spread
    Object.values(currentEntityPositions).forEach(pos => {
      minX = Math.min(minX, pos.x - 180); // Leftmost point considering attributes
      maxX = Math.max(maxX, pos.x + 320); // Rightmost point considering attributes
      minY = Math.min(minY, pos.y - 160); // Topmost point considering attributes
      maxY = Math.max(maxY, pos.y + 200); // Bottommost point considering attributes
    });

    // Calculate bounds for relationships, considering their diamond shape
    Object.values(currentRelationshipPositions).forEach(pos => {
      minX = Math.min(minX, pos.x - 50);  // Leftmost point of diamond
      maxX = Math.max(maxX, pos.x + 150); // Rightmost point of diamond
      minY = Math.min(minY, pos.y - 30);  // Topmost point of diamond
      maxY = Math.max(maxY, pos.y + 60);  // Bottommost point of diamond
    });

    const padding = 50; // Padding around the diagram
    const totalWidth = maxX - minX + padding * 2;
    const totalHeight = maxY - minY + padding * 2;

    const zoomX = containerWidth / totalWidth;
    const zoomY = containerHeight / totalHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 1); // Cap zoom at 100%

    setZoom(optimalZoom);
    
    // Center the diagram within the container
    const centerX = (containerWidth - totalWidth * optimalZoom) / 2 - minX * optimalZoom;
    const centerY = (containerHeight - totalHeight * optimalZoom) / 2 - minY * optimalZoom;
    setPan({ x: centerX, y: centerY });
  }, [entityPositions, relationshipPositions, containerWidth, containerHeight]);

  /**
   * Calculates the intersection point of a line segment with the boundary of an entity (rectangle) or relationship (diamond).
   * This ensures lines connect cleanly to the shapes.
   * @param fromX X-coordinate of the starting point.
   * @param fromY Y-coordinate of the starting point.
   * @param toX X-coordinate of the ending point.
   * @param toY Y-coordinate of the ending point.
   * @param isEntity True if connecting to an entity (rectangle), false if connecting to a relationship (diamond).
   * @returns An object with x and y coordinates of the connection point.
   */
  const getConnectionPoint = useCallback((fromX: number, fromY: number, toX: number, toY: number, isEntity: boolean = true) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: fromX, y: fromY }; // Avoid division by zero

    const unitX = dx / distance;
    const unitY = dy / distance;
    
    if (isEntity) {
      // Entity is a rectangle: 220px wide, 60px tall. Center is (110, 30) relative to its top-left.
      const halfWidth = 110;
      const halfHeight = 30;
      
      // Calculate intersection with rectangle boundaries
      // This is a simplified approach, for perfect intersection, more complex geometry is needed.
      // It approximates by finding the point on the line that is 't' distance from the center,
      // where 't' is the minimum distance to hit either the horizontal or vertical boundary.
      const t = Math.min(
        Math.abs(halfWidth / unitX),
        Math.abs(halfHeight / unitY)
      );
      
      return {
        x: fromX + unitX * t,
        y: fromY + unitY * t
      };
    } else {
      // Diamond is 100px wide, 30px tall. Center is (50, 15) relative to its top-left.
      const halfWidth = 50;
      const halfHeight = 15;
      
      // Similar approximation for diamond intersection
      const t = Math.min(
        Math.abs(halfWidth / unitX),
        Math.abs(halfHeight / unitY)
      );
      
      return {
        x: fromX + unitX * t,
        y: fromY + unitY * t
      };
    }
  }, []);

  /**
   * Handles mouse down event for dragging entities or relationships.
   * @param id The ID of the item being dragged.
   * @param type The type of the item ('entity' or 'relationship').
   * @param e The mouse event.
   */
  const handleMouseDown = useCallback((id: string, type: 'entity' | 'relationship', e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setDraggedItem({id, type});
      e.preventDefault();
      e.stopPropagation(); // Prevent pan from starting
    }
  }, []);

  /**
   * Handles mouse down event for starting pan.
   * @param e The mouse event.
   */
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !draggedItem) { // Left mouse button and no item is being dragged
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [draggedItem]);

  /**
   * Handles mouse move event for dragging items or panning the canvas.
   * @param e The mouse event.
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedItem && !isPanning) {
      const svg = svgRef.current;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      // Calculate new position relative to SVG canvas, accounting for current pan and zoom
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      if (draggedItem.type === 'entity') {
        // Adjust for entity's top-left corner (entity width is 220, height is 60)
        setEntityPositions(prev => ({
          ...prev,
          [draggedItem.id]: { x: x - 110, y: y - 30 } // Center the entity under the cursor
        }));
      } else if (draggedItem.type === 'relationship') {
        // Adjust for relationship's top-left corner (diamond width is 100, height is 30)
        setRelationshipPositions(prev => ({
          ...prev,
          [draggedItem.id]: { x: x - 50, y: y - 15 } // Center the diamond under the cursor
        }));
      }
    } else if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [draggedItem, isPanning, pan, zoom, lastPanPoint]);

  /**
   * Handles mouse up event, ending drag or pan operations.
   */
  const handleMouseUp = useCallback(() => {
    setDraggedItem(null);
    setIsPanning(false);
  }, []);

  /**
   * Handles mouse wheel event for zooming.
   * @param e The mouse wheel event.
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out if deltaY > 0, zoom in otherwise
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta)); // Clamp zoom between 0.1 and 3
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate mouse position relative to SVG canvas
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Adjust pan to zoom around the mouse cursor
      const zoomFactor = newZoom / zoom;
      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * zoomFactor,
        y: mouseY - (mouseY - prev.y) * zoomFactor
      }));
    }
    
    setZoom(newZoom);
  }, [zoom]);

  /**
   * Draws the attributes for a given entity as ovals with connection lines.
   * Attributes are arranged circularly around the entity.
   * @param entity The EREntity object.
   * @param pos The position of the entity.
   * @returns JSX.Element representing the attributes.
   */
  const drawCleanAttributes = useCallback((entity: EREntity, pos: { x: number; y: number }) => {
    const entityCenterX = pos.x + 110; // Center X of entity rectangle (220/2)
    const entityCenterY = pos.y + 30;  // Center Y of entity rectangle (60/2)
    const attributes = entity.attributes;
    
    if (attributes.length === 0) return null;
    
    return attributes.map((attr, index) => {
      // Calculate position for circular arrangement of attributes
      const angleStep = (2 * Math.PI) / attributes.length;
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const radius = 90; // Reduced distance from entity center to attribute center
      
      const attrX = entityCenterX + Math.cos(angle) * radius;
      const attrY = entityCenterY + Math.sin(angle) * radius;
      
      // Determine responsive oval size based on text length
      const textLength = Math.max(attr.name.length, attr.type.length + 2);
      const ovalWidth = Math.max(80, textLength * 7 + 20); // Minimum 80px, then scale with text
      const ovalHeight = 32;
      
      // Get precise connection points for the line between entity and attribute
      const entityEdge = getConnectionPoint(entityCenterX, entityCenterY, attrX, attrY, true);
      const attrEdge = getConnectionPoint(attrX, attrY, entityCenterX, entityCenterY, false); // Attribute is treated as a diamond for connection logic
      
      return (
        <g key={`${entity.id}-attr-${index}`}>
          {/* Connection line from entity to attribute */}
          <line
            x1={entityEdge.x}
            y1={entityEdge.y}
            x2={attrEdge.x}
            y2={attrEdge.y}
            stroke="#64748b" // Slate-500
            strokeWidth="1.5"
            opacity="0.7"
          />
          
          {/* Attribute oval shape */}
          <ellipse
            cx={attrX}
            cy={attrY}
            rx={ovalWidth / 2}
            ry={ovalHeight / 2}
            fill={attr.isPrimaryKey ? "#fef3c7" : "#ffffff"} // Light yellow for PK, white for others
            stroke={attr.isPrimaryKey ? "#f59e0b" : attr.isForeignKey ? "#ef4444" : "#6b7280"} // Orange for PK, red for FK, gray for others
            strokeWidth={attr.isPrimaryKey ? "2" : "1.5"}
            strokeDasharray={attr.isForeignKey && !attr.isPrimaryKey ? "4,2" : "0"} // Dashed for FK if not PK
            className="drop-shadow-sm hover:drop-shadow-md transition-all"
          />
          
          {/* Primary Key (PK) indicator */}
          {attr.isPrimaryKey && (
            <g>
              <circle
                cx={attrX - ovalWidth / 2 + 10} // Position PK circle on the left of the oval
                cy={attrY - 8}
                r="6"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="1"
              />
              <text
                x={attrX - ovalWidth / 2 + 10}
                y={attrY - 5}
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                PK
              </text>
            </g>
          )}
          
          {/* Foreign Key (FK) indicator (only if not also a PK) */}
          {attr.isForeignKey && !attr.isPrimaryKey && (
            <g>
              <rect
                x={attrX - ovalWidth / 2 + 4} // Position FK rectangle on the left of the oval
                y={attrY - 12}
                width="14"
                height="10"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1"
                rx="1"
              />
              <text
                x={attrX - ovalWidth / 2 + 11}
                y={attrY - 5}
                fill="#ffffff"
                fontSize="7"
                fontWeight="bold"
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                FK
              </text>
            </g>
          )}
          
          {/* Attribute name text */}
          <text
            x={attrX}
            y={attrY - 4}
            fill="#1f2937" // Dark gray
            fontSize="11"
            fontWeight={attr.isPrimaryKey ? "bold" : "600"}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none pointer-events-none"
          >
            {attr.name}
          </text>
          
          {/* Attribute type text */}
          <text
            x={attrX}
            y={attrY + 8}
            fill="#6b7280" // Medium gray
            fontSize="9"
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none pointer-events-none"
          >
            {attr.type}
          </text>
        </g>
      );
    });
  }, [getConnectionPoint]);

  /**
   * Draws a relationship as a diamond shape with connecting lines and cardinality labels.
   * @param rel The ERRelationship object.
   * @returns JSX.Element representing the relationship.
   */
  const drawCleanRelationship = useCallback((rel: ERRelationship) => {
    const fromEntity = entities.find(e => e.id === rel.fromEntity);
    const toEntity = entities.find(e => e.id === rel.toEntity);
    
    if (!fromEntity || !toEntity) return null; // Ensure both entities exist

    // Get current positions, falling back to initial if not yet set by drag
    const fromPos = entityPositions[rel.fromEntity] || { x: fromEntity.x, y: fromEntity.y };
    const toPos = entityPositions[rel.toEntity] || { x: toEntity.x, y: toEntity.y };
    const relPos = relationshipPositions[rel.id] || { 
      x: (fromPos.x + toPos.x) / 2 + 40, // Reduced offset for diamond
      y: (fromPos.y + toPos.y) / 2 + 5
    };
    
    // Calculate center points for entities and relationship diamond
    const fromCenterX = fromPos.x + 110;
    const fromCenterY = fromPos.y + 30;
    const toCenterX = toPos.x + 110;
    const toCenterY = toPos.y + 30;
    const relCenterX = relPos.x + 50;  // Diamond center (100/2)
    const relCenterY = relPos.y + 15;  // Diamond center (30/2)
    
    // Get precise connection points for lines from entities to diamond and vice-versa
    const fromToRel = getConnectionPoint(fromCenterX, fromCenterY, relCenterX, relCenterY, true); // Entity to diamond
    const relToFrom = getConnectionPoint(relCenterX, relCenterY, fromCenterX, fromCenterY, false); // Diamond to entity
    const toToRel = getConnectionPoint(toCenterX, toCenterY, relCenterX, relCenterY, true);     // Entity to diamond
    const relToTo = getConnectionPoint(relCenterX, relCenterY, toCenterX, toCenterY, false);     // Diamond to entity
    
    let cardinalityFrom = '';
    let cardinalityTo = '';
    
    // Determine cardinality labels based on relationship type
    switch (rel.type) {
      case 'one-to-one':
        cardinalityFrom = '1';
        cardinalityTo = '1';
        break;
      case 'one-to-many':
        cardinalityFrom = '1';
        cardinalityTo = 'M'; // Many
        break;
      case 'many-to-many':
        cardinalityFrom = 'M';
        cardinalityTo = 'N'; // Many
        break;
    }
    
    return (
      <g key={rel.id}>
        {/* Line from 'fromEntity' to the relationship diamond */}
        <line
          x1={fromToRel.x}
          y1={fromToRel.y}
          x2={relToFrom.x}
          y2={relToFrom.y}
          stroke="#4b5563" // Gray-700
          strokeWidth="2"
        />
        
        {/* Line from 'toEntity' to the relationship diamond */}
        <line
          x1={relToTo.x}
          y1={relToTo.y}
          x2={toToRel.x}
          y2={toToRel.y}
          stroke="#4b5563"
          strokeWidth="2"
        />
        
        {/* Relationship diamond shape */}
        <g
          transform={`translate(${relPos.x}, ${relPos.y})`}
          className="cursor-move group"
          onMouseDown={(e) => handleMouseDown(rel.id, 'relationship', e)}
        >
          <polygon
            points="50,0 100,15 50,30 0,15" // Diamond points (center at 50,15)
            fill="#ffffff" // White fill
            stroke="#3b82f6" // Blue-500 stroke
            strokeWidth="2"
            className="drop-shadow-xl group-hover:stroke-blue-600 group-hover:fill-blue-50 transition-colors"
          />
          {/* Relationship label text */}
          <text
            x="50"
            y="18"
            fill="#1e40af" // Dark blue
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none select-none"
          >
            {rel.label || 'relates'}
          </text>
        </g>
        
        {/* Cardinality label for 'fromEntity' side */}
        <text
          x={fromToRel.x + (relToFrom.x - fromToRel.x) * 0.25} // Position along the line
          y={fromToRel.y + (relToFrom.y - fromToRel.y) * 0.25 - 8}
          fill="#374151" // Gray-700
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          className="font-semibold"
        >
          {cardinalityFrom}
        </text>
        
        {/* Cardinality label for 'toEntity' side */}
        <text
          x={toToRel.x + (relToTo.x - toToRel.x) * 0.25} // Position along the line
          y={toToRel.y + (relToTo.y - toToRel.y) * 0.25 - 8}
          fill="#374151"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          className="font-semibold"
        >
          {cardinalityTo}
        </text>
      </g>
    );
  }, [entities, entityPositions, relationshipPositions, getConnectionPoint, handleMouseDown]);

  return (
    <div className="relative">
      {/* Control Panel for Zoom and Reset View */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2 bg-white/95 backdrop-blur-sm rounded-lg p-2 border border-gray-200 shadow-lg">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))} // Zoom in
          className="h-8 px-2"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))} // Zoom out
          className="h-8 px-2"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => resetViewToFit()} // Reset view to fit
          className="h-8 px-2"
          aria-label="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="px-2 py-1 text-xs text-gray-600 bg-gray-50 rounded border">
          {Math.round(zoom * 100)}% {/* Display current zoom level */}
        </div>
      </div>

      {/* SVG Canvas for ER Diagram */}
      <svg
        ref={svgRef}
        width={containerWidth}
        height={containerHeight}
        className="border-2 border-gray-200 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 cursor-grab active:cursor-grabbing shadow-inner"
        onMouseDown={handlePanStart}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // End pan/drag if mouse leaves SVG area
        onWheel={handleWheel}
        style={{ touchAction: 'none' }} // Disable default touch actions for better custom handling
        role="img"
        aria-label="Entity Relationship Diagram"
      >        
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Draw attribute ovals first so they appear behind entities */}
          {entities.map((entity) => {
            const pos = entityPositions[entity.id] || { x: entity.x, y: entity.y };
            return drawCleanAttributes(entity, pos);
          })}
          
          {/* Draw relationships (diamonds and lines) */}
          {relationships.map(drawCleanRelationship)}
          
          {/* Draw entities (rectangles) */}
          {entities.map((entity) => {
            const pos = entityPositions[entity.id] || { x: entity.x, y: entity.y };
            return (
              <g
                key={entity.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-move group"
                onMouseDown={(e) => handleMouseDown(entity.id, 'entity', e)}
                role="group"
                aria-label={`Entity: ${entity.name}`}
              >
                <rect
                  width="220"
                  height="60"
                  fill="#0f766e" // Teal-700
                  stroke="#134e4a" // Darker Teal
                  strokeWidth="2"
                  rx="8" // Rounded corners
                  className="drop-shadow-xl group-hover:stroke-blue-500 group-hover:fill-teal-600 transition-all"
                />
                
                <text
                  x="110" // Center of rectangle
                  y="38"  // Center of rectangle
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold pointer-events-none select-none"
                >
                  {entity.name.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Instructions Panel */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 border border-gray-200 text-sm text-gray-700 shadow-lg max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold text-gray-800 mb-2">Controls:</div>
          <div>• Drag entities and diamonds to rearrange</div>
          <div>• Mouse wheel to zoom in/out</div>
          <div>• Drag background to pan around</div>
          <div>• Use controls to reset view</div>
        </div>
      </div>
    </div>
  );
};

/**
 * MermaidERDiagram Component
 * Renders an ER Diagram using Mermaid.js syntax.
 */
const MermaidERDiagram: React.FC<{
  mermaidCode: string;
  width?: number;
  height?: number;
}> = ({ mermaidCode, width = 900, height = 700 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Load Mermaid.js script dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).mermaid) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.4.0/mermaid.min.js';
      script.onload = () => {
        // Initialize Mermaid with custom theme variables for a clean look
        (window as any).mermaid.initialize({
          startOnLoad: false, // Don't render on load, we'll call render manually
          theme: 'default',
          themeVariables: {
            primaryColor: '#0f766e', // Teal-700
            primaryTextColor: '#1e293b', // Slate-800
            primaryBorderColor: '#14b8a6', // Teal-500
            lineColor: '#64748b', // Slate-500
            sectionBkgColor: '#f1f5f9', // Slate-100
            altSectionBkgColor: '#e2e8f0', // Slate-200
            gridColor: '#cbd5e1', // Slate-300
            secondaryColor: '#ecfccb', // Lime-100
            tertiaryColor: '#fef3c7' // Amber-100
          }
        });
        setIsLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Mermaid.js script.");
        // Optionally, set an error state or display a message to the user
      };
      document.head.appendChild(script);
    } else if ((window as any).mermaid) {
      setIsLoaded(true); // Mermaid is already available
    }
  }, []);

  // Render Mermaid diagram when code or loaded state changes
  useEffect(() => {
    if (isLoaded && mermaidCode && containerRef.current) {
      const renderDiagram = async () => {
        try {
          containerRef.current!.innerHTML = ''; // Clear previous diagram
          // Generate unique ID for Mermaid render to prevent conflicts
          const { svg } = await (window as any).mermaid.render(`mermaid-${Date.now()}`, mermaidCode);
          containerRef.current!.innerHTML = svg; // Insert rendered SVG
        } catch (error) {
          console.error('Error rendering Mermaid diagram:', error);
          containerRef.current!.innerHTML = '<div class="text-red-500 p-4">Error rendering diagram. Please check your Mermaid syntax.</div>';
        }
      };
      renderDiagram();
    }
  }, [isLoaded, mermaidCode]);

  return (
    <div
      className="border-2 border-gray-200 rounded-xl bg-white overflow-auto shadow-inner"
      style={{ width, height }}
      role="img"
      aria-label="Mermaid ER Diagram"
    >
      <div ref={containerRef} className="flex items-center justify-center min-h-full">
        {!isLoaded && (
          <div className="text-gray-600">Loading diagram...</div>
        )}
      </div>
    </div>
  );
};

/**
 * EnhancedCleanERDiagram Component
 * Main component for the ER Diagram Generator application.
 * Handles user input, parsing, diagram generation, and display.
 */
export default function EnhancedCleanERDiagram() {
  const [inputText, setInputText] = useState('');
  const [entities, setEntities] = useState<EREntity[]>([]);
  const [relationships, setRelationships] = useState<ERRelationship[]>([]);
  const [mermaidCode, setMermaidCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'mermaid' | 'code'>('visual');

  // Predefined example prompts for user convenience
  const examplePrompts = [
    {
      title: "University System",
      description: "Students, courses, instructors with enrollment relationships",
      text: "Create a university ER diagram with:\n- Students table (student_id, name, email, major, enrollment_date)\n- Courses table (course_id, title, credits, department)\n- Instructors table (instructor_id, name, department, hire_date)\n- Enrollments table (enrollment_id, student_id, course_id, grade, semester)\n- Departments table (dept_id, name, budget, head_id)\n\nRelationships:\n- Students enroll in Courses (many-to-many relationship called 'Enrollment')\n- Instructors teach Courses (one-to-many relationship called 'Teaches')\n- Departments have Instructors (one-to-many relationship called 'Employs')\n- Departments offer Courses (one-to-many relationship called 'Offers')"
    },
    {
      title: "Hospital Management",
      description: "Patients, doctors, appointments with treatment relationships",
      text: "Design a hospital database with:\n- Patients table (patient_id, name, phone, address, birth_date)\n- Doctors table (doctor_id, name, specialization, phone, hire_date)\n- Appointments table (appointment_id, patient_id, doctor_id, date, time, status)\n- Treatments table (treatment_id, patient_id, doctor_id, diagnosis, prescription, date)\n- Departments table (dept_id, name, location, head_doctor_id)\n\nRelationships:\n- Patients schedule Appointments with Doctors (many-to-many relationship called 'Schedules')\n- Doctors provide Treatments to Patients (many-to-many relationship called 'Provides')\n- Doctors work in Departments (many-to-one relationship called 'Works_In')"
    },
    {
      title: "E-commerce Platform",
      description: "Customers, products, orders with purchase relationships",
      text: "Create an e-commerce ER diagram with:\n- Customers table (customer_id, name, email, address, registration_date)\n- Products table (product_id, name, description, price, stock_quantity)\n- Orders table (order_id, customer_id, total_amount, order_date, status)\n- Order_Items table (item_id, order_id, product_id, quantity, unit_price)\n- Categories table (category_id, name, description)\n- Reviews table (review_id, customer_id, product_id, rating, comment)\n\nRelationships:\n- Customers place Orders (one-to-many relationship called 'Places')\n- Orders contain Products (many-to-many relationship called 'Contains' via Order_Items)\n- Customers write Reviews for Products (many-to-many relationship called 'Reviews')\n- Products belong to Categories (many-to-one relationship called 'Belongs_To')"
    }
  ];

  /**
   * Parses the input text description into ER Diagram entities and relationships.
   * It also generates the corresponding Mermaid.js code.
   * @param text The input text describing the database schema.
   * @returns An object containing parsed entities, relationships, and Mermaid code.
   */
  const parseTextToER = useCallback((text: string): { entities: EREntity[], relationships: ERRelationship[], mermaidCode: string } => {
    const lines = text.toLowerCase().split('\n').filter(line => line.trim());
    const entityMap: { [key: string]: EREntity } = {};
    const relationshipList: ERRelationship[] = [];
    let currentEntityName = '';

    // --- Phase 1: Parse entities and their attributes ---
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Regex to detect table definitions like "Students table (student_id, name, email)"
      const tableMatch = trimmedLine.match(/(\w+)\s*table\s*(?:\((.*)\))?/);
      if (tableMatch) {
        currentEntityName = tableMatch[1].toLowerCase();
        
        entityMap[currentEntityName] = {
          id: currentEntityName,
          name: tableMatch[1].toUpperCase().replace(/_/g, ' '), // Capitalize and replace underscores for display
          attributes: [],
          x: 0, // Initial positions, will be calculated by CleanERDiagram
          y: 0
        };
        
        // Extract attributes from the parentheses if present
        const attributeString = tableMatch[2];
        if (attributeString) {
          const attrs = attributeString.split(',').map(attr => attr.trim());
          attrs.forEach(attr => {
            if (attr) {
              let attrType = 'string'; // Default type
              // Infer attribute type based on common naming conventions
              if (attr.includes('id')) attrType = 'int';
              else if (attr.includes('date') || attr.includes('time')) attrType = 'date';
              else if (attr.includes('price') || attr.includes('amount') || attr.includes('budget')) attrType = 'decimal';
              else if (attr.includes('count') || attr.includes('quantity') || attr.includes('stock') || attr.includes('rating')) attrType = 'int';
              else if (attr.includes('email')) attrType = 'varchar(255)';
              else if (attr.includes('phone')) attrType = 'varchar(20)';
              else if (attr.includes('address')) attrType = 'text';
              else if (attr.includes('status')) attrType = 'enum';
              
              // Determine if it's a primary key (ends with 'id' but not '_id')
              const isKey = attr.endsWith('id') && !attr.includes('_id');
              // Determine if it's a foreign key (contains '_id' and is not just 'id')
              const isForeignKey = attr.includes('_id') && attr !== 'id';
              
              entityMap[currentEntityName].attributes.push({
                name: attr.replace(/ /g, '_'), // Replace spaces with underscores for consistency
                type: attrType,
                isPrimaryKey: isKey,
                isForeignKey: isForeignKey
              });
            }
          });
        }
      }
    });

    // --- Phase 2: Parse relationships ---
    const entityNames = Object.keys(entityMap);
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Priority 1: Look for explicit relationship descriptions with cardinality and label
      // Example: "Students enroll in Courses (many-to-many relationship called 'Enrollment')"
      const explicitRelationshipMatch = trimmedLine.match(/(\w+)\s+(?:enrolls in|teach|schedule|provide|work in|offer|place|contain|write|belong to)\s+(\w+)\s+\((\w+)-to-(\w+)\s+relationship\s+called\s+'([^']+)'\)/);
      if (explicitRelationshipMatch) {
        const [, entity1Name, entity2Name, cardinality1, cardinality2, relationshipLabel] = explicitRelationshipMatch;
        const fromEntity = entity1Name.toLowerCase();
        const toEntity = entity2Name.toLowerCase();

        if (entityMap[fromEntity] && entityMap[toEntity]) {
          let type: 'one-to-one' | 'one-to-many' | 'many-to-many' = 'one-to-many';
          if (cardinality1 === 'many' && cardinality2 === 'many') {
            type = 'many-to-many';
          } else if (cardinality1 === 'one' && cardinality2 === 'one') {
            type = 'one-to-one';
          }
          
          // Add relationship if it doesn't already exist (to avoid duplicates from different parsing methods)
          const existingRel = relationshipList.find(r => 
            (r.fromEntity === fromEntity && r.toEntity === toEntity) ||
            (r.fromEntity === toEntity && r.toEntity === fromEntity && r.type === type) // Consider symmetric relationships
          );
          
          if (!existingRel) {
            relationshipList.push({
              id: `${fromEntity}-${toEntity}-${relationshipLabel.replace(/ /g, '_')}`,
              fromEntity: fromEntity,
              toEntity: toEntity,
              type: type,
              label: relationshipLabel.replace(/_/g, ' '),
              attributes: [] // Relationships can have attributes in some ER models, but not parsed here
            });
          }
        }
      }
      // Priority 2: Fallback to implicit relationship detection based on keywords
      else {
        // Keywords indicating relationships
        const relationshipKeywords = ['have', 'belong', 'can', 'many-to-many', 'one-to-many', 'place',
                                      'contain', 'write', 'schedule', 'provide', 'work', 'teach',
                                      'enroll', 'offer', 'employs', 'offers', 'schedules', 'provides', 'works_in'];
        
        const foundKeyword = relationshipKeywords.some(keyword => trimmedLine.includes(keyword));

        if (foundKeyword) {
          entityNames.forEach(entity1 => {
            entityNames.forEach(entity2 => {
              // Ensure both entities are mentioned in the line and are distinct
              if (entity1 !== entity2 && trimmedLine.includes(entity1) && trimmedLine.includes(entity2)) {
                let type: 'one-to-one' | 'one-to-many' | 'many-to-many' = 'one-to-many'; // Default
                let label = 'relates to'; // Default label
                
                // Infer relationship type and label based on keywords
                if (trimmedLine.includes('many-to-many')) {
                  type = 'many-to-many';
                  label = 'relates to';
                } else if (trimmedLine.includes('one-to-many') || trimmedLine.includes('have many') || trimmedLine.includes('has many')) {
                  type = 'one-to-many';
                  label = 'has';
                } else if (trimmedLine.includes('one-to-one')) {
                  type = 'one-to-one';
                  label = 'is related to';
                }
                
                // More specific labels based on verbs
                if (trimmedLine.includes('enroll')) {
                  type = 'many-to-many'; // Enrollment is typically M:N
                  label = 'enrolls in';
                } else if (trimmedLine.includes('teach')) {
                  type = 'one-to-many'; // Instructor teaches many courses
                  label = 'teaches';
                } else if (trimmedLine.includes('place')) {
                  type = 'one-to-many'; // Customer places many orders
                  label = 'places';
                } else if (trimmedLine.includes('contain')) {
                  type = 'many-to-many'; // Order contains many products, product in many orders
                  label = 'contains';
                } else if (trimmedLine.includes('write')) {
                  type = 'many-to-many'; // Customer writes many reviews, product has many reviews
                  label = 'writes';
                } else if (trimmedLine.includes('schedule')) {
                  type = 'many-to-many'; // Patient schedules many appointments, doctor has many appointments
                  label = 'schedules';
                } else if (trimmedLine.includes('provide')) {
                  type = 'many-to-many'; // Doctor provides many treatments, patient receives many treatments
                  label = 'provides';
                } else if (trimmedLine.includes('work')) {
                  type = 'many-to-one'; // Doctor works in one department, department has many doctors
                  label = 'works in';
                } else if (trimmedLine.includes('offer')) {
                  type = 'one-to-many'; // Department offers many courses
                  label = 'offers';
                } else if (trimmedLine.includes('employs')) {
                  type = 'one-to-many'; // Department employs many instructors
                  label = 'employs';
                } else if (trimmedLine.includes('belongs_to') || trimmedLine.includes('belong to')) {
                  type = 'many-to-one'; // Product belongs to one category, category has many products
                  label = 'belongs to';
                }

                // Prevent adding duplicate relationships
                const existingRel = relationshipList.find(r => 
                  (r.fromEntity === entity1 && r.toEntity === entity2 && r.type === type) ||
                  (r.fromEntity === entity2 && r.toEntity === entity1 && r.type === type)
                );
                
                if (!existingRel) {
                  relationshipList.push({
                    id: `${entity1}-${entity2}-${index}`, // Unique ID for relationship
                    fromEntity: entity1,
                    toEntity: entity2,
                    type: type,
                    label: label,
                    attributes: []
                  });
                }
              }
            });
          });
        }
      }
    });

    // --- Phase 3: Infer relationships from foreign key patterns (if no explicit relationships found) ---
    // This is a fallback mechanism to ensure some relationships are detected.
    if (relationshipList.length === 0) {
      Object.values(entityMap).forEach(entity => {
        entity.attributes.forEach(attr => {
          // Check for attributes ending with '_id' but not being 'id' itself (e.g., 'student_id' in 'Enrollments')
          if (attr.name.endsWith('_id') && attr.name !== 'id') {
            const foreignEntityName = attr.name.replace('_id', '').trim(); // Extract potential foreign entity name
            // Check if an entity with that name exists
            if (entityMap[foreignEntityName]) {
              // Infer a one-to-many relationship: foreignEntity (one) -> entity (many)
              // Example: Department (one) has many Employees (many, via dept_id in Employee)
              relationshipList.push({
                id: `${foreignEntityName}-${entity.id}-fk-infer`,
                fromEntity: foreignEntityName,
                toEntity: entity.id,
                type: 'one-to-many',
                label: 'has', // Generic label for inferred FK relationships
                attributes: []
              });
            }
          }
        });
      });
    }

    // --- Phase 4: Generate Mermaid ER diagram syntax ---
    let mermaidER = 'erDiagram\n';
    
    // Add entities with their attributes to Mermaid syntax
    Object.values(entityMap).forEach(entity => {
      const capitalizedEntity = entity.name.toUpperCase().replace(/ /g, '-'); // Mermaid entity names are often capitalized and hyphenated
      mermaidER += `    ${capitalizedEntity} {\n`;
      
      entity.attributes.forEach(attr => {
        const keyType = attr.isPrimaryKey ? 'PK' : attr.isForeignKey ? 'FK' : '';
        mermaidER += `        ${attr.type} ${attr.name} ${keyType ? `"${keyType}"` : ''}\n`; // Add quotes around PK/FK for Mermaid
      });
      
      mermaidER += '    }\n\n';
    });

    // Add relationships with proper Mermaid cardinality notation
    relationshipList.forEach(rel => {
      const e1Upper = entityMap[rel.fromEntity]?.name.toUpperCase().replace(/ /g, '-');
      const e2Upper = entityMap[rel.toEntity]?.name.toUpperCase().replace(/ /g, '-');
      
      if (e1Upper && e2Upper) {
        let mermaidRelation = '';
        // Mermaid cardinality symbols:
        // ||--|| : One-to-one
        // ||--o{ : One-to-many (one side is '||', many side is 'o{')
        // }o--o{ : Many-to-many
        switch (rel.type) {
          case 'one-to-one':
            mermaidRelation = `    ${e1Upper} ||--|| ${e2Upper} : "${rel.label}"\n`;
            break;
          case 'one-to-many':
            // Assuming fromEntity is the 'one' side and toEntity is the 'many' side
            mermaidRelation = `    ${e1Upper} ||--o{ ${e2Upper} : "${rel.label}"\n`;
            break;
          case 'many-to-many':
            mermaidRelation = `    ${e1Upper} }o--o{ ${e2Upper} : "${rel.label}"\n`;
            break;
        }
        mermaidER += mermaidRelation;
      }
    });

    return { 
      entities: Object.values(entityMap), 
      relationships: relationshipList, 
      mermaidCode: mermaidER 
    };
  }, []);

  /**
   * Initiates the ER Diagram generation process.
   * Sets loading state, calls parsing, and updates state with results.
   */
  const generateERDiagram = async () => {
    if (!inputText.trim()) {
      // Optionally, show a toast or alert if input is empty
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate AI processing time for a better user experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = parseTextToER(inputText);
      setEntities(result.entities);
      setRelationships(result.relationships);
      setMermaidCode(result.mermaidCode);
      setViewMode('visual'); // Switch to visual mode after generation
    } catch (error) {
      console.error('Failed to generate ER diagram:', error);
      // Display an error message to the user
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Copies the generated Mermaid code to the clipboard.
   */
  const copyToClipboard = useCallback(() => {
    if (mermaidCode) {
      navigator.clipboard.writeText(mermaidCode)
        .then(() => console.log('Mermaid code copied to clipboard!'))
        .catch(err => console.error('Failed to copy Mermaid code:', err));
    }
  }, [mermaidCode]);

  /**
   * Downloads the generated Mermaid code as a .mmd file.
   */
  const downloadMermaid = useCallback(() => {
    if (mermaidCode) {
      const blob = new Blob([mermaidCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'er-diagram.mmd';
      document.body.appendChild(a); // Required for Firefox
      a.click();
      document.body.removeChild(a); // Clean up
      URL.revokeObjectURL(url);
    }
  }, [mermaidCode]);

  /**
   * Downloads the visual ER Diagram as an SVG file.
   */
  const downloadSVG = useCallback(() => {
    const svgElement = document.querySelector('#er-diagram-container svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'er-diagram.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      console.warn('SVG element not found for download.');
    }
  }, []);

  /**
   * Loads an example prompt into the input text area.
   * @param example The example prompt object.
   */
  const loadExample = useCallback((example: typeof examplePrompts[0]) => {
    setInputText(example.text);
  }, []);

  /**
   * Clears all input and generated diagram data.
   */
  const clearAll = useCallback(() => {
    setInputText('');
    setEntities([]);
    setRelationships([]);
    setMermaidCode('');
    setViewMode('visual'); // Reset view mode
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-100">
      {/* Header Section */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Back to Dashboard Button (placeholder) */}
              <button className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors" aria-label="Back to Dashboard">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              {/* Application Title */}
              <div className="flex items-center space-x-2">
                <Database className="h-6 w-6 text-teal-600" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Clean ER Diagram Generator
                </h1>
              </div>
            </div>
            {/* Clear All Button */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={clearAll} aria-label="Clear All">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Hero Section - Application Description */}
        <section className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Clean Design with Perfect Line Connections</span>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Professional ER Diagrams with Clean Layout
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Generate clean, professional Entity-Relationship diagrams with proper line connections, 
            diamond relationships, and precise attribute positioning.
          </p>
        </section>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section - Database Description */}
          <section className="space-y-6">
            <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-teal-600" />
                  <span>Database Description</span>
                </CardTitle>
                <CardDescription>
                  Describe your database structure with tables and relationships
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Example:&#10;Create a university system with:&#10;- Students table (student_id, name, email, major)&#10;- Courses table (course_id, title, credits, department)&#10;- Instructors table (instructor_id, name, department)&#10;&#10;Relationships:&#10;- Students enroll in Courses (many-to-many relationship called 'Enrollment')&#10;- Instructors teach Courses (one-to-many relationship called 'Teaches')"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[300px] resize-none"
                  aria-label="Database Description Input"
                />
                <Button 
                  onClick={generateERDiagram}
                  disabled={isGenerating || !inputText.trim()}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                  size="lg"
                  aria-label="Generate ER Diagram"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Clean ER Diagram...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate ER Diagram
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Example Prompts Section */}
            <Card className="border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <span>Example Templates</span>
                </CardTitle>
                <CardDescription>
                  Click any example to load it into the text area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {examplePrompts.map((example, index) => (
                    <div 
                      key={index}
                      onClick={() => loadExample(example)}
                      className="p-4 bg-white/80 rounded-lg border border-slate-200 cursor-pointer hover:bg-white transition-colors group"
                      role="button"
                      tabIndex={0}
                      aria-label={`Load example: ${example.title}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadExample(example); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">
                            {example.title}
                          </h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {example.description}
                          </p>
                        </div>
                        <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-teal-600 rotate-180 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Output Section - ER Diagram Display */}
          <section className="space-y-6">
            <Card className="border-0 bg-white/60 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-emerald-600" />
                      <span>Clean ER Diagram</span>
                    </CardTitle>
                    <CardDescription>
                      Professional diagram with perfect line connections
                    </CardDescription>
                  </div>
                  {(entities.length > 0 || mermaidCode) && (
                    <div className="flex space-x-2">
                      {/* View Mode Selector */}
                      <div className="flex bg-slate-100 rounded-lg p-1" role="tablist">
                        <Button
                          variant={viewMode === 'visual' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('visual')}
                          className="h-8 px-3"
                          role="tab"
                          aria-selected={viewMode === 'visual'}
                          aria-controls="visual-diagram-panel"
                          id="visual-diagram-tab"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visual
                        </Button>
                        <Button
                          variant={viewMode === 'mermaid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('mermaid')}
                          className="h-8 px-3"
                          role="tab"
                          aria-selected={viewMode === 'mermaid'}
                          aria-controls="mermaid-diagram-panel"
                          id="mermaid-diagram-tab"
                        >
                          <Database className="h-4 w-4 mr-1" />
                          Mermaid
                        </Button>
                        <Button
                          variant={viewMode === 'code' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('code')}
                          className="h-8 px-3"
                          role="tab"
                          aria-selected={viewMode === 'code'}
                          aria-controls="code-panel"
                          id="code-tab"
                        >
                          <Code className="h-4 w-4 mr-1" />
                          Code
                        </Button>
                      </div>
                      
                      {/* Action Buttons */}
                      <Button variant="outline" size="sm" onClick={copyToClipboard} aria-label="Copy Mermaid Code">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={viewMode === 'visual' ? downloadSVG : downloadMermaid}
                        aria-label={viewMode === 'visual' ? 'Download SVG' : 'Download Mermaid File'}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {entities.length > 0 || mermaidCode ? (
                  <div className="space-y-4">
                    {viewMode === 'visual' && entities.length > 0 && (
                      <div id="er-diagram-container" role="tabpanel" aria-labelledby="visual-diagram-tab">
                        <CleanERDiagram 
                          entities={entities} 
                          relationships={relationships}
                          containerWidth={900}
                          containerHeight={700}
                        />
                      </div>
                    )}
                    
                    {viewMode === 'mermaid' && mermaidCode && (
                      <div role="tabpanel" aria-labelledby="mermaid-diagram-tab">
                        <MermaidERDiagram 
                          mermaidCode={mermaidCode}
                          width={900}
                          height={700}
                        />
                      </div>
                    )}
                    
                    {viewMode === 'code' && mermaidCode && (
                      <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96" role="tabpanel" aria-labelledby="code-tab">
                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                          {mermaidCode}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-r from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Database className="h-12 w-12 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">No ER Diagram Generated</h3>
                    <p className="text-slate-500 mb-4">
                      Enter your database description to see the clean visualization
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-2">Clean Design Features</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>🎯 <strong>Perfect Line Connections:</strong> Proper edge-to-edge connections</li>
                      <li>💎 <strong>Diamond Relationships:</strong> Traditional ER modeling standards</li>
                      <li>🎨 <strong>Clean Layout:</strong> Optimized spacing and visual hierarchy</li>
                      <li>🖱️ <strong>Interactive Controls:</strong> Drag, zoom, and pan functionality</li>
                      <li>📐 <strong>Precise Positioning:</strong> Mathematically calculated connections</li>
                      <li>✨ <strong>Professional Design:</strong> Clean typography and modern styling</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

