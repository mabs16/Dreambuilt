import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from "@/lib/utils";

import { 
  Image as ImageIcon,
  FileText
} from 'lucide-react';

const CustomNode = ({ data }: NodeProps) => {
  const buttons = (data.buttons as Array<{ id: string; text: string }>) || [];
  const label = (data.label as string) || '';
  const mediaUrl = data.mediaUrl as string | undefined;
  const mediaType = data.mediaType as 'image' | 'document' | undefined;
  const isIA = data.type === 'IA' || label.startsWith('🤖');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: '40px' }}>
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

      {/* Node Content */}
      <div 
        className={cn(
          "node-content text-[11px] leading-relaxed",
          "max-h-[160px] overflow-hidden relative"
        )}
      >
         {label.split('\n').map((line, i) => (
            <div key={i} style={{ minHeight: '1.2em' }}>{line}</div>
         ))}
         
         {label.length > 150 && (
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

      {/* Default Output Handle - Only if NO buttons, or as a fallback? 
          ManyChat usually removes the default output if buttons are present, 
          forcing the user to choose a path. 
          However, for "Next Step" logic without buttons, we need it.
          Let's keep it if no buttons are present.
      */}
      {buttons.length === 0 && (
        <Handle 
            type="source" 
            position={Position.Bottom} 
            style={{ 
                background: '#fff',
                width: '10px',
                height: '10px',
            }} 
        />
      )}
    </div>
  );
};

export default memo(CustomNode);
