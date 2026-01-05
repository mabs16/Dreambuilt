import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { cn } from "@/lib/utils";

import { 
  Image as ImageIcon,
  FileText,
  Copy,
  Trash2
} from 'lucide-react';

  const CustomNode = ({ id, data, selected }: NodeProps) => {
  const buttons = (data.buttons as Array<{ id: string; text: string }>) || [];
  const rawLabel = (data.label as string) || '';
  const nodeType = data.type as string || '';
  const mediaUrl = data.mediaUrl as string | undefined;
  const mediaType = data.mediaType as 'image' | 'document' | undefined;
  const autoContinue = data.autoContinue as boolean | undefined;
  
  // List of system prefixes to clean from the label for display
  const SYSTEM_PREFIXES = [
    "💬 Enviar Mensaje:\n",
    "❓ Pregunta:\n",
    "⚡ Condición:\n",
    "🤖 Acción IA:\n",
    "🏷️ Etiqueta:\n",
    "📊 Pipeline:\n",
    "👤 Asignación:\n",
    "👤 Solicitar Nombre:\n",
    "📧 Solicitar Email:\n",
    "⏳ Espera:\n"
  ];

  // Clean label for display
  let displayLabel = rawLabel;
  const foundPrefix = SYSTEM_PREFIXES.find(p => rawLabel.startsWith(p));
  if (foundPrefix) {
    displayLabel = rawLabel.replace(foundPrefix, "");
  }

  const isIA = nodeType === 'IA' || nodeType === 'IA Action' || rawLabel.startsWith('🤖');

  // Determine header icon and text based on type
  const getHeader = () => {
    switch(nodeType) {
      case 'Mensaje': return { icon: '💬', text: 'Mensaje' };
      case 'Pregunta': return { icon: '❓', text: 'Pregunta' };
      case 'Condición': return { icon: '⚡', text: 'Condición' };
      case 'IA':
      case 'IA Action': return { icon: '🤖', text: 'IA Action' };
      case 'Tag': return { icon: '🏷️', text: 'Etiqueta' };
      case 'Pipeline': return { icon: '📊', text: 'Pipeline' };
      case 'Asignación': return { icon: '👤', text: 'Asignación' };
      case 'CapturaNombre': return { icon: '👤', text: 'Nombre' };
      case 'CapturaEmail': return { icon: '📧', text: 'Email' };
      case 'Espera': return { icon: '⏳', text: 'Espera' };
      case 'ConectarFlujo': return { icon: '🔗', text: 'Saltar a Flujo' };
      default: return null;
    }
  };

  const header = getHeader();

  const onDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('duplicate-node', { detail: { nodeId: id } }));
  };

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('delete-node', { detail: { nodeId: id } }));
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: '40px' }}>
      <NodeToolbar 
        isVisible={selected} 
        position={Position.Top}
        className="flex gap-1 bg-gray-900 border border-white/20 rounded-lg p-1 shadow-xl"
      >
        <button 
          onClick={onDuplicate}
          className="p-1.5 hover:bg-white/10 rounded text-primary transition-colors"
          title="Duplicar nodo"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1.5 hover:bg-red-500/20 rounded text-red-500 transition-colors"
          title="Eliminar nodo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </NodeToolbar>

      {/* Input Handle - Always present */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ 
            background: '#fff',
            width: '10px',
            height: '10px',
        }} 
      />

      {/* Media Thumbnail */}
      {mediaUrl && (
        <div className="mb-2 rounded-md overflow-hidden bg-black/20 border border-white/10 relative group">
          {mediaType === 'image' ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={mediaUrl} 
              alt="Media" 
              className="w-full h-24 object-cover"
            />
          ) : (
            <div className="w-full h-12 flex items-center justify-center gap-2 bg-white/5">
              <FileText className="h-5 w-5 text-white/70" />
              <span className="text-[10px] text-white/70 truncate max-w-[120px]">Documento PDF</span>
            </div>
          )}
          <div className="absolute top-1 right-1 bg-black/50 p-1 rounded-full backdrop-blur-sm">
            {mediaType === 'image' ? (
              <ImageIcon className="h-3 w-3 text-white" />
            ) : (
              <FileText className="h-3 w-3 text-white" />
            )}
          </div>
        </div>
      )}

      {/* Header */}
      {header && (
        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/5 opacity-60">
          <span className="text-[10px]">{header.icon}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">{header.text}</span>
        </div>
      )}

      {/* Node Content */}
      <div 
        className={cn(
          "node-content text-[11px] leading-relaxed",
          "max-h-[160px] overflow-hidden relative",
          !displayLabel && "italic opacity-40"
        )}
      >
         {displayLabel ? displayLabel.split('\n').map((line, i) => (
            <div key={i} style={{ minHeight: '1.2em' }}>{line}</div>
         )) : (
           <div className="text-center py-2">Sin contenido</div>
         )}
         
         {displayLabel.length > 150 && (
           <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex items-end justify-center pb-1">
             <div className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
               {isIA ? '⚡ Prompt IA Completo en Editor' : 'Ver más en Editor'}
             </div>
           </div>
         )}
      </div>

      {/* Buttons Section */}
      {buttons.length > 0 && (
        <div style={{ 
            marginTop: '12px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '8px'
        }}>
          {buttons.map((btn, index) => (
            <div key={index} style={{ 
                position: 'relative', 
                background: 'rgba(255,255,255,0.1)', 
                padding: '6px 10px', 
                borderRadius: '6px',
                fontSize: '11px',
                textAlign: 'center',
                cursor: 'default',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {btn.text}
              {/* Handle for this specific button */}
              <Handle
                type="source"
                position={Position.Right}
                id={`btn-${btn.id || index}`} // Using ID for stability
                style={{ 
                    background: '#10b981', 
                    right: '-6px',
                    width: '8px',
                    height: '8px',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Default Output Handle 
          - For regular nodes: only if NO buttons
          - For Condition nodes: ALWAYS (as the "True" path)
          - For Auto-Continue: ALWAYS (as the automatic path)
      */}
      {(buttons.length === 0 || nodeType === 'Condición' || rawLabel.startsWith('⚡') || autoContinue) && (
        <Handle 
            type="source" 
            position={Position.Bottom} 
            id="main"
            className="w-3 h-3 border-2 border-white shadow-sm"
            style={{ 
                background: (nodeType === 'Condición' || rawLabel.startsWith('⚡')) ? '#10b981' : (autoContinue ? '#3b82f6' : '#fff'),
                bottom: '-6px',
                zIndex: 50
            }} 
        />
      )}
      
      {/* Auto-Continue Label Indicator */}
      {autoContinue && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] text-blue-400 font-bold uppercase tracking-tighter whitespace-nowrap bg-blue-400/10 px-1 rounded border border-blue-400/20 pointer-events-none z-0">
          Auto-Continuar
        </div>
      )}
    </div>
  );
};

export default memo(CustomNode);
