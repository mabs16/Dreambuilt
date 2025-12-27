"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
    Bot,
    Save,
    Plus,
    Trash2,
    Settings2,
    MessageSquare,
    MessageCircle,
    CheckCircle2,
    RefreshCw,
    Sparkles,
    FileText,
    Bell,
    Clock,
    Globe,
    Package,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function AutomationsPage() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab') as 'lead_qualification' | 'advisor_automation' | null;
    
    const [activeTab, setActiveTab] = useState<'lead_qualification' | 'advisor_automation'>(tabParam || 'lead_qualification');
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

    const fetchConfig = useCallback(async (name: string) => {
        setLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:3001/automations?name=${name}`);
            
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Error ${res.status}: ${errorText || 'Failed to fetch'}`);
            }

            // Primero obtenemos el texto para verificar si está vacío
            const text = await res.text();
            let data = null;
            
            if (text && text.trim().length > 0) {
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error("Error parsing JSON response:", e);
                }
            }
            
            console.log(`Config loaded for ${name}:`, data);
            
            if (data) {
                setAutomation(data);
            } else {
                // Si no hay datos, inicializamos con valores por defecto
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
            // Fallback a configuración por defecto en caso de error de red
            setAutomation(prev => {
                if (prev) return prev;
                return {
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
            });
        } finally {
            setLoading(false);
        }
    }, []);

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
            const res = await fetch("http://127.0.0.1:3001/automations", {
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
            alert("Error al actualizar el estado");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!automation) return;
        setSaving(true);
        try {
            const res = await fetch("http://127.0.0.1:3001/automations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: activeTab,
                    isActive: automation.isActive,
                    config: automation.config
                }),
            });
            if (!res.ok) throw new Error("Error al guardar");
            alert("Configuración guardada correctamente");
        } catch (error) {
            console.error("Error saving config:", error);
            alert("Error al guardar la configuración");
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

    const leadConfig = automation?.config as LeadQualificationConfig;
    const advisorConfig = automation?.config as AdvisorAutomationConfig;

    const updateQuestion = (index: number, text: string) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const questions = [...(automation.config as LeadQualificationConfig).questions];
        questions[index] = text;
        updateConfig('questions', questions);
    };

    const addQuestion = () => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const questions = [...(automation.config as LeadQualificationConfig).questions];
        updateConfig('questions', [...questions, "Nueva pregunta..."]);
    };

    const removeQuestion = (index: number) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const questions = (automation.config as LeadQualificationConfig).questions.filter((_, i) => i !== index);
        updateConfig('questions', questions);
    };

    const addProduct = () => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const currentProducts = (automation.config as LeadQualificationConfig).products || [];
        updateConfig('products', [...currentProducts, { name: '', description: '', price: '' }]);
    };

    const updateProduct = (index: number, field: keyof Product, value: string) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        const products = [...((automation.config as LeadQualificationConfig).products || [])];
        products[index] = { ...products[index], [field]: value };
        updateConfig('products', products);
    };

    const removeProduct = (index: number) => {
        if (!automation || activeTab !== 'lead_qualification') return;
        updateConfig('products', ((automation.config as LeadQualificationConfig).products || []).filter((_, i) => i !== index));
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setActiveTab('lead_qualification')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap",
                        activeTab === 'lead_qualification'
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-card hover:bg-accent/10 text-muted-foreground"
                    )}
                >
                    Calificación de Leads
                </button>
                <button
                    onClick={() => setActiveTab('advisor_automation')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap",
                        activeTab === 'advisor_automation'
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-card hover:bg-accent/10 text-muted-foreground"
                    )}
                >
                    Automatización Asesores
                </button>
            </div>

            {/* Header section with Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/30 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-4 rounded-xl transition-colors duration-500",
                        automation?.isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        {activeTab === 'lead_qualification' ? <Bot className="h-8 w-8" /> : <Settings2 className="h-8 w-8" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {activeTab === 'lead_qualification' ? 'Lead Qualification Bot' : 'Advisor Automation'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {activeTab === 'lead_qualification' 
                                ? 'Configura el asistente de IA para precalificar prospectos' 
                                : 'Optimiza la comunicación y seguimiento de tus asesores'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-background/50 p-2 rounded-xl border border-border">
                    <span className={cn(
                        "text-sm font-medium px-4",
                        automation?.isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                        {automation?.isActive ? "Activado" : "Desactivado"}
                    </span>
                    <button
                        onClick={handleToggleBot}
                        disabled={saving}
                        className={cn(
                            "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none",
                            automation?.isActive ? "bg-primary" : "bg-muted"
                        )}
                    >
                        <span className={cn(
                            "inline-block h-6 w-6 transform rounded-full bg-background transition-transform",
                            automation?.isActive ? "translate-x-7" : "translate-x-1"
                        )} />
                    </button>
                </div>
            </div>

            {/* Content for Lead Qualification */}
            {activeTab === 'lead_qualification' && (
                <div className="space-y-4">
                    {/* Section 1: Flow Configuration */}
                    <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
                        <button
                            onClick={() => toggleSection('flow')}
                            className="w-full flex items-center justify-between p-4 hover:bg-accent/10 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <MessageSquare className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Flujo de Conversación</span>
                            </div>
                            {expandedSections.flow ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>

                        {expandedSections.flow && (
                            <div className="p-6 pt-0 space-y-6 border-t border-border">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Mensaje de Bienvenida</label>
                                    <textarea
                                        value={leadConfig?.welcomeMessage || ''}
                                        onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                                        className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Texto del Botón de Inicio</label>
                                    <input
                                        type="text"
                                        value={leadConfig?.welcomeButtonText || ''}
                                        onChange={(e) => updateConfig('welcomeButtonText', e.target.value)}
                                        className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary"
                                        placeholder="Comenzar"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-muted-foreground">Preguntas de Calificación</label>
                                        <button
                                            onClick={addQuestion}
                                            className="text-xs flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <Plus className="h-3 w-3" /> Añadir Pregunta
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {leadConfig?.questions.map((q, i) => (
                                            <div key={i} className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-3 top-3 text-xs font-bold text-muted-foreground/50">{i + 1}</span>
                                                    <input
                                                        type="text"
                                                        value={q}
                                                        onChange={(e) => updateQuestion(i, e.target.value)}
                                                        className="w-full bg-background/50 border border-input rounded-lg p-3 pl-8 text-sm focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeQuestion(i)}
                                                    className="p-3 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Mensaje de Finalización</label>
                                    <textarea
                                        value={leadConfig?.completionMessage || ''}
                                        onChange={(e) => updateConfig('completionMessage', e.target.value)}
                                        className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Personality & Context */}
                    <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
                        <button
                            onClick={() => toggleSection('personality')}
                            className="w-full flex items-center justify-between p-4 hover:bg-accent/10 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Personalidad y Contexto AI</span>
                            </div>
                            {expandedSections.personality ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>

                        {expandedSections.personality && (
                            <div className="p-6 pt-0 space-y-6 border-t border-border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Tono de Voz</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {TONE_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => updateConfig('tone', opt.value)}
                                                    className={cn(
                                                        "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                                                        leadConfig?.tone === opt.value
                                                            ? "border-primary bg-primary/10"
                                                            : "border-border bg-background/50 hover:bg-accent/10"
                                                    )}
                                                >
                                                    <span className="text-sm font-bold">{opt.label}</span>
                                                    <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">¿Preguntar nombre?</span>
                                            </div>
                                            <button
                                                onClick={() => updateConfig('askForName', !leadConfig?.askForName)}
                                                className={cn(
                                                    "relative inline-flex h-5 w-10 items-center rounded-full transition-colors",
                                                    leadConfig?.askForName ? "bg-primary" : "bg-muted"
                                                )}
                                            >
                                                <span className={cn(
                                                    "inline-block h-3 w-3 transform rounded-full bg-background transition-transform",
                                                    leadConfig?.askForName ? "translate-x-6" : "translate-x-1"
                                                )} />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">System Prompt (Avanzado)</label>
                                            <textarea
                                                value={leadConfig?.systemPrompt || ''}
                                                onChange={(e) => updateConfig('systemPrompt', e.target.value)}
                                                placeholder="Instrucciones directas para la IA..."
                                                className="w-full bg-background/50 border border-input rounded-lg p-3 text-xs font-mono focus:ring-1 focus:ring-primary min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Contexto de la Empresa</label>
                                    <textarea
                                        value={leadConfig?.businessContext || ''}
                                        onChange={(e) => updateConfig('businessContext', e.target.value)}
                                        placeholder="Describe tu empresa, misión, valores, etc. para que la IA tenga contexto."
                                        className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[100px]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Products & Resources */}
                    <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
                        <button
                            onClick={() => toggleSection('products')}
                            className="w-full flex items-center justify-between p-4 hover:bg-accent/10 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Productos y Recursos</span>
                            </div>
                            {expandedSections.products ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>

                        {expandedSections.products && (
                            <div className="p-6 pt-0 space-y-6 border-t border-border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <FileText className="h-4 w-4" /> URL del Brochure
                                        </label>
                                        <input
                                            type="text"
                                            value={leadConfig?.brochureUrl || ''}
                                            onChange={(e) => updateConfig('brochureUrl', e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Globe className="h-4 w-4" /> Sitio Web
                                        </label>
                                        <input
                                            type="text"
                                            value={leadConfig?.websiteUrl || ''}
                                            onChange={(e) => updateConfig('websiteUrl', e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-muted-foreground">Catálogo de Productos/Servicios</label>
                                        <button
                                            onClick={addProduct}
                                            className="text-xs flex items-center gap-1 text-primary hover:underline"
                                        >
                                            <Plus className="h-3 w-3" /> Añadir Producto
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(leadConfig?.products || []).map((p, i) => (
                                            <div key={i} className="group relative flex flex-col md:flex-row gap-3 p-4 rounded-xl border border-border bg-background/30">
                                                <div className="flex-1 space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            value={p.name}
                                                            onChange={(e) => updateProduct(i, 'name', e.target.value)}
                                                            placeholder="Nombre del producto"
                                                            className="bg-transparent border-b border-border p-1 text-sm font-bold focus:border-primary outline-none"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={p.price || ''}
                                                            onChange={(e) => updateProduct(i, 'price', e.target.value)}
                                                            placeholder="Precio (opcional)"
                                                            className="bg-transparent border-b border-border p-1 text-sm focus:border-primary outline-none"
                                                        />
                                                    </div>
                                                    <textarea
                                                        value={p.description}
                                                        onChange={(e) => updateProduct(i, 'description', e.target.value)}
                                                        placeholder="Breve descripción para la IA"
                                                        className="w-full bg-transparent border border-dashed border-border rounded-lg p-2 text-xs focus:border-primary outline-none resize-none"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeProduct(i)}
                                                    className="absolute -top-2 -right-2 md:static p-2 text-muted-foreground hover:text-destructive bg-background md:bg-transparent rounded-full border border-border md:border-0 shadow-sm md:shadow-none transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Schedule & Out of Hours */}
                    <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
                        <button
                            onClick={() => toggleSection('schedule')}
                            className="w-full flex items-center justify-between p-4 hover:bg-accent/10 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Horarios y Fuera de Servicio</span>
                            </div>
                            {expandedSections.schedule ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>

                        {expandedSections.schedule && (
                            <div className="p-6 pt-0 space-y-6 border-t border-border">
                                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/30">
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium">Activar horario fuera de servicio</span>
                                        <p className="text-xs text-muted-foreground">El bot responderá un mensaje especial cuando estés cerrado.</p>
                                    </div>
                                    <button
                                        onClick={() => updateConfig('offHoursEnabled', !leadConfig?.offHoursEnabled)}
                                        className={cn(
                                            "relative inline-flex h-6 w-12 items-center rounded-full transition-colors",
                                            leadConfig?.offHoursEnabled ? "bg-primary" : "bg-muted"
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                                            leadConfig?.offHoursEnabled ? "translate-x-7" : "translate-x-1"
                                        )} />
                                    </button>
                                </div>

                                {leadConfig?.offHoursEnabled && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground">Hora de Apertura</label>
                                                <input
                                                    type="time"
                                                    value={leadConfig?.workingHours?.start || '09:00'}
                                                    onChange={(e) => updateConfig('workingHours', { ...leadConfig?.workingHours, start: e.target.value })}
                                                    className="w-full bg-background/50 border border-input rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground">Hora de Cierre</label>
                                                <input
                                                    type="time"
                                                    value={leadConfig?.workingHours?.end || '18:00'}
                                                    onChange={(e) => updateConfig('workingHours', { ...leadConfig?.workingHours, end: e.target.value })}
                                                    className="w-full bg-background/50 border border-input rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Mensaje Fuera de Horario</label>
                                            <textarea
                                                value={leadConfig?.offHoursMessage || ''}
                                                onChange={(e) => updateConfig('offHoursMessage', e.target.value)}
                                                placeholder="Hola, en este momento estamos cerrados..."
                                                className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content for Advisor Automation */}
            {activeTab === 'advisor_automation' && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card/20 overflow-hidden">
                        <button
                            onClick={() => toggleSection('advisor')}
                            className="w-full flex items-center justify-between p-4 hover:bg-accent/10 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <span className="font-semibold">Configuración de Seguimiento</span>
                            </div>
                            {expandedSections.advisor ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>

                        {expandedSections.advisor && (
                            <div className="p-6 pt-0 space-y-8 border-t border-border">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Columna Izquierda: Configuración Técnica */}
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                                <Settings2 className="h-4 w-4" /> Parámetros de Operación
                                            </h3>
                                            
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-muted-foreground">Tiempo Límite de Respuesta (minutos)</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="60"
                                                        step="1"
                                                        value={advisorConfig?.responseTimeLimitMinutes || 15}
                                                        onChange={(e) => updateConfig('responseTimeLimitMinutes', parseInt(e.target.value))}
                                                        className="flex-1 accent-primary"
                                                    />
                                                    <span className="text-lg font-bold w-12 text-center">{advisorConfig?.responseTimeLimitMinutes || 15} </span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground italic">El asesor debe marcar como &quot;CONTACTADO&quot; antes de este tiempo para evitar penalizaciones.</p>
                                            </div>

                                            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/30">
                                                <div className="space-y-1">
                                                    <span className="text-sm font-medium">Activar Recordatorios</span>
                                                    <p className="text-xs text-muted-foreground">Enviar un mensaje al asesor si no ha respondido.</p>
                                                </div>
                                                <button
                                                    onClick={() => updateConfig('reminderEnabled', !advisorConfig?.reminderEnabled)}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-12 items-center rounded-full transition-colors",
                                                        advisorConfig?.reminderEnabled ? "bg-primary" : "bg-muted"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                                                        advisorConfig?.reminderEnabled ? "translate-x-7" : "translate-x-1"
                                                    )} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/30">
                                                <div className="space-y-1">
                                                    <span className="text-sm font-medium">Botones Interactivos</span>
                                                    <p className="text-xs text-muted-foreground">Usar botones de WhatsApp para acciones rápidas.</p>
                                                </div>
                                                <button
                                                    onClick={() => updateConfig('enableInteractiveButtons', !advisorConfig?.enableInteractiveButtons)}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-12 items-center rounded-full transition-colors",
                                                        advisorConfig?.enableInteractiveButtons ? "bg-primary" : "bg-muted"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                                                        advisorConfig?.enableInteractiveButtons ? "translate-x-7" : "translate-x-1"
                                                    )} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/30">
                                                <div className="space-y-1">
                                                    <span className="text-sm font-medium">Resumen IA Automático</span>
                                                    <p className="text-xs text-muted-foreground">Enviar un resumen de la intención del lead al asesor.</p>
                                                </div>
                                                <button
                                                    onClick={() => updateConfig('useAiSummary', !advisorConfig?.useAiSummary)}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-12 items-center rounded-full transition-colors",
                                                        advisorConfig?.useAiSummary ? "bg-primary" : "bg-muted"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                                                        advisorConfig?.useAiSummary ? "translate-x-7" : "translate-x-1"
                                                    )} />
                                                </button>
                                            </div>
                                        </div>

                                        {advisorConfig?.useAiSummary && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <label className="text-sm font-medium text-muted-foreground">Instrucciones para el Resumen (IA)</label>
                                                <textarea
                                                    value={advisorConfig?.aiSummaryPrompt || ''}
                                                    onChange={(e) => updateConfig('aiSummaryPrompt', e.target.value)}
                                                    placeholder="Ej: Resume los puntos clave y destaca el interés principal..."
                                                    className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[100px] resize-none"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Columna Derecha: Mensajes Personalizables */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                            <MessageCircle className="h-4 w-4" /> Mensajes de Automatización
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                    <Bot className="h-3 w-3" /> Mensaje de Asignación
                                                </label>
                                                <textarea
                                                    value={advisorConfig?.assignmentMessage || ''}
                                                    onChange={(e) => updateConfig('assignmentMessage', e.target.value)}
                                                    placeholder="Hola {{name}}, tienes un nuevo lead asignado..."
                                                    className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Variables: {'{{lead_id}}'}, {'{{lead_name}}'}, {'{{phone}}'}, {'{{summary}}'}, {'{{response_limit}}'}</p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                    <Bell className="h-3 w-3" /> Alerta de SLA (15 min)
                                                </label>
                                                <textarea
                                                    value={advisorConfig?.slaWarningMessage || ''}
                                                    onChange={(e) => updateConfig('slaWarningMessage', e.target.value)}
                                                    placeholder="⚠️ ALERTA: Han pasado 15 minutos sin contacto..."
                                                    className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Variables: {'{{lead_id}}'}, {'{{lead_name}}'}</p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                    <FileText className="h-3 w-3" /> Solicitud de Notas
                                                </label>
                                                <textarea
                                                    value={advisorConfig?.notesPromptMessage || ''}
                                                    onChange={(e) => updateConfig('notesPromptMessage', e.target.value)}
                                                    placeholder="Por favor, escribe las notas del contacto realizado..."
                                                    className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Variables: {'{{lead_id}}'}</p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                    <CheckCircle2 className="h-3 w-3" /> Confirmación de Notas
                                                </label>
                                                <textarea
                                                    value={advisorConfig?.successNoteMessage || ''}
                                                    onChange={(e) => updateConfig('successNoteMessage', e.target.value)}
                                                    placeholder="✅ Nota guardada exitosamente."
                                                    className="w-full bg-background/50 border border-input rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Variables: {'{{lead_id}}'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
                                    <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
                                        <h3 className="text-sm font-bold flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-primary" />
                                            Flujo de Trabajo del Asesor (WhatsApp CRM)
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                                                <p className="text-xs text-muted-foreground">El asesor recibe el lead con resumen de IA y botones de acción.</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                                                <p className="text-xs text-muted-foreground">Al presionar <span className="text-primary font-bold">CONTACTADO</span>, el lead cambia de estado automáticamente.</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                                                <p className="text-xs text-muted-foreground">El sistema solicita notas al asesor para el histórico del lead.</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
                                                <p className="text-xs text-muted-foreground">Comandos rápidos: <code className="bg-background px-1 rounded">#lead SEGUIMIENTO</code>, <code className="bg-background px-1 rounded">#lead CITA</code>, <code className="bg-background px-1 rounded">#lead CERRADO</code>.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                                        <div className="flex items-center gap-2 text-amber-500">
                                            <Clock className="h-4 w-4" />
                                            <span className="text-xs font-bold">Recordatorios Activos</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Si el recordatorio está activo, se enviará un mensaje cada <strong>{advisorConfig?.reminderIntervalMinutes || 5} minutos</strong> hasta que el asesor responda o se alcance el tiempo límite.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-border">
                <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                    {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Guardar Configuración
                </button>
            </div>
        </div>
    );
 }