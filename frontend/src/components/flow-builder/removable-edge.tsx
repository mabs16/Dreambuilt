import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style = {},
  markerEnd,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    console.log('Eliminando edge:', id);
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <g className="button-edge group" style={{ cursor: 'pointer' }}>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? 4 : 3,
          stroke: selected ? '#ef4444' : (style.stroke || '#10b981'),
          transition: 'all 0.2s',
        }} 
      />
      {/* Invisible wider path to make hovering easier */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={30}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
        onClick={onEdgeClick}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            zIndex: 1000,
          }}
          className={cn(
            "nodrag nopan transition-all duration-200",
            selected ? "opacity-100 scale-125" : "opacity-0 group-hover:opacity-100 scale-100"
          )}
        >
          <button
            className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] border-2 border-white hover:bg-red-700 hover:scale-110 active:scale-90"
            onClick={onEdgeClick}
            onMouseDown={(e) => e.stopPropagation()}
            title="Eliminar conexión"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}
