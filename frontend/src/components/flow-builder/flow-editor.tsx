"use client";

import { useState, useCallback, useEffect } from 'react';
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
  Panel,
  SelectionMode
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
  UserPlus,
  User,
  Mail,
  ChevronLeft,
  Menu,
  Download,
  FileJson,
  Clock,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomNode from './custom-node';
import RemovableEdge from './removable-edge';

const nodeTypes = {
  messageNode: CustomNode,
};

const edgeTypes = {
  removable: RemovableEdge,
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
  { id: 'e1-2', source: '1', target: '2', animated: true, type: 'removable', style: { stroke: '#10b981' } },
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
  const [advisors, setAdvisors] = useState<Array<{id: number, name: string}>>([]);
  const [availableFlows, setAvailableFlows] = useState<Array<{id: number, name: string}>>([]);
  const [isNodesPanelOpen, setIsNodesPanelOpen] = useState(true);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Initialize panel state based on screen size
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      setIsNodesPanelOpen(!isMobile);
    }
  }, []);

  // Fetch advisors and flows when component mounts
  const fetchAdvisorsData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const resAdvisors = await fetch(`${apiUrl}/api/advisors`);
        if (resAdvisors.ok) {
            const data = await resAdvisors.json();
            setAdvisors(data);
        }
      } catch (err) {
        console.error("Error fetching advisors:", err);
      }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        // Fetch Advisors
        await fetchAdvisorsData();

        // Fetch Flows
        const resFlows = await fetch(`${apiUrl}/api/flows`);
        if (resFlows.ok) {
            const data: Array<{id: number, name: string}> = await resFlows.json();
            // Filter out current flow if editing
            const filteredFlows = initialData?.id 
              ? data.filter((f) => f.id !== initialData.id)
              : data;
            setAvailableFlows(filteredFlows);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [initialData?.id]);

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const duplicateNode = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    if (!nodeToDuplicate) return;

    const newId = `node_${Math.random().toString(36).substr(2, 9)}`;
    const newNode: Node = {
      ...nodeToDuplicate,
      id: newId,
      position: {
        x: nodeToDuplicate.position.x + 40,
        y: nodeToDuplicate.position.y + 40,
      },
      selected: false,
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(newId);
  }, [nodes]);

  useEffect(() => {
    const handleDuplicateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      if (customEvent.detail && customEvent.detail.nodeId) {
        duplicateNode(customEvent.detail.nodeId);
      }
    };
    const handleDeleteEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ nodeId: string }>;
      if (customEvent.detail && customEvent.detail.nodeId) {
        setNodes((nds) => nds.filter((node) => node.id !== customEvent.detail.nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== customEvent.detail.nodeId && edge.target !== customEvent.detail.nodeId));
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('duplicate-node', handleDuplicateEvent);
    window.addEventListener('delete-node', handleDeleteEvent);
    return () => {
      window.removeEventListener('duplicate-node', handleDuplicateEvent);
      window.removeEventListener('delete-node', handleDeleteEvent);
    };
  }, [duplicateNode]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  // List of predefined system variables
  const PREDEFINED_VARS = ['name', 'email', 'budget', 'phone'];

  // List of system prefixes to handle in the editor
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
    "⏳ Espera:\n",
    "🔗 Conectar Flujo:\n"
  ];

  // Get all custom variables defined in the current flow
    const getFlowVariables = () => {
        const vars = new Set<string>();
        nodes.forEach(node => {
            if (node.data?.variable && typeof node.data.variable === 'string') {
                if (!PREDEFINED_VARS.includes(node.data.variable)) {
                    vars.add(node.data.variable);
                }
            }
        });
        return Array.from(vars);
    };

    // Get all custom tags defined in the current flow
    const getFlowTags = () => {
        const tags = new Set<string>();
        nodes.forEach(node => {
            const label = (node.data?.label as string) || "";
            if (label.startsWith('🏷️ Etiqueta:')) {
                const tag = label.replace(/^🏷️ Etiqueta:\s*[\r\n]*/iu, '').trim();
                if (tag) tags.add(tag);
            }
        });
        return Array.from(tags);
    };

    const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'removable', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } }, eds)),
    [],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeLabel = (newContent: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          const nodeType = node.data.type as string;
          
          // Especial para nodos de captura que tienen lógica propia
          if (nodeType === 'CapturaNombre' || nodeType === 'CapturaEmail') {
            const prefix = nodeType === 'CapturaNombre' ? "👤 Solicitar Nombre:\n" : "📧 Solicitar Email:\n";
            // Si el nuevo contenido ya tiene el prefijo (por error o copia), no lo duplicamos
            const cleanContent = newContent.startsWith(prefix) ? newContent.replace(prefix, "") : newContent;
            return { ...node, data: { ...node.data, label: prefix + cleanContent } };
          }

          // Para nodos de Mensaje y Pregunta, ya NO forzamos el prefijo en el label
          // Esto evita que se envíe al lead por error y que el usuario vea texto duplicado
          if (nodeType === 'Mensaje' || nodeType === 'Pregunta') {
            return { ...node, data: { ...node.data, label: newContent } };
          }

          // Para otros tipos de nodos técnicos, mantenemos el prefijo si existe para identificación visual
          const currentLabel = (node.data.label as string) || "";
          const foundPrefix = SYSTEM_PREFIXES.find(p => currentLabel.startsWith(p));
          
          if (foundPrefix) {
            // Si el nuevo contenido ya empieza con el prefijo, lo usamos tal cual
            if (newContent.startsWith(foundPrefix)) {
              return { ...node, data: { ...node.data, label: newContent } };
            }
            // Si no, lo preservamos
            return { ...node, data: { ...node.data, label: foundPrefix + newContent } };
          }

          // Si no hay prefijo (o el usuario lo borró), actualizamos todo el campo
          return { ...node, data: { ...node.data, label: newContent } };
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

  const addNode = (type: string) => {
    const id = Math.random().toString();
    let label = "";
    const style = { background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '12px', padding: '15px', width: 200 };
    
    switch(type) {
        case 'Mensaje':
            label = "💬 Enviar Mensaje:\n";
            style.background = '#1f2937';
            break;
        case 'Pregunta':
            label = "❓ Pregunta:\n";
            style.background = '#3b82f6';
            style.border = 'none';
            break;
        case 'Condición':
            label = "⚡ Condición:\n";
            style.background = '#f59e0b';
            style.border = 'none';
            // Automatically add a "No cumple" button for the false path
            const falseButton = { id: 'false-' + Math.random().toString(36).substr(2, 4), text: '❌ No cumple' };
            const newNodeCond: Node = {
              id,
              type: 'messageNode',
              position: { x: 100, y: 100 },
              data: { label, type, buttons: [falseButton] },
              style
            };
            setNodes((nds) => nds.concat(newNodeCond));
            return;
        case 'IA':
            label = "🤖 Acción IA:\n";
            type = 'IA Action'; // Explicitly set technical type
            style.background = '#8b5cf6';
            style.border = 'none';
            break;
        case 'Tag':
            label = "🏷️ Etiqueta:\n";
            type = 'Tag'; // Explicitly set technical type
            style.background = '#ec4899';
            style.border = 'none';
            break;
        case 'Pipeline':
            label = "📊 Pipeline:\n";
            type = 'Pipeline'; // Explicitly set technical type
            style.background = '#059669'; // Emerald-600
            style.border = 'none';
            break;
        case 'Asignación':
            label = "👤 Asignación:\nRound Robin / Asesor";
            type = 'Asignación';
            style.background = '#d97706'; // Amber-600
            style.border = 'none';
            break;
        case 'CapturaNombre':
            label = "👤 Solicitar Nombre:\n¿Cómo te llamas?";
            type = 'CapturaNombre';
            style.background = '#6366f1'; // Indigo-500
            style.border = 'none';
            break;
        case 'CapturaEmail':
            label = "📧 Solicitar Email:\n¿Cuál es tu correo electrónico?";
            type = 'CapturaEmail';
            style.background = '#06b6d4'; // Cyan-500
            style.border = 'none';
            break;
        case 'Espera':
            label = "⏳ Espera:\n5 segundos";
            type = 'Espera';
            style.background = '#4b5563'; // Gray-600
            style.border = 'none';
            break;
        case 'ConectarFlujo':
            label = "🔗 Conectar Flujo:\nSeleccionar...";
            type = 'ConectarFlujo';
            style.background = '#000000';
            style.border = '1px solid #ffffff30';
            break;
        default:
            label = `Nuevo ${type}`;
    }

    const newNode: Node = {
      id,
      type: 'messageNode',
      position: { x: 100, y: 100 },
      data: { 
        label, 
        type,
        ...(type === 'CapturaNombre' ? { variable: 'name' } : {}),
        ...(type === 'CapturaEmail' ? { variable: 'email' } : {}),
        ...(type === 'Espera' ? { waitTime: 5, waitUnit: 'seconds' } : {})
      }, // Store logical type in data
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

  const exportToJson = () => {
    const flowData = {
      name: flowName,
      nodes,
      edges,
      trigger_keywords: triggerKeywords.split(',').map(k => k.trim()).filter(k => k !== ""),
      exported_at: new Date().toISOString(),
      version: "1.0"
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${flowName.replace(/\s+/g, '_').toLowerCase()}_export.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importFromJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        if (json.nodes && json.edges) {
          setNodes(json.nodes);
          setEdges(json.edges);
          if (json.name) setFlowName(json.name + " (Importado)");
          if (json.trigger_keywords) setTriggerKeywords(json.trigger_keywords.join(', '));
          alert('Flujo importado correctamente');
        } else {
          alert('El archivo JSON no tiene un formato de flujo válido');
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error al leer el archivo JSON');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be imported again
    e.target.value = '';
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-screen w-full bg-black overflow-hidden relative no-scrollbar">
      {/* Retractable Nodes Panel */}
      <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
        <div className="relative">
            <button
            onClick={() => setIsNodesPanelOpen(!isNodesPanelOpen)}
            className={cn(
                "p-3 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl text-white/70 hover:text-white transition-all shadow-2xl",
                isNodesPanelOpen && "rounded-b-none border-b-0"
            )}
            title={isNodesPanelOpen ? "Contraer Nodos" : "Expandir Nodos"}
            >
            {isNodesPanelOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile Flow Name Input - Left Aligned */}
            <div className="md:hidden absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-2xl flex items-center h-[46px]">
                 <input 
                     type="text" 
                     placeholder="Nombre del flujo"
                     value={flowName}
                     onChange={(e) => setFlowName(e.target.value)}
                     className="bg-transparent border-none text-sm text-white focus:outline-none w-32 font-bold placeholder:text-white/20"
                 />
            </div>
        </div>

        <AnimatePresence>
          {isNodesPanelOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-black/40 backdrop-blur-xl p-4 rounded-[2rem] rounded-tl-none border border-white/10 flex flex-col gap-3 shadow-2xl origin-top-left"
            >
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2 mb-1">Nodos</div>
              <ToolButton icon={MessageSquare} label="Mensaje" onClick={() => addNode('Mensaje')} color="bg-gray-500" />
              <ToolButton icon={HelpCircle} label="Pregunta" onClick={() => addNode('Pregunta')} color="bg-blue-500" />
              <ToolButton icon={GitBranch} label="Condición" onClick={() => addNode('Condición')} color="bg-amber-500" />
              <ToolButton icon={Bot} label="IA Action" onClick={() => addNode('IA')} color="bg-purple-500" />
              <ToolButton icon={Tag} label="Etiqueta" onClick={() => addNode('Tag')} color="bg-pink-500" />
              <ToolButton icon={BarChart3} label="Pipeline" onClick={() => addNode('Pipeline')} color="bg-emerald-600" />
              <ToolButton icon={UserPlus} label="Asignación" onClick={() => addNode('Asignación')} color="bg-amber-600" />
              <ToolButton icon={Clock} label="Espera" onClick={() => addNode('Espera')} color="bg-gray-600" />
              <ToolButton icon={PlusCircle} label="Conectar Flujo" onClick={() => addNode('ConectarFlujo')} color="bg-black border border-white/20" />
              <div className="h-px bg-white/5 mx-2 my-1" />
              <ToolButton icon={User} label="Captura Nombre" onClick={() => addNode('CapturaNombre')} color="bg-indigo-500" />
              <ToolButton icon={Mail} label="Captura Email" onClick={() => addNode('CapturaEmail')} color="bg-cyan-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex flex-col md:flex-row gap-2 pointer-events-auto items-end">
            {onBack && (
                <div className="flex items-end pb-0.5">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 bg-white/5 text-white/80 px-4 py-2 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-all h-[38px]"
                    >
                        <X className="h-4 w-4" />
                        Cerrar
                    </button>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-2">
                <div className="hidden md:flex flex-col gap-1">
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
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex gap-2 items-end">
                <div className="flex items-end pb-0.5">
                    <label 
                        className="flex items-center gap-2 bg-white/5 text-white/80 px-4 py-2 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-all h-[38px] cursor-pointer"
                        title="Importar flujo desde JSON"
                    >
                        <FileJson className="h-4 w-4" />
                        Importar JSON
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={importFromJson} 
                            className="hidden" 
                        />
                    </label>
                </div>
                <div className="flex items-end pb-0.5">
                    <button 
                        onClick={exportToJson}
                        className="flex items-center gap-2 bg-white/5 text-white/80 px-4 py-2 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/10 transition-all h-[38px]"
                        title="Exportar flujo a JSON"
                    >
                        <Download className="h-4 w-4" />
                        Exportar JSON
                    </button>
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

            {/* Mobile Actions Menu */}
            <div className="md:hidden relative flex items-end pb-0.5">
                <button 
                    onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                    className="flex items-center justify-center bg-white/5 text-white/80 w-[38px] h-[38px] rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                >
                    <MoreVertical className="h-5 w-5" />
                </button>

                <AnimatePresence>
                    {isActionsMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-2 min-w-[200px]"
                        >
                            <label className="flex items-center gap-2 text-white/80 px-4 py-3 rounded-lg hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
                                <FileJson className="h-4 w-4" />
                                Importar JSON
                                <input type="file" accept=".json" onChange={importFromJson} className="hidden" />
                            </label>

                            <button onClick={exportToJson} className="flex items-center gap-2 text-white/80 px-4 py-3 rounded-lg hover:bg-white/10 transition-all text-left text-sm font-bold">
                                <Download className="h-4 w-4" />
                                Exportar JSON
                            </button>

                            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 text-primary-foreground bg-primary px-4 py-3 rounded-lg hover:brightness-110 transition-all text-left text-sm font-bold justify-center mt-1">
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Guardando...' : 'Guardar Flujo'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                        <label className="text-xs text-white/50 block">
                            {(selectedNode.data.label as string)?.startsWith('🤖') ? 'Instrucción / Prompt para la IA' : 'Contenido / Etiqueta'}
                        </label>
                        {!(selectedNode.data.label as string)?.startsWith('📊') && !(selectedNode.data.label as string)?.startsWith('👤') && !(selectedNode.data.label as string)?.startsWith('🤖') && (
                        <div className="flex gap-1">
                            <button 
                                onClick={() => updateNodeLabel((selectedNode.data.label as string) + " {{name}}")}
                                className="text-[10px] bg-white/5 hover:bg-white/10 text-white/70 px-2 py-0.5 rounded border border-white/10 transition-colors"
                                title="Insertar nombre del cliente"
                            >
                                + Nombre
                            </button>
                        </div>
                        )}
                    </div>

                    {/* Conditional Input for Name/Email Node */}
                    {((selectedNode.data.label as string)?.startsWith('👤') && !(selectedNode.data.label as string)?.startsWith('👤 Asignación:')) || (selectedNode.data.label as string)?.startsWith('📧') ? (
                         <div className="flex flex-col gap-2">
                             <p className="text-[10px] text-white/40 mb-1">Personaliza la pregunta para el lead:</p>
                             <textarea 
                                value={(() => {
                                    const label = (selectedNode.data.label as string) || "";
                                    const prefix = (selectedNode.data.type === 'CapturaNombre' || label.startsWith('👤 Solicitar Nombre')) 
                                        ? "👤 Solicitar Nombre:\n" 
                                        : "📧 Solicitar Email:\n";
                                    return label.startsWith(prefix) ? label.replace(prefix, "") : label;
                                })()}
                                onChange={(e) => updateNodeLabel(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 h-24 resize-none"
                                placeholder="Escribe la pregunta aquí..."
                             />
                             <div className="flex items-center gap-2 mt-1">
                                <div className={cn(
                                     "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                                     (selectedNode.data.label as string)?.startsWith('👤') ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                 )}>
                                     Variable: {(selectedNode.data.variable as string) || ((selectedNode.data.label as string)?.startsWith('👤') ? 'name' : 'email')}
                                 </div>
                             </div>
                             <p className="text-[10px] text-primary/80 bg-primary/10 p-2 rounded-lg border border-primary/20 mt-2">
                                 Tip: El flujo se detendrá aquí hasta que el lead responda. La respuesta se guardará automáticamente en la variable indicada arriba.
                             </p>
                         </div>
                    ) : (selectedNode.data.label as string)?.startsWith('⏳') ? (
                         <div className="flex flex-col gap-3">
                             <p className="text-[10px] text-white/40 mb-1">Configura el tipo de espera:</p>
                             
                             {/* Selector de Modo */}
                             <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => {
                                        setNodes((nds) => nds.map(n => n.id === selectedNodeId ? {
                                            ...n,
                                            data: { 
                                                ...n.data, 
                                                scheduledMode: false,
                                                waitTime: 5,
                                                waitUnit: 'seconds',
                                                label: `⏳ Espera:\n5 segundos` 
                                            }
                                        } : n));
                                    }}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all",
                                        !(selectedNode.data.scheduledMode)
                                            ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                    )}
                                >
                                    Relativo (Tiempo)
                                </button>
                                <button
                                    onClick={() => {
                                        setNodes((nds) => nds.map(n => n.id === selectedNodeId ? {
                                            ...n,
                                            data: { 
                                                ...n.data, 
                                                scheduledMode: true,
                                                waitDays: 1,
                                                label: `⏳ Espera:\n1 día (9:00 AM)` 
                                            }
                                        } : n));
                                    }}
                                    className={cn(
                                        "flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all",
                                        (selectedNode.data.scheduledMode)
                                            ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                    )}
                                >
                                    Agendado (Días)
                                </button>
                             </div>

                             {!(selectedNode.data.scheduledMode) ? (
                                 <div className="flex gap-2">
                                     <input 
                                         type="number"
                                         min="1"
                                         className="w-20 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                         value={(selectedNode.data.waitTime as number) || 5}
                                         onChange={(e) => {
                                             const time = parseInt(e.target.value);
                                             const unit = (selectedNode.data.waitUnit as string) || 'seconds';
                                             setNodes((nds) => nds.map(n => n.id === selectedNodeId ? {
                                                 ...n,
                                                 data: { ...n.data, waitTime: time, label: `⏳ Espera:\n${time} ${unit === 'seconds' ? 'segundos' : 'minutos'}` }
                                             } : n));
                                         }}
                                     />
                                     <select 
                                         className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                         value={(selectedNode.data.waitUnit as string) || 'seconds'}
                                         onChange={(e) => {
                                             const unit = e.target.value;
                                             const time = (selectedNode.data.waitTime as number) || 5;
                                             setNodes((nds) => nds.map(n => n.id === selectedNodeId ? {
                                                 ...n,
                                                 data: { ...n.data, waitUnit: unit, label: `⏳ Espera:\n${time} ${unit === 'seconds' ? 'segundos' : 'minutos'}` }
                                             } : n));
                                         }}
                                     >
                                         <option value="seconds">Segundos</option>
                                         <option value="minutes">Minutos</option>
                                     </select>
                                 </div>
                             ) : (
                                 <div className="flex flex-col gap-2">
                                     <div className="flex items-center gap-2">
                                         <span className="text-xs text-white/70">Esperar</span>
                                         <input 
                                             type="number"
                                             min="1"
                                             className="w-20 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                             value={(selectedNode.data.waitDays as number) || 1}
                                             onChange={(e) => {
                                                 const days = parseInt(e.target.value);
                                                 setNodes((nds) => nds.map(n => n.id === selectedNodeId ? {
                                                     ...n,
                                                     data: { ...n.data, waitDays: days, label: `⏳ Espera:\n${days} ${days === 1 ? 'día' : 'días'} (9:00 AM)` }
                                                 } : n));
                                             }}
                                         />
                                         <span className="text-xs text-white/70">días</span>
                                     </div>
                                     <p className="text-[10px] text-amber-500/80 mt-1">
                                         * El mensaje se enviará a las 9:00 AM después de {((selectedNode.data.waitDays as number) || 1)} día(s).
                                     </p>
                                 </div>
                             )}

                             <p className="text-[10px] text-white/40 italic bg-white/5 p-2 rounded-lg">
                                 Tip: {!(selectedNode.data.scheduledMode) 
                                     ? "Este nodo detiene el flujo por el tiempo indicado antes de pasar al siguiente mensaje." 
                                     : "Este modo es ideal para fases de nutrición a largo plazo."}
                             </p>
                         </div>
                    ) : (selectedNode.data.label as string)?.startsWith('🏷️') ? (
                         <div className="flex flex-col gap-2">
                             <p className="text-[10px] text-white/40 mb-1">Selecciona o crea una etiqueta para el Lead:</p>
                             
                             {/* Input para etiqueta personalizada */}
                             <div className="flex gap-2 mb-2">
                                <input 
                                    type="text"
                                    placeholder="Nueva etiqueta..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500/50"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value.trim();
                                            if (val) {
                                                updateNodeLabel(`🏷️ Etiqueta:\n${val.toLowerCase()}`);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }
                                    }}
                                />
                                <button 
                                    onClick={(e) => {
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                        const val = input.value.trim();
                                        if (val) {
                                            updateNodeLabel(`🏷️ Etiqueta:\n${val.toLowerCase()}`);
                                            input.value = '';
                                        }
                                    }}
                                    className="bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-lg transition-colors"
                                >
                                    <PlusCircle className="h-4 w-4" />
                                </button>
                             </div>

                             <div className="grid grid-cols-1 gap-2">
                                 {['lead frio', 'lead tibio', 'lead caliente'].map((tag) => (
                                     <button
                                         key={tag}
                                         onClick={() => updateNodeLabel(`🏷️ Etiqueta:\n${tag}`)}
                                         className={cn(
                                             "py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between",
                                             (selectedNode.data.label as string).includes(tag)
                                                 ? "bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                                                 : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                         )}
                                     >
                                         <span className="capitalize">{tag}</span>
                                         {(selectedNode.data.label as string).includes(tag) && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                     </button>
                                 ))}
                             </div>
                             <p className="text-[10px] text-pink-500/80 bg-pink-500/10 p-2 rounded-lg border border-pink-500/20 mt-2 italic">
                                 Nota: Esta etiqueta se asigna internamente al lead y no es visible para él.
                             </p>
                         </div>
                    ) : (selectedNode.data.label as string)?.startsWith('📊') ? (
                         <div className="flex flex-col gap-2">
                             <p className="text-[10px] text-white/40 mb-1">Selecciona la acción del pipeline:</p>
                             <div className="flex gap-2">
                                 <button
                                     onClick={() => updateNodeLabel("📊 Pipeline:\nActualizar Status (Precalificado)")}
                                     className={cn(
                                         "flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all",
                                         (selectedNode.data.label as string).includes("Precalificado")
                                             ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_10px_rgba(5,150,105,0.5)]"
                                             : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                     )}
                                 >
                                     Precalificado
                                 </button>
                                 <button
                                     onClick={() => updateNodeLabel("📊 Pipeline:\nActualizar Status (Asignado)")}
                                     className={cn(
                                         "flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all",
                                         (selectedNode.data.label as string).includes("Asignado")
                                             ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                                             : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                     )}
                                 >
                                     Asignado
                                 </button>
                                 <button
                                     onClick={() => updateNodeLabel("📊 Pipeline:\nActualizar Status (Nutricion)")}
                                     className={cn(
                                         "flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all",
                                         (selectedNode.data.label as string).includes("Nutricion")
                                             ? "bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                                             : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                     )}
                                 >
                                     Nutrición
                                 </button>
                             </div>
                         </div>
                    ) : (selectedNode.data.label as string)?.startsWith('⚡') ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] text-white/40 mb-1">Tipo de Condición:</p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => updateNodeLabel("⚡ Condición:\nSi el mensaje contiene...")}
                                    className={cn(
                                        "w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between",
                                        (selectedNode.data.label as string).includes("contiene")
                                            ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                    )}
                                >
                                    <span>Contenido de Mensaje</span>
                                    {(selectedNode.data.label as string).includes("contiene") && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                </button>
                                
                                <button
                                    onClick={() => updateNodeLabel("⚡ Condición:\n¿Tiene nombre el Lead?")}
                                    className={cn(
                                        "w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between",
                                        (selectedNode.data.label as string).includes("¿Tiene nombre")
                                            ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                    )}
                                >
                                    <span>Validar Nombre del Lead</span>
                                    {(selectedNode.data.label as string).includes("¿Tiene nombre") && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                </button>

                                <button
                                    onClick={() => updateNodeLabel("⚡ Condición:\n{{brochure_enviado}}")}
                                    className={cn(
                                        "w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between",
                                        (selectedNode.data.label as string).includes("brochure_enviado")
                                            ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                    )}
                                >
                                    <span>Validar Brochure Enviado</span>
                                    {(selectedNode.data.label as string).includes("brochure_enviado") && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                </button>
                            </div>

                            {(selectedNode.data.label as string).includes("contiene") && (
                                <div className="mt-2">
                                    <p className="text-[10px] text-white/40 mb-1">Palabra clave a buscar:</p>
                                    <input 
                                        type="text"
                                        placeholder="ej: precio, info, cita"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                        onChange={(e) => {
                                            const keyword = e.target.value;
                                            updateNodeLabel(`⚡ Condición:\nSi el mensaje contiene '${keyword}'`);
                                        }}
                                        value={(() => {
                                            const label = selectedNode.data.label as string;
                                            const match = label.match(/'([^']+)'/);
                                            return match ? match[1] : "";
                                        })()}
                                    />
                                </div>
                            )}
                            
                            <p className="text-[10px] text-amber-500/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mt-2 italic">
                                Tip: Las condiciones generan dos salidas automáticas: <br/>
                                🟢 <b>Abajo:</b> Si cumple (True) <br/>
                                🔴 <b>Botón lateral:</b> Si no cumple (False)
                            </p>
                        </div>
                    ) : (selectedNode.data.label as string)?.startsWith('🔗') ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] text-white/40 mb-1">Seleccionar Flujo Destino:</p>
                            <select 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                onChange={(e) => {
                                    const flowId = e.target.value;
                                    const flow = availableFlows.find(f => f.id.toString() === flowId);
                                    if (flow) {
                                        setNodes((nds) =>
                                            nds.map((node) => {
                                                if (node.id === selectedNodeId) {
                                                    return { 
                                                        ...node, 
                                                        data: { 
                                                            ...node.data, 
                                                            targetFlowId: flowId,
                                                            label: `🔗 Conectar Flujo:\n${flow.name}`
                                                        } 
                                                    };
                                                }
                                                return node;
                                            })
                                        );
                                    }
                                }}
                                value={selectedNode.data?.targetFlowId as string || ""}
                            >
                                <option value="">Selecciona un flujo...</option>
                                {availableFlows.map(flow => (
                                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-white/40 mt-1 italic">
                                Al llegar a este nodo, el usuario saltará automáticamente al inicio del flujo seleccionado.
                            </p>
                        </div>
                    ) : (selectedNode.data.label as string)?.startsWith('👤 Asignación:') ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] text-white/40 mb-1">Método de Asignación:</p>
                            
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                value={selectedNode.data.assignmentType as string || ((selectedNode.data.label as string).includes("Manual") ? "MANUAL" : (selectedNode.data.label as string).includes("Round Robin") ? "ROUND_ROBIN" : "QUOTA_DEFICIT")}
                                onChange={(e) => {
                                    const type = e.target.value;
                                    let newLabel = "";
                                    const updateData: Record<string, unknown> = { assignmentType: type };

                                    if (type === 'ROUND_ROBIN') {
                                        newLabel = "👤 Asignación:\nRound Robin";
                                    } else if (type === 'QUOTA_DEFICIT') {
                                        newLabel = "👤 Asignación:\nDéficit de Cuota";
                                    } else {
                                        newLabel = "👤 Asignación:\nManual";
                                    }
                                    
                                    setNodes((nds) =>
                                        nds.map((node) => {
                                            if (node.id === selectedNodeId) {
                                                return { 
                                                    ...node, 
                                                    data: { 
                                                        ...node.data, 
                                                        label: newLabel,
                                                        ...updateData 
                                                    } 
                                                };
                                            }
                                            return node;
                                        })
                                    );
                                }}
                            >
                                <option value="ROUND_ROBIN">🔄 Round Robin (Secuencial)</option>
                                <option value="QUOTA_DEFICIT">⚖️ Déficit de Cuota (Mérito)</option>
                                <option value="MANUAL">👤 Asignación Manual</option>
                            </select>
                            
                            {(selectedNode.data.assignmentType === 'MANUAL' || (selectedNode.data.label as string).includes("Manual")) && (
                                <div className="mt-2 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] text-white/40">Seleccionar Asesor:</p>
                                        <button 
                                            onClick={fetchAdvisorsData}
                                            className="text-[10px] text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                                            title="Recargar lista de asesores"
                                        >
                                            🔄 Actualizar
                                        </button>
                                    </div>
                                    
                                    {advisors.length === 0 ? (
                                        <div className="text-xs text-rose-300 bg-rose-900/20 p-2.5 rounded-lg border border-rose-500/20 flex gap-2 items-start">
                                            <span className="mt-0.5">⚠️</span>
                                            <div>
                                                <p className="font-bold">Sin asesores</p>
                                                <p className="opacity-80 text-[10px]">No se encontraron asesores registrados. Ve a la sección &quot;Equipo&quot; para añadir uno.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <select 
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                            onChange={(e) => {
                                                const selectedId = e.target.value; // Keep as string initially
                                                // Robust comparison: check both string and number
                                                const selectedAdvisor = advisors.find(a => 
                                                    String(a.id) === String(selectedId)
                                                );
                                                
                                                if (selectedAdvisor) {
                                                    const newLabel = `👤 Asignación:\nManual: ${selectedAdvisor.name} (ID: ${selectedAdvisor.id})`;
                                                    setNodes((nds) =>
                                                        nds.map((node) => {
                                                            if (node.id === selectedNodeId) {
                                                                return { 
                                                                    ...node, 
                                                                    data: { 
                                                                        ...node.data, 
                                                                        label: newLabel,
                                                                        manualAdvisorId: selectedAdvisor.id // Store original ID type
                                                                    } 
                                                                };
                                                            }
                                                            return node;
                                                        })
                                                    );
                                                }
                                            }}
                                            value={(() => {
                                                if (selectedNode.data.manualAdvisorId) return String(selectedNode.data.manualAdvisorId);
                                                // Fallback to parsing label
                                                const label = (selectedNode.data.label as string) || "";
                                                const idMatch = label.match(/\(ID:\s*(\d+)\)/);
                                                if (idMatch) return idMatch[1];
                                                
                                                const parts = label.split('Manual: ');
                                                if (parts.length > 1) {
                                                    const namePart = parts[1].trim();
                                                    const foundByName = advisors.find(a => a.name === namePart);
                                                    return foundByName ? String(foundByName.id) : "";
                                                }
                                                return "";
                                            })()}
                                        >
                                            <option value="">Selecciona un asesor...</option>
                                            {advisors.map(advisor => (
                                                <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (selectedNode.data.label as string)?.startsWith('🏷️') ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] text-white/40 mb-1">Configuración de Etiqueta:</p>
                            
                            {/* Selector de etiquetas existentes en el flujo */}
                            {getFlowTags().length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[9px] text-white/30 uppercase font-bold">Etiquetas en este flujo:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {getFlowTags().map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => updateNodeLabel(`🏷️ Etiqueta:\n${tag}`)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all",
                                                    (selectedNode.data.label as string).includes(tag)
                                                        ? "bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]"
                                                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                                )}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 mt-2">
                                <p className="text-[9px] text-white/30 uppercase font-bold">Nueva etiqueta personalizada:</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        placeholder="Ej: interesado_preventa..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500/50"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value.trim();
                                                if (val) {
                                                    updateNodeLabel(`🏷️ Etiqueta:\n${val.toLowerCase()}`);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            const val = input.value.trim();
                                            if (val) {
                                                updateNodeLabel(`🏷️ Etiqueta:\n${val.toLowerCase()}`);
                                                input.value = '';
                                            }
                                        }}
                                        className="bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-lg transition-colors"
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <textarea 
                            value={(() => {
                                const label = (selectedNode.data.label as string) || "";
                                const foundPrefix = SYSTEM_PREFIXES.find(p => label.startsWith(p));
                                return foundPrefix ? label.replace(foundPrefix, "") : label;
                            })()}
                            onChange={(e) => updateNodeLabel(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50 h-32 resize-none"
                            placeholder={(selectedNode.data.label as string)?.startsWith('🤖') ? "Escribe aquí las instrucciones para la IA (ej. 'Analiza el interés del cliente...')" : "Contenido del nodo"}
                        />
                    )}

                    {/* Variable Management Section - Shared for Message, Question, and Capture nodes */}
                    {((selectedNode.data?.type === 'Mensaje' || selectedNode.data?.type === 'Pregunta' || selectedNode.data?.type === 'CapturaNombre' || selectedNode.data?.type === 'CapturaEmail') || 
                      (selectedNode.type === 'Mensaje' || selectedNode.type === 'Pregunta') ||
                      (selectedNode.data?.label as string)?.startsWith('💬') ||
                      (selectedNode.data?.label as string)?.startsWith('❓') ||
                      (selectedNode.data?.label as string)?.startsWith('👤') ||
                      (selectedNode.data?.label as string)?.startsWith('📧')
                    ) && (
                        <div className="space-y-3">
                            {/* Available Variables (Buttons) */}
                            <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                <p className="text-[10px] text-white/60 mb-1 font-bold">Variables disponibles:</p>
                                <div className="flex flex-wrap gap-1">
                                    {[...PREDEFINED_VARS, ...getFlowVariables()].map(v => (
                                        <button 
                                            key={v}
                                            onClick={() => {
                                                const label = (selectedNode.data.label as string) || "";
                                                const foundPrefix = SYSTEM_PREFIXES.find(p => label.startsWith(p));
                                                const content = foundPrefix ? label.replace(foundPrefix, "") : label;
                                                updateNodeLabel(content + (content ? ' ' : '') + `{{${v}}}`);
                                            }}
                                            className="text-[9px] bg-white/10 hover:bg-white/20 text-white/70 px-1.5 py-0.5 rounded border border-white/5 transition-colors"
                                        >
                                            {`{{${v}}}`}
                                        </button>
                                    ))}
                                    <p className="text-[8px] text-white/30 mt-1 w-full italic">Haz clic para insertar en el texto</p>
                                </div>
                            </div>

                            {/* Save Answer In (Selector) */}
                            <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                <p className="text-[10px] text-white/60 mb-1 font-bold">Guardar respuesta del usuario en:</p>
                                <div className="flex gap-2">
                                    <select 
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                        value={(() => {
                                            const val = selectedNode.data?.variable as string || "";
                                            return PREDEFINED_VARS.includes(val) || getFlowVariables().includes(val) ? val : (val === "" ? "" : "custom");
                                        })()}
                                        onChange={(e) => {
                                            const variable = e.target.value;
                                            setNodes((nds) =>
                                                nds.map((node) => {
                                                    if (node.id === selectedNodeId) {
                                                        return { ...node, data: { ...node.data, variable: variable === 'custom' ? '' : variable } };
                                                    }
                                                    return node;
                                                })
                                            );
                                        }}
                                    >
                                        <option value="">-- No guardar respuesta --</option>
                                        <optgroup label="Sistema (Sincronizado)">
                                            <option value="name">Nombre del Cliente</option>
                                            <option value="email">Correo Electrónico</option>
                                            <option value="phone">Teléfono</option>
                                            <option value="budget">Presupuesto</option>
                                        </optgroup>
                                        
                                        {getFlowVariables().length > 0 && (
                                            <optgroup label="Creadas en este flujo">
                                                {getFlowVariables().map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))}
                                            </optgroup>
                                        )}

                                        <optgroup label="Acciones">
                                            <option value="custom">+ Nueva variable personalizada...</option>
                                        </optgroup>
                                    </select>
                                </div>
                                {(() => {
                                    const val = selectedNode.data?.variable as string || "";
                                    const isPredefined = PREDEFINED_VARS.includes(val);
                                    const isExistingCustom = getFlowVariables().includes(val);
                                    
                                    if (isPredefined || (isExistingCustom && val !== "")) return null;

                                    return (
                                        <input 
                                            type="text"
                                            placeholder="Nombre de la nueva variable"
                                            className="w-full mt-2 bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                            value={val}
                                            onChange={(e) => {
                                                const variable = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                                setNodes((nds) =>
                                                    nds.map((node) => {
                                                        if (node.id === selectedNodeId) {
                                                            return { ...node, data: { ...node.data, variable } };
                                                        }
                                                        return node;
                                                    })
                                                );
                                            }}
                                            autoFocus
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {(selectedNode.data.label as string)?.startsWith('🤖') ? (
                         <div className="mt-2 bg-white/5 p-2 rounded-lg border border-white/10">
                            <p className="text-[10px] text-white/60 mb-1 font-bold">Configuración de IA:</p>
                            <p className="text-[10px] text-white/40 mb-1">El historial de conversación se analiza automáticamente.</p>
                            <p className="text-[10px] text-white/40">Variables disponibles:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {[...PREDEFINED_VARS, ...getFlowVariables(), 'status'].map(v => (
                                    <code key={v} className="text-[10px] bg-primary/20 text-primary px-1 rounded cursor-pointer hover:bg-primary/30" onClick={() => {
                                        const label = (selectedNode.data.label as string) || "";
                                        const foundPrefix = SYSTEM_PREFIXES.find(p => label.startsWith(p));
                                        const content = foundPrefix ? label.replace(foundPrefix, "") : label;
                                        updateNodeLabel(content + (content ? ' ' : '') + `{{${v}}}`);
                                    }}>{`{{${v}}}`}</code>
                                ))}
                            </div>
                         </div>
                    ) : null}
                </div>

                {/* Media Upload Section */}
                {((selectedNode.data?.type === 'Mensaje' || selectedNode.data?.type === 'Pregunta') || 
                  (selectedNode.type === 'Mensaje' || selectedNode.type === 'Pregunta') ||
                  (typeof selectedNode.data?.label === 'string' && (
                    !selectedNode.data.label.startsWith('⚡') && 
                    !selectedNode.data.label.startsWith('🤖') && 
                    !selectedNode.data.label.startsWith('🏷️') &&
                    !selectedNode.data.label.startsWith('📊') &&
                    !selectedNode.data.label.startsWith('👤') &&
                    !selectedNode.data.label.startsWith('📧')
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
                    !selectedNode.data.label.startsWith('👤') &&
                    !selectedNode.data.label.startsWith('📧')
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

                {/* Auto-Continue Toggle */}
                {((selectedNode.data?.type === 'Mensaje' || selectedNode.data?.type === 'Pregunta' || selectedNode.data?.type === 'CapturaNombre' || selectedNode.data?.type === 'CapturaEmail') || 
                  (selectedNode.type === 'Mensaje' || selectedNode.type === 'Pregunta') ||
                  (typeof selectedNode.data?.label === 'string' && (
                    !selectedNode.data.label.startsWith('⚡') && 
                    !selectedNode.data.label.startsWith('🤖') && 
                    !selectedNode.data.label.startsWith('🏷️') &&
                    !selectedNode.data.label.startsWith('📊') &&
                    !selectedNode.data.label.startsWith('👤') &&
                    !selectedNode.data.label.startsWith('📧')
                  ))
                ) && (
                  <div className="border-t border-white/10 pt-4 pb-2">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex flex-col">
                        <span className="text-xs text-white/70 font-bold group-hover:text-white transition-colors">Continuar flujo automáticamente</span>
                        <span className="text-[9px] text-white/30">Activa un conector de salida adicional sin botones</span>
                      </div>
                      <div 
                        onClick={() => {
                          const current = !!selectedNode.data?.autoContinue;
                          setNodes((nds) =>
                            nds.map((node) => {
                              if (node.id === selectedNodeId) {
                                return { ...node, data: { ...node.data, autoContinue: !current } };
                              }
                              return node;
                            })
                          );
                        }}
                        className={cn(
                          "w-10 h-5 rounded-full p-1 transition-colors relative",
                          selectedNode.data?.autoContinue ? "bg-primary" : "bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-3 h-3 bg-white rounded-full transition-all duration-200",
                          selectedNode.data?.autoContinue ? "translate-x-5" : "translate-x-0"
                        )} />
                      </div>
                    </label>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex gap-2">
                    <button 
                        onClick={() => duplicateNode(selectedNodeId!)}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        <PlusCircle className="h-3 w-3" />
                        Duplicar
                    </button>
                    <button 
                        onClick={deleteSelectedNode}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        colorMode="dark"
        style={{ width: '100%', height: '100%' }}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Control", "Shift"]}
        selectionKeyCode={["s"]}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        panOnScroll={true}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          setEdges((eds) => eds.filter((eb) => eb.id !== edge.id));
        }}
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
