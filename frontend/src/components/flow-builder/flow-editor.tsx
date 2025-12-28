"use client";

import { useState, useCallback } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  EdgeChange,
  NodeChange,
  BackgroundVariant,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  MessageSquare, 
  HelpCircle, 
  GitBranch, 
  Bot, 
  Tag,
  Save,
  X,
  Trash2,
} from 'lucide-react';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Inicio: Palabra Clave "Info"' },
    position: { x: 250, y: 0 },
    style: { background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' }
  },
  {
    id: '2',
    data: { label: 'Mensaje: Bienvenida Casa Arca' },
    position: { x: 250, y: 100 },
    style: { background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '8px', padding: '10px' }
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981' } },
];

export default function FlowEditor() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [flowName, setFlowName] = useState("Nuevo Flujo");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981' } }, eds)),
    [],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeLabel = (label: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, label } };
        }
        return node;
      })
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const addNode = (type: string) => {
    const id = Math.random().toString();
    const newNode: Node = {
      id,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `Nuevo ${type}` },
      style: { background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '8px', padding: '10px' }
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const flowData = {
            name: flowName,
            nodes,
            edges,
            trigger_keywords: ["info"], // Temporal, luego será configurable
            is_active: true
        };

        const res = await fetch(`${apiUrl}/flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(flowData)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error saving flow');
        }
        alert('Flujo guardado correctamente');
    } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        alert(`Error al guardar el flujo: ${message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-[80vh] w-full bg-black rounded-2xl border border-white/10 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 flex flex-col gap-2">
        <ToolButton icon={MessageSquare} label="Mensaje" onClick={() => addNode('Mensaje')} />
        <ToolButton icon={HelpCircle} label="Pregunta" onClick={() => addNode('Pregunta')} />
        <ToolButton icon={GitBranch} label="Condición" onClick={() => addNode('Condición')} />
        <ToolButton icon={Bot} label="IA Action" onClick={() => addNode('IA')} />
        <ToolButton icon={Tag} label="Etiqueta" onClick={() => addNode('Tag')} />
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <input 
            type="text" 
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-primary/50"
        />
        <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Guardando...' : 'Guardar Flujo'}
        </button>
      </div>

      {selectedNode && (
        <div className="absolute top-20 right-4 z-20 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl animate-in slide-in-from-right-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-sm">Editar Nodo</h3>
                <button onClick={() => setSelectedNodeId(null)} className="text-white/50 hover:text-white">
                    <X className="h-4 w-4" />
                </button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-white/50 block mb-1">Contenido / Etiqueta</label>
                    <textarea 
                        value={selectedNode.data.label as string}
                        onChange={(e) => updateNodeLabel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 h-32 resize-none"
                    />
                </div>

                <div className="pt-2 border-t border-white/10">
                    <button 
                        onClick={deleteSelectedNode}
                        className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Trash2 className="h-3 w-3" />
                        Eliminar Nodo
                    </button>
                </div>
            </div>
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        colorMode="dark"
      >
        <Background color="#333" gap={20} variant={BackgroundVariant.Dots} />
        <Controls className="bg-white/10 border-white/10 fill-white" />
        <Panel position="bottom-center" className="bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/5 text-xs text-white/50">
          Mabō Flow Engine v1.0
        </Panel>
      </ReactFlow>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick }: { icon: React.ElementType, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white w-32 group"
    >
      <div className="p-1.5 bg-white/5 rounded-md group-hover:bg-primary/20 group-hover:text-primary transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
