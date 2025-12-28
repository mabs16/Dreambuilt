"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot,
    Save,
    Plus,
    Trash2,
    Settings2,
    CheckCircle2,
    RefreshCw,
  Sparkles,
  ChevronDown,
  Layout,
  Cpu,
  Zap,
  Users,
  Bell,
  Package,
  Clock,
  Globe,
  Shield,
  Workflow
} from "lucide-react";
import { cn } from "@/lib/utils";
import FlowEditor from "@/components/flow-builder/flow-editor";

interface Product {
    name: string;
    description: string;
    price?: string;
}

interface LeadQualificationConfig {
    questions: string[];
    welcomeMessage: string;
    welcomeButtonText?: string;
    completionMessage: string;
    systemPrompt?: string;
    askForName?: boolean;
    tone?: 'profesional' | 'amigable' | 'casual' | 'formal';
    businessContext?: string;
    products?: Product[];
    brochureUrl?: string;
    websiteUrl?: string;
    offHoursEnabled?: boolean;
    offHoursMessage?: string;
    workingHours?: { start: string; end: string };
}

interface AdvisorAutomationConfig {
    responseTimeLimitMinutes: number;
    reminderEnabled: boolean;
    reminderIntervalMinutes: number;
    useAiSummary: boolean;
    aiSummaryPrompt?: string;
    enableInteractiveButtons: boolean;
    assignmentMessage?: string;
    slaWarningMessage?: string;
    notesPromptMessage?: string;
    successNoteMessage?: string;
}

type AutomationConfig = LeadQualificationConfig | AdvisorAutomationConfig;

interface Automation {
    id: number;
    isActive: boolean;
    config: AutomationConfig;
    name: string;
}

const TONE_OPTIONS = [
    { value: 'profesional', label: '💼 Profesional', desc: 'Formal y ejecutivo' },
    { value: 'amigable', label: '😊 Amigable', desc: 'Cálido y accesible' },
    { value: 'casual', label: '✌️ Casual', desc: 'Relajado y cercano' },
    { value: 'formal', label: '🎩 Formal', desc: 'Muy serio y corporativo' },
];

function AutomationsContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab') as 'lead_qualification' | 'advisor_automation' | 'flow_builder' | null;
    
    const [activeTab, setActiveTab] = useState<'lead_qualification' | 'advisor_automation' | 'flow_builder'>(tabParam || 'lead_qualification');
    const [automation, setAutomation] = useState<Automation | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        flow: true,
        personality: false,
        products: false,
        schedule: false,
        advisor: true,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const fetchConfig = useCallback(async (name: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/automations?name=${name}`);
            
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Error ${res.status}: ${errorText || 'Failed to fetch'}`);
            }

            const text = await res.text();
            let data = null;
            
            if (text && text.trim().length > 0) {
                try {
                    data = JSON.parse(text);
                } catch (error) {
                    console.error("Error parsing JSON response:", error);
                }
            }
            
            if (data) {
                setAutomation(data);
            } else {
                const defaultConfig: Automation = {
                    id: 0,
                    name: name,
                    isActive: false,
                    config: name === 'lead_qualification' ? {
                        questions: [],
                        welcomeMessage: '',
                        completionMessage: ''
                    } : {
                        responseTimeLimitMinutes: 15,
                        reminderEnabled: true,
                        reminderIntervalMinutes: 5,
                        useAiSummary: true,
                        enableInteractiveButtons: true
                    }
                };
                setAutomation(defaultConfig);
            }
        } catch (error) {
            console.error("Error fetching config:", error);
            setAutomation({
                id: 0,
                name: name,
                isActive: false,
                config: name === 'lead_qualification' ? {
                    questions: [],
                    welcomeMessage: '',
                    completionMessage: ''
                } : {
                    responseTimeLimitMinutes: 15,
                    reminderEnabled: true,
                    reminderIntervalMinutes: 5,
                    useAiSummary: true,
                    enableInteractiveButtons: true
                }
            });
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam, activeTab]);

    useEffect(() => {
        fetchConfig(activeTab);
    }, [activeTab, fetchConfig]);

    const handleToggleBot = async () => {
        if (!automation) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/automations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name: activeTab,
                    isActive: !automation.isActive 
                }),
            });
            if (!res.ok) throw new Error("Error al guardar");
            setAutomation({ ...automation, isActive: !automation.isActive });
        } catch (error) {
            console.error("Error toggling bot:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!automation) return;
        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/automations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: activeTab,
                    isActive: automation.isActive,
                    config: automation.config
                }),
            });
            if (!res.ok) throw new Error("Error al guardar");
        } catch (error) {
            console.error("Error saving config:", error);
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (key: string, value: unknown) => {
        if (!automation) return;
        setAutomation({
            ...automation,
            config: { ...automation.config, [key]: value }
        });
    };

    // Validation to prevent TypeError: Cannot read properties of undefined (reading 'map')
    const isConfigLoaded = automation?.name === activeTab;
    const leadConfig = isConfigLoaded ? (automation?.config as LeadQualificationConfig) : null;
    const advisorConfig = isConfigLoaded ? (automation?.config as AdvisorAutomationConfig) : null;

    const updateQuestion = (index: number, text: string) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const config = automation.config as LeadQualificationConfig;
        const questions = [...(config.questions || [])];
        questions[index] = text;
        updateConfig('questions', questions);
    };

    const addQuestion = () => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const config = automation.config as LeadQualificationConfig;
        const questions = [...(config.questions || [])];
        updateConfig('questions', [...questions, ""]);
    };

    const removeQuestion = (index: number) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const config = automation.config as LeadQualificationConfig;
        const questions = (config.questions || []).filter((_, i) => i !== index);
        updateConfig('questions', questions);
    };

    const addProduct = () => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const config = automation.config as LeadQualificationConfig;
        const currentProducts = config.products || [];
        updateConfig('products', [...currentProducts, { name: '', description: '', price: '' }]);
    };

    const updateProduct = (index: number, field: keyof Product, value: string) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const config = automation.config as LeadQualificationConfig;
        const products = [...(config.products || [])];
        products[index] = { ...products[index], [field]: value };
        updateConfig('products', products);
    };

    const removeProduct = (index: number) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const config = automation.config as LeadQualificationConfig;
        updateConfig('products', (config.products || []).filter((_, i) => i !== index));
    };

    if (loading) return (
        <div className="flex h-[80vh] items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-xl font-bold font-outfit tracking-tight text-white">Sincronizando Cerebro</p>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Cargando modelos de IA y configuraciones...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 h-[calc(100vh-6rem)] flex flex-col overflow-hidden pb-4">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/80">Neural Automation Center</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight font-outfit text-white">Centro de Automatización</h1>
                    <p className="text-sm md:text-base text-muted-foreground font-medium max-w-2xl">
                        Gestiona el comportamiento inteligente de tus asistentes y procesos corporativos.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="flex p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('lead_qualification')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === 'lead_qualification' 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <Bot className="h-4 w-4" />
                            IA Cualificación
                        </button>
                        <button
                            onClick={() => setActiveTab('advisor_automation')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === 'advisor_automation' 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <Settings2 className="h-4 w-4" />
                            IA Gestión
                        </button>
                        <button
                            onClick={() => setActiveTab('flow_builder')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === 'flow_builder' 
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <Workflow className="h-4 w-4" />
                            Flow Builder
                        </button>
                    </div>
                    
                    {activeTab !== 'flow_builder' && (
                        <button
                            onClick={handleSaveConfig}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            <span className="text-xs uppercase tracking-widest">Guardar Cambios</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {/* Status Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/5 via-white/2 to-transparent border border-white/5 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-700">
                        {activeTab === 'lead_qualification' ? <Bot className="h-48 w-48" /> : <Cpu className="h-48 w-48" />}
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "h-20 w-20 rounded-[2.2rem] flex items-center justify-center border-2 transition-all duration-500 shadow-2xl",
                                automation?.isActive 
                                    ? "bg-primary/10 border-primary/20 text-primary shadow-primary/20" 
                                    : "bg-white/2 border-white/10 text-muted-foreground shadow-black"
                            )}>
                                {activeTab === 'lead_qualification' ? <Bot className="h-10 w-10" /> : <Cpu className="h-10 w-10" />}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-white tracking-tight">
                                    {activeTab === 'lead_qualification' ? 'Neural Qualification Engine' : 'Advisor Performance AI'}
                                </h2>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {activeTab === 'lead_qualification' 
                                        ? 'Cualificación inteligente de leads vía procesamiento de lenguaje natural.' 
                                        : 'Monitoreo de SLAs y soporte inteligente para el equipo de ventas.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-black/40 p-3 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.2em] px-4",
                                automation?.isActive ? "text-primary" : "text-muted-foreground/40"
                            )}>
                                {automation?.isActive ? "Motor Activado" : "Motor en Pausa"}
                            </span>
                            <button
                                onClick={handleToggleBot}
                                disabled={saving}
                                className={cn(
                                    "relative inline-flex h-10 w-20 items-center rounded-2xl transition-all duration-500 focus:outline-none shadow-inner",
                                    automation?.isActive ? "bg-primary shadow-primary/20" : "bg-white/5"
                                )}
                            >
                                <span className={cn(
                                    "inline-block h-7 w-7 transform rounded-xl bg-white transition-all duration-500 shadow-xl",
                                    automation?.isActive ? "translate-x-11" : "translate-x-1.5"
                                )} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Configuration Panels */}
                    <div className="lg:col-span-8 space-y-6">
                        {activeTab === 'lead_qualification' ? (
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key="lead_qualification"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-6"
                                >
                                    <ConfigSection 
                                        icon={Layout} 
                                        title="Arquitectura del Flujo" 
                                        isOpen={expandedSections.flow}
                                        onToggle={() => toggleSection('flow')}
                                    >
                                        <div className="grid gap-8 p-4">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Protocolo de Bienvenida</label>
                                                    <Sparkles className="h-4 w-4 text-primary/40" />
                                                </div>
                                                <textarea
                                                    value={leadConfig?.welcomeMessage || ''}
                                                    onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                                                    className="w-full bg-white/2 border border-white/5 rounded-[1.5rem] p-5 text-sm font-medium text-white/80 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all min-h-[120px] resize-none scrollbar-hide"
                                                    placeholder="Escribe el mensaje inicial que enviará la IA..."
                                                />
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Botón de Activación</label>
                                                    <input
                                                        type="text"
                                                        value={leadConfig?.welcomeButtonText || ''}
                                                        onChange={(e) => updateConfig('welcomeButtonText', e.target.value)}
                                                        className="w-full bg-white/2 border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 transition-all"
                                                        placeholder="Ej: Comenzar"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Identificación</label>
                                                    <div className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl">
                                                        <span className="text-sm font-bold text-white/60">Solicitar nombre</span>
                                                        <button 
                                                            onClick={() => updateConfig('askForName', !leadConfig?.askForName)}
                                                            className={cn(
                                                                "h-6 w-11 rounded-full transition-colors",
                                                                leadConfig?.askForName ? "bg-primary" : "bg-white/10"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "h-4 w-4 rounded-full bg-white transition-transform mx-1",
                                                                leadConfig?.askForName ? "translate-x-5" : "translate-x-0"
                                                            )} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Cuestionario de Cualificación</label>
                                                    <button
                                                        onClick={addQuestion}
                                                        className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Nueva Pregunta
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    {(leadConfig?.questions || []).map((q, i) => (
                                                        <motion.div 
                                                            layout
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            key={i} 
                                                            className="flex gap-3 group"
                                                        >
                                                            <div className="flex-1 relative">
                                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40">{i + 1}</span>
                                                                <input
                                                                    type="text"
                                                                    value={q}
                                                                    onChange={(e) => updateQuestion(i, e.target.value)}
                                                                    className="w-full bg-white/2 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-sm font-medium text-white/90 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => removeQuestion(i)}
                                                                className="p-4 rounded-2xl bg-white/2 border border-white/5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </ConfigSection>

                                    <ConfigSection 
                                        icon={Cpu} 
                                        title="Personalidad y Contexto" 
                                        isOpen={expandedSections.personality}
                                        onToggle={() => toggleSection('personality')}
                                    >
                                        <div className="grid gap-8 p-4">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Tono de Voz</label>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {TONE_OPTIONS.map((opt) => (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => updateConfig('tone', opt.value)}
                                                                className={cn(
                                                                    "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                                                    leadConfig?.tone === opt.value 
                                                                        ? "bg-primary/10 border-primary/40 text-primary" 
                                                                        : "bg-white/2 border-white/5 text-muted-foreground hover:bg-white/5"
                                                                )}
                                                            >
                                                                <div>
                                                                    <p className="text-xs font-black uppercase tracking-widest">{opt.label}</p>
                                                                    <p className="text-[10px] opacity-60 font-medium mt-0.5">{opt.desc}</p>
                                                                </div>
                                                                {leadConfig?.tone === opt.value && <CheckCircle2 className="h-4 w-4" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Contexto de Negocio</label>
                                                    <textarea
                                                        value={leadConfig?.businessContext || ''}
                                                        onChange={(e) => updateConfig('businessContext', e.target.value)}
                                                        className="w-full bg-white/2 border border-white/5 rounded-[1.5rem] p-5 text-sm font-medium text-white/80 focus:ring-2 focus:ring-primary/20 min-h-[220px] resize-none scrollbar-hide"
                                                        placeholder="Define quién eres, qué vendes y cuál es tu propuesta de valor única..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </ConfigSection>

                                    <ConfigSection 
                                        icon={Package} 
                                        title="Catálogo de Productos" 
                                        isOpen={expandedSections.products}
                                        onToggle={() => toggleSection('products')}
                                    >
                                        <div className="p-4 space-y-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-xs text-muted-foreground font-medium">Define los productos que la IA puede ofrecer durante la charla.</p>
                                                <button
                                                    onClick={addProduct}
                                                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    Añadir Producto
                                                </button>
                                            </div>
                                            <div className="grid gap-4">
                                                {(leadConfig?.products || []).map((p, i) => (
                                                    <motion.div 
                                                        layout
                                                        key={i} 
                                                        className="p-6 bg-white/2 border border-white/5 rounded-[2rem] space-y-4 relative group"
                                                    >
                                                        <button
                                                            onClick={() => removeProduct(i)}
                                                            className="absolute top-6 right-6 p-2 text-rose-500/20 hover:text-rose-500 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                        <div className="grid md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Nombre</label>
                                                                <input
                                                                    type="text"
                                                                    value={p.name}
                                                                    onChange={(e) => updateProduct(i, 'name', e.target.value)}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Precio (Opcional)</label>
                                                                <input
                                                                    type="text"
                                                                    value={p.price}
                                                                    onChange={(e) => updateProduct(i, 'price', e.target.value)}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-primary"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Descripción para la IA</label>
                                                            <textarea
                                                                value={p.description}
                                                                onChange={(e) => updateProduct(i, 'description', e.target.value)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-medium text-white/70 min-h-[80px] resize-none"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </ConfigSection>
                                </motion.div>
                            </AnimatePresence>
                        ) : activeTab === 'flow_builder' ? (
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key="flow_builder"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="h-[80vh]"
                                >
                                    <FlowEditor />
                                </motion.div>
                            </AnimatePresence>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key="advisor_automation"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-6"
                                >
                                    <ConfigSection 
                                        icon={Clock} 
                                        title="Protocolos de Tiempo (SLA)" 
                                        isOpen={expandedSections.advisor}
                                        onToggle={() => toggleSection('advisor')}
                                    >
                                        <div className="grid gap-8 p-4">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Límite de Respuesta (Min)</label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                                        <input
                                                            type="number"
                                                            value={advisorConfig?.responseTimeLimitMinutes || 15}
                                                            onChange={(e) => updateConfig('responseTimeLimitMinutes', parseInt(e.target.value))}
                                                            className="w-full bg-white/2 border border-white/5 rounded-2xl p-4 pl-12 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Frecuencia de Recordatorios</label>
                                                    <div className="relative">
                                                        <Bell className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                                                        <input
                                                            type="number"
                                                            value={advisorConfig?.reminderIntervalMinutes || 5}
                                                            onChange={(e) => updateConfig('reminderIntervalMinutes', parseInt(e.target.value))}
                                                            className="w-full bg-white/2 border border-white/5 rounded-2xl p-4 pl-12 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Mensaje de Alerta SLA</label>
                                                <textarea
                                                    value={advisorConfig?.slaWarningMessage || ''}
                                                    onChange={(e) => updateConfig('slaWarningMessage', e.target.value)}
                                                    className="w-full bg-white/2 border border-white/5 rounded-[1.5rem] p-5 text-sm font-medium text-white/80 focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none scrollbar-hide"
                                                    placeholder="Mensaje que recibe el asesor cuando se vence el tiempo..."
                                                />
                                            </div>
                                        </div>
                                    </ConfigSection>

                                    <ConfigSection 
                                        icon={Zap} 
                                        title="Inteligencia de Asignación" 
                                        isOpen={true}
                                        onToggle={() => {}}
                                    >
                                        <div className="grid gap-8 p-4">
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="flex items-center justify-between p-6 bg-white/2 border border-white/5 rounded-[2rem] group hover:border-primary/20 transition-all">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black uppercase tracking-widest text-white">Resúmenes IA</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">Generar resumen del lead automáticamente</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => updateConfig('useAiSummary', !advisorConfig?.useAiSummary)}
                                                        className={cn(
                                                            "h-7 w-12 rounded-full transition-all duration-500",
                                                            advisorConfig?.useAiSummary ? "bg-primary shadow-lg shadow-primary/20" : "bg-white/10"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-5 w-5 rounded-full bg-white transition-transform mx-1",
                                                            advisorConfig?.useAiSummary ? "translate-x-5" : "translate-x-0"
                                                        )} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between p-6 bg-white/2 border border-white/5 rounded-[2rem] group hover:border-primary/20 transition-all">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black uppercase tracking-widest text-white">Botones Interactivos</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">Habilitar botones de acción rápida</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => updateConfig('enableInteractiveButtons', !advisorConfig?.enableInteractiveButtons)}
                                                        className={cn(
                                                            "h-7 w-12 rounded-full transition-all duration-500",
                                                            advisorConfig?.enableInteractiveButtons ? "bg-primary shadow-lg shadow-primary/20" : "bg-white/10"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-5 w-5 rounded-full bg-white transition-transform mx-1",
                                                            advisorConfig?.enableInteractiveButtons ? "translate-x-5" : "translate-x-0"
                                                        )} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest">Prompt Personalizado de Resumen</label>
                                                <textarea
                                                    value={advisorConfig?.aiSummaryPrompt || ''}
                                                    onChange={(e) => updateConfig('aiSummaryPrompt', e.target.value)}
                                                    className="w-full bg-white/2 border border-white/5 rounded-[1.5rem] p-5 text-sm font-medium text-white/80 focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-none scrollbar-hide"
                                                    placeholder="Instrucciones para que la IA genere el resumen perfecto..."
                                                />
                                            </div>
                                        </div>
                                    </ConfigSection>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>

                    {/* Right Sidebar - Preview & Help */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="sticky top-0 space-y-6">
                            {/* Preview Card */}
                            <div className="p-8 rounded-[2.5rem] bg-black border border-white/10 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                                <h3 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <Globe className="h-3 w-3" />
                                    Live Preview
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 p-4 rounded-2xl rounded-tl-none bg-white/5 border border-white/10 text-xs font-medium text-white/80 leading-relaxed">
                                            {leadConfig?.welcomeMessage || "Hola, soy tu asistente virtual. ¿En qué puedo ayudarte?"}
                                        </div>
                                    </div>
                                    
                                    {leadConfig?.welcomeButtonText && (
                                        <div className="flex justify-end pr-11">
                                            <div className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                                {leadConfig.welcomeButtonText}
                                            </div>
                                        </div>
                                    )}

                                    {leadConfig?.questions && leadConfig.questions.length > 0 && (
                                        <div className="flex gap-3 pt-4">
                                            <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                                                <Bot className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex-1 p-4 rounded-2xl rounded-tl-none bg-white/5 border border-white/10 text-xs font-medium text-white/80 leading-relaxed italic opacity-60">
                                                {leadConfig.questions[0]}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Help Card */}
                            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] mb-4">Mabo Intelligence</h3>
                                <p className="text-xs font-medium text-white/60 leading-relaxed mb-6">
                                    Nuestra IA utiliza modelos de lenguaje avanzados para entender la intención del usuario y extraer información clave de forma natural.
                                </p>
                                <div className="space-y-3">
                                    {[
                                        { icon: Shield, text: "Privacidad Corporativa" },
                                        { icon: Zap, text: "Respuesta Sub-segundo" },
                                        { icon: Users, text: "Multi-agente nativo" }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-white/40">
                                            <item.icon className="h-4 w-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfigSection({ icon: Icon, title, children, isOpen, onToggle }: { 
  icon: React.ElementType, 
  title: string, 
  children: React.ReactNode, 
  isOpen: boolean, 
  onToggle: () => void 
}) {
    return (
        <div className="rounded-[2.5rem] border border-white/5 bg-white/2 overflow-hidden transition-all duration-500 hover:border-white/10">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-8 hover:bg-white/2 transition-colors group"
            >
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-widest">{title}</span>
                </div>
                <div className={cn(
                    "h-10 w-10 rounded-xl bg-white/2 border border-white/5 flex items-center justify-center transition-transform duration-500",
                    isOpen ? "rotate-180 bg-primary/5 border-primary/20 text-primary" : "text-muted-foreground"
                )}>
                    <ChevronDown className="h-5 w-5" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    >
                        <div className="px-8 pb-8 border-t border-white/5 bg-white/[0.01]">
                            <div className="pt-8">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AutomationsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[80vh] items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
        }>
            <AutomationsContent />
        </Suspense>
    );
}
