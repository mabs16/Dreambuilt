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
import { cn } from "@/lib/utils";
import { 
  MessageSquare, 
  HelpCircle, 
  GitBranch, 
  Bot, 
  Tag,
  Save,
  X,
  Trash2,
  PlusCircle,
  MinusCircle,
  Upload,
  Image as ImageIcon,
  FileText,
  BarChart3,
  UserPlus
} from 'lucide-react';
import CustomNode from './custom-node';

const nodeTypes = {
  messageNode: CustomNode,
};

interface FlowButton {
  id: string;
  text: string;
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Inicio: Palabra Clave "Info"', type: 'input' },
    position: { x: 250, y: 0 },
    style: { background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold' }
  },
  {
    id: '2',
    type: 'messageNode',
    data: { label: 'Mensaje: Bienvenida Casa Arca', type: 'Mensaje' },
    position: { x: 250, y: 100 },
    style: { background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '8px', padding: '10px' }
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10b981' } },
];

interface FlowEditorProps {
    initialData?: {
        id?: number;
        name: string;
        nodes: Node[];
        edges: Edge[];
        trigger_keywords: string[];
    };
    onBack?: () => void;
}

export default function FlowEditor({ initialData, onBack }: FlowEditorProps) {
  const [nodes, setNodes] = useState<Node[]>(initialData?.nodes || initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialData?.edges || initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [flowName, setFlowName] = useState(initialData?.name || "Nuevo Flujo");
  const [triggerKeywords, setTriggerKeywords] = useState<string>(initialData?.trigger_keywords?.join(', ') || "hola");
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

  const updateNodeButtons = (buttons: Array<{id: string, text: string}>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, buttons } };
        }
        return node;
      })
    );
  };

  const addButtonToNode = () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;
    
    const currentButtons = (node.data.buttons as Array<{id: string, text: string}>) || [];
    if (currentButtons.length >= 3) return; // WhatsApp limit

    const newButton = { id: Math.random().toString(36).substr(2, 9), text: 'Opción' };
    updateNodeButtons([...currentButtons, newButton]);
  };

  const removeButtonFromNode = (index: number) => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const currentButtons = (node.data.buttons as Array<{id: string, text: string}>) || [];
    const newButtons = [...currentButtons];
    newButtons.splice(index, 1);
    updateNodeButtons(newButtons);
  };

  const updateNodeMedia = (url: string | null, type: 'image' | 'document' | null) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, mediaUrl: url, mediaType: type } };
        }
        return node;
      })
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const response = await fetch(`${apiUrl}/api/storage/upload`, {
              method: 'POST',
              body: formData
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          const data = await response.json();
          updateNodeMedia(data.url, data.type);
      } catch (error) {
          console.error('Upload error:', error);
          alert('Error subiendo archivo. Asegúrate de configurar las credenciales de Bunny.net en el backend.');
      }
  };

  const updateButtonText = (index: number, text: string) => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    const currentButtons = (node.data.buttons as Array<{id: string, text: string}>) || [];
    const newButtons = [...currentButtons];
    newButtons[index] = { ...newButtons[index], text };
    updateNodeButtons(newButtons);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const addNode = (type: string) => {
    const id = Math.random().toString();
    let label = "";
    const style = { background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '12px', padding: '15px', width: 200 };
    
    switch(type) {
        case 'Mensaje':
            label = "💬 Enviar Mensaje:\nEscribe aquí tu respuesta...";
            style.background = '#1f2937';
            break;
        case 'Pregunta':
            label = "❓ Pregunta:\n¿Cuál es tu correo?";
            style.background = '#3b82f6';
            style.border = 'none';
            break;
        case 'Condición':
            label = "⚡ Condición:\nSi el mensaje contiene...";
            style.background = '#f59e0b';
            style.border = 'none';
            break;
        case 'IA':
            label = "🤖 Acción IA:\nAnalizar sentimiento...";
            style.background = '#8b5cf6';
            style.border = 'none';
            break;
        case 'Tag':
            label = "🏷️ Etiqueta:\nAsignar etiqueta 'Interesado'";
            style.background = '#ec4899';
            style.border = 'none';
            break;
        case 'Pipeline':
            label = "📊 Pipeline:\nActualizar Status (Precalificado)";
            style.background = '#059669'; // Emerald-600
            style.border = 'none';
            break;
        case 'Asignación':
            label = "👤 Asignación:\nRound Robin / Asesor";
            style.background = '#d97706'; // Amber-600
            style.border = 'none';
            break;
        default:
            label = `Nuevo ${type}`;
    }

    const newNode: Node = {
      id,
      type: 'messageNode',
      position: { x: 100, y: 100 },
      data: { label, type }, // Store logical type in data
      style
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        // En producción NEXT_PUBLIC_API_URL debe estar configurado. 
        // Si no existe, usamos la URL actual del navegador para deducir la del backend
        let apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        if (!apiUrl && typeof window !== 'undefined') {
            const host = window.location.hostname;
            // Si estamos en producción (no localhost), usamos el mismo host sin puerto
            // ya que Cloud Run maneja el puerto 443/80 automáticamente
            if (host !== 'localhost' && !host.includes('127.0.0.1')) {
                apiUrl = `https://${host}`;
            } else {
                apiUrl = `http://${host}:8080`;
            }
        }

        const flowData = {
            name: flowName,
            nodes,
            edges,
            trigger_keywords: triggerKeywords.split(',').map(k => k.trim()).filter(k => k !== ""),
            is_active: true
        };

        console.log('Intentando guardar en:', `${apiUrl}/api/flows${initialData?.id ? `/${initialData.id}` : ''}`);

        const res = await fetch(`${apiUrl}/api/flows${initialData?.id ? `/${initialData.id}` : ''}`, {
            method: initialData?.id ? 'PUT' : 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(flowData)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Error del servidor:', errorData);
            throw new Error(errorData.message || `Error del servidor: ${res.status}`);
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
    <div className="h-screen w-full bg-black overflow-hidden relative no-scrollbar">
      <div className="absolute top-24 left-6 z-10 bg-black/40 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 flex flex-col gap-3 shadow-2xl">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2 mb-1">Nodos</div>
        <ToolButton icon={MessageSquare} label="Mensaje" onClick={() => addNode('Mensaje')} color="bg-gray-500" />
        <ToolButton icon={HelpCircle} label="Pregunta" onClick={() => addNode('Pregunta')} color="bg-blue-500" />
        <ToolButton icon={GitBranch} label="Condición" onClick={() => addNode('Condición')} color="bg-amber-500" />
        <ToolButton icon={Bot} label="IA Action" onClick={() => addNode('IA')} color="bg-purple-500" />
        <ToolButton icon={Tag} label="Etiqueta" onClick={() => addNode('Tag')} color="bg-pink-500" />
        <ToolButton icon={BarChart3} label="Pipeline" onClick={() => addNode('Pipeline')} color="bg-emerald-600" />
        <ToolButton icon={UserPlus} label="Asignación" onClick={() => addNode('Asignación')} color="bg-amber-600" />
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        <div className="flex gap-2">
            {onBack && (
                <div className="flex items-end pb-0.5">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 bg-white/5 text-white/80 px-4 py-2 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-all h-[38px]"
                    >
                        <X className="h-4 w-4" />
                        Cancelar
                    </button>
                </div>
            )}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase font-bold px-1">Nombre del Flujo</label>
                <input 
                    type="text" 
                    placeholder="Nombre del flujo"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 w-64"
                />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 uppercase font-bold px-1">Palabras Clave (sep. por coma)</label>
                <input 
                    type="text" 
                    placeholder="hola, info, precio"
                    value={triggerKeywords}
                    onChange={(e) => setTriggerKeywords(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 w-64"
                />
            </div>
            <div className="flex items-end pb-0.5">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 h-[38px]"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Flujo'}
                </button>
            </div>
        </div>
      </div>

      {selectedNode && (
        <div className="absolute top-20 right-4 z-20 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl animate-in slide-in-from-right-10 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-sm">Editar Nodo</h3>
                <button onClick={() => setSelectedNodeId(null)} className="text-white/50 hover:text-white">
                    <X className="h-4 w-4" />
                </button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-white/50 block">Contenido / Etiqueta</label>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => updateNodeLabel((selectedNode.data.label as string) + " {{name}}")}
                                className="text-[10px] bg-white/5 hover:bg-white/10 text-white/70 px-2 py-0.5 rounded border border-white/10 transition-colors"
                                title="Insertar nombre del cliente"
                            >
                                + Nombre
                            </button>
                        </div>
                    </div>
                    <textarea 
                        value={selectedNode.data.label as string}
                        onChange={(e) => updateNodeLabel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 h-32 resize-none"
                    />
                    <p className="text-[10px] text-white/30 mt-1">Usa <code className="text-primary">{'{{name}}'}</code> para el nombre del cliente.</p>
                </div>

                {/* Media Upload Section */}
                {((selectedNode.data?.type === 'Mensaje' || selectedNode.data?.type === 'Pregunta') || 
                  (selectedNode.type === 'Mensaje' || selectedNode.type === 'Pregunta') ||
                  (typeof selectedNode.data?.label === 'string' && (
                    !selectedNode.data.label.startsWith('⚡') && 
                    !selectedNode.data.label.startsWith('🤖') && 
                    !selectedNode.data.label.startsWith('🏷️') &&
                    !selectedNode.data.label.startsWith('📊') &&
                    !selectedNode.data.label.startsWith('👤')
                  ))
                ) && (
                    <div className="border-t border-white/10 pt-4">
                        <label className="text-xs text-white/50 block mb-2 font-bold">Multimedia (Imagen/PDF)</label>
                        
                        {selectedNode.data?.mediaUrl ? (
                            <div className="mb-2">
                                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                                    {selectedNode.data.mediaType === 'image' ? <ImageIcon className="h-4 w-4 text-primary"/> : <FileText className="h-4 w-4 text-primary"/>}
                                    <span className="text-xs text-white truncate flex-1">{(selectedNode.data.mediaUrl as string).split('/').pop()}</span>
                                    <button onClick={() => updateNodeMedia(null, null)} className="text-red-500 hover:text-red-400">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                                {selectedNode.data.mediaType === 'image' && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={selectedNode.data.mediaUrl as string} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-white/10" />
                                )}
                            </div>
                        ) : null}

                        <label className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-primary/50 rounded-lg p-3 cursor-pointer transition-all group">
                            <Upload className="h-4 w-4 text-white/50 group-hover:text-primary transition-colors" />
                            <span className="text-xs text-white/50 group-hover:text-white transition-colors">Subir Archivo</span>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                            />
                        </label>
                    </div>
                )}

                {/* Button Editor Section - Only for Message and Question nodes */}
                {((selectedNode.data?.type === 'Mensaje' || selectedNode.data?.type === 'Pregunta') || 
                  (selectedNode.type === 'Mensaje' || selectedNode.type === 'Pregunta') ||
                  // Fallback for nodes without type but with buttons already
                  (selectedNode.data?.buttons && (selectedNode.data.buttons as FlowButton[]).length > 0) ||
                  // Fallback by label text (heuristic)
                  (typeof selectedNode.data?.label === 'string' && (
                    !selectedNode.data.label.startsWith('⚡') && 
                    !selectedNode.data.label.startsWith('🤖') && 
                    !selectedNode.data.label.startsWith('🏷️') &&
                    !selectedNode.data.label.startsWith('📊') &&
                    !selectedNode.data.label.startsWith('👤')
                  ))
                ) && (
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-white/50 font-bold">Botones (Máx 3)</label>
                      <button 
                        onClick={addButtonToNode}
                        disabled={((selectedNode.data.buttons as FlowButton[])?.length || 0) >= 3}
                        className="text-primary hover:text-primary/80 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {((selectedNode.data.buttons as FlowButton[]) || []).map((btn, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={btn.text}
                            onChange={(e) => updateButtonText(idx, e.target.value)}
                            maxLength={20}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                            placeholder="Texto del botón"
                          />
                          <button 
                            onClick={() => removeButtonFromNode(idx)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {((selectedNode.data.buttons as FlowButton[])?.length || 0) === 0 && (
                        <p className="text-[10px] text-white/30 italic">Sin botones configurados</p>
                      )}
                    </div>
                  </div>
                )}

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
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        colorMode="dark"
        style={{ width: '100%', height: '100%' }}
      >
        <Background color="#333" gap={20} variant={BackgroundVariant.Dots} />
        <Controls className="bg-white/10 border-white/10 fill-white" />
        <Panel position="bottom-center" className="bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/5 text-xs text-white/50">
          Dreambuilt Flow Engine v1.0
        </Panel>
      </ReactFlow>
    </div>
  );
}

function ToolButton({ icon: Icon, label, onClick, color }: { icon: React.ElementType, label: string, onClick: () => void, color?: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-xl transition-all text-white/80 hover:text-white w-36 group active:scale-95"
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors shadow-lg",
        color || "bg-white/5",
        "group-hover:scale-110 transition-transform"
      )}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
