import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const CustomNode = ({ data }: NodeProps) => {
  const buttons = (data.buttons as Array<{ id: string; text: string }>) || [];
  const label = (data.label as string) || '';
  // Determine handles position based on layout preference? 
  // For now, let's stick to standard flow: Input Top, Output Bottom (default), Buttons Right.

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

      {/* Node Content */}
      <div className="node-content">
         {label.split('\n').map((line, i) => (
            <div key={i} style={{ minHeight: '1em' }}>{line}</div>
         ))}
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
