"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Clock, 
    MessageSquare, 
    UserCheck, 
    Save, 
    Loader2, 
    AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdvisorAutomationConfig, MessageConfig, ButtonConfig } from "@/types/automation";

interface ConfigSectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}

function ConfigSection({ title, icon: Icon, children }: ConfigSectionProps) {
    return (
        <div className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg font-outfit text-white">{title}</h3>
            </div>
            <div className="p-6 space-y-6">
                {children}
            </div>
        </div>
    );
}

interface MessageEditorProps {
    label: string;
    config: MessageConfig;
    onChange: (config: MessageConfig) => void;
    variables: string[];
}

function MessageEditor({ label, config, onChange, variables }: MessageEditorProps) {
    const handleMessageChange = (msg: string) => {
        onChange({ ...config, message: msg });
    };

    const handleButtonChange = (index: number, field: keyof ButtonConfig, value: string | boolean) => {
        const newButtons = [...config.buttons];
        newButtons[index] = { ...newButtons[index], [field]: value };
        onChange({ ...config, buttons: newButtons });
    };

    return (
        <div className="space-y-4 p-4 rounded-xl bg-black/20 border border-white/5">
            <label className="text-xs font-black text-primary uppercase tracking-widest block">
                {label}
            </label>
            
            <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Mensaje</label>
                <textarea 
                    value={config.message}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                    placeholder={`Escribe el mensaje para ${label.toLowerCase()}...`}
                />
                <p className="text-[10px] text-muted-foreground">
                    Variables: {variables.map(v => <code key={v} className="text-primary mr-1">{v}</code>)}
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Botones Interactivos</label>
                <div className="grid gap-2">
                    {config.buttons.map((btn, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                            <input 
                                type="checkbox"
                                checked={btn.enabled}
                                onChange={(e) => handleButtonChange(idx, 'enabled', e.target.checked)}
                                className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50"
                            />
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                <div className="text-xs text-muted-foreground px-2 py-1.5 bg-black/20 rounded">
                                    Acción: <span className="font-mono text-white">{btn.action}</span>
                                </div>
                                <input 
                                    type="text"
                                    value={btn.label}
                                    onChange={(e) => handleButtonChange(idx, 'label', e.target.value)}
                                    className="bg-transparent border-b border-white/10 text-xs px-2 py-1.5 focus:border-primary outline-none"
                                    placeholder="Etiqueta del botón"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function PromptEditor({ label, value, onChange, variables, placeholder }: { label: string, value: string, onChange: (val: string) => void, variables: string[], placeholder?: string }) {
    return (
        <div className="space-y-2 p-4 rounded-xl bg-black/20 border border-white/5">
            <label className="text-xs font-black text-primary uppercase tracking-widest block">
                {label}
            </label>
            <textarea 
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-24 bg-background border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                placeholder={placeholder || `Mensaje para ${label.toLowerCase()}...`}
            />
            <p className="text-[10px] text-muted-foreground">
                Variables: {variables.map(v => <code key={v} className="text-primary mr-1">{v}</code>)}
            </p>
        </div>
    );
}

export default function AdvisorConfigPanel() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const [config, setConfig] = useState<AdvisorAutomationConfig>({
        responseTimeLimitMinutes: 15,
        reminderEnabled: true,
        reminderIntervalMinutes: 5,
        useAiSummary: true,
        enableInteractiveButtons: true,
        
        // Default Legacy (just in case)
        assignmentMessage: "🔔 *NUEVO LEAD ASIGNADO*",
        
        // New Configs
        systemAssignment: {
            message: "🔔 *NUEVO LEAD ASIGNADO*\n\nℹ️ Presiona el botón de ver info para obtener detalles.\n\n⚠️ *URGENCIA:* Debes responder en menos de {{response_limit}} min. o será reasignado.",
            buttons: [
                { action: 'INFO', label: 'ℹ️ VER INFO LEAD', enabled: true },
                { action: 'REJECT', label: '⛔ NO PUEDO ATENDER', enabled: true }
            ]
        },
        systemAssignmentAction: {
            message: "⚠️ *URGENCIA:* El lead debe de ser contactado desde el momento que se te asignó en menos de {{response_limit}} min. o será reasignado.\n\n✅ Presiona el botón de contactado después de tu primer mensaje con el lead.",
            buttons: [
                { action: 'CONTACTED', label: '✅ LEAD CONTACTADO', enabled: true }
            ]
        },
        manualAssignment: {
            message: "👤 *TE HAN ASIGNADO UN LEAD MANUALMENTE*\n\nHola, se te ha asignado el lead {{lead_name}} ({{phone}}) manualmente.\n\nPor favor revísalo y contáctalo de inmediato.",
            buttons: [
                { action: 'INFO', label: 'ℹ️ VER INFO', enabled: true },
                { action: 'REJECT', label: '⛔ NO PUEDO ATENDER', enabled: true }
            ]
        },
        manualAssignmentAction: {
            message: "⚠️ *URGENCIA:* Contacta al lead lo antes posible.\n\n✅ Presiona el botón de contactado después de tu primer mensaje.",
            buttons: [
                { action: 'CONTACTED', label: '✅ LEAD CONTACTADO', enabled: true }
            ]
        },
        reassignment: {
            message: "⚠️ *LEAD REASIGNADO*\n\nEl lead {{lead_name}} te ha sido reasignado debido a falta de seguimiento previo.\n\n¡Es tu oportunidad de recuperarlo!",
            buttons: [
                { action: 'INFO', label: 'ℹ️ VER INFO', enabled: true },
                { action: 'REJECT', label: '⛔ NO PUEDO ATENDER', enabled: true }
            ]
        },
        reassignmentAction: {
            message: "⚠️ *RECUPERACIÓN:* Este lead requiere atención inmediata.\n\n✅ Confirma que has retomado el contacto.",
            buttons: [
                { action: 'CONTACTED', label: '✅ LEAD CONTACTADO', enabled: true }
            ]
        },

        followUpInstructions: "*Próximos pasos sugeridos:*\n- Si el lead está en proceso, envía: `{{lead_id}} SEGUIMIENTO`\n- Si agendaste cita, envía: `{{lead_id}} CITA`\n- Si ya hiciste recorrido, envía: `{{lead_id}} RECORRIDO`\n- Para descartar lead, envía: `{{lead_id}} DESCARTADO`",
        
        // Command Prompts Defaults
        contactedPrompt: "👍 Lead #{{lead_id}} marcado como CONTACTADO.\n\nPor favor, escribe ahora una breve nota sobre este primer contacto:",
        followUpPrompt: "🔄 Lead #{{lead_id}} ahora está en SEGUIMIENTO. ¿Qué avances hubo hoy? Escribe una breve nota:",
        appointmentPrompt: "📅 CITA agendada para el Lead #{{lead_id}}. ¡Excelente!\n\nPor favor, indica la fecha y detalles en una nota:",
        tourPrompt: "🚶 RECORRIDO registrado para el Lead #{{lead_id}}. ¡Muy bien!\n\nPor favor, escribe una nota sobre cómo fue el recorrido:",
        discardedPrompt: "📉 Lead #{{lead_id}} marcado como DESCARTADO. ¿Cuál fue el motivo? (Escribe una nota)",
        closedPrompt: "🥳 ¡FELICIDADES! Lead #{{lead_id}} marcado como CIERRE/CLIENTE.\n\nEscribe una nota final sobre la venta:",

        slaWarningMessage: "⚠️ *ALERTA DE SLA*: Han pasado 15 minutos sin contacto con el Lead #{{lead_id}} ({{lead_name}}).\n\nEl lead será reasignado y tu puntuación ha sido penalizada. 📉",
        rollCallEnabled: false,
        rollCallSchedules: ["09:00"],
        rollCallMessage: "📢 *PASE DE LISTA*\n\nPor favor reporta tu asistencia respondiendo con 'PRESENTE' o tu ubicación actual."
    });
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [activeMessageType, setActiveMessageType] = useState<'system' | 'manual' | 'reassignment'>('system');

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/api/automations?name=advisor_automation`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.config) {
                    setConfig(prev => ({ ...prev, ...data.config }));
                    setIsActive(data.isActive);
                }
            }
        } catch (error) {
            console.error("Error fetching config:", error);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${apiUrl}/api/automations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: 'advisor_automation',
                    isActive: isActive,
                    config: config
                }),
            });
            
            if (!res.ok) throw new Error("Error saving");
            
            // Show success feedback (could be a toast)
        } catch (error) {
            console.error("Error saving config:", error);
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = <K extends keyof AdvisorAutomationConfig>(key: K, value: AdvisorAutomationConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    /*
    const toggleSchedule = (time: string) => {
        const current = config.rollCallSchedules || [];
        if (current.includes(time)) {
            updateConfig('rollCallSchedules', current.filter(t => t !== time));
        } else {
            updateConfig('rollCallSchedules', [...current, time].sort());
        }
    };
    */

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b border-white/5 mb-6">
                <div>
                    <h2 className="text-2xl font-bold font-outfit text-white">Configuración Operativa</h2>
                    <p className="text-muted-foreground">Define cómo interactúa el sistema con tu equipo humano.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/5">
                        <div className={cn("h-2.5 w-2.5 rounded-full", isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500")} />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {isActive ? "Sistema Activo" : "Sistema Pausado"}
                        </span>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        GUARDAR CAMBIOS
                    </button>
                </div>
            </div>

            <div className="grid gap-8">
                {/* 1. Comunicación Automática */}
                <ConfigSection title="Comunicación Automática" icon={MessageSquare}>
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                             <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Mensajes de Asignación</h4>
                             <div className="relative">
                                <select
                                    value={activeMessageType}
                                    onChange={(e) => setActiveMessageType(e.target.value as 'system' | 'manual' | 'reassignment')}
                                    className="bg-black/40 border border-white/10 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 outline-none"
                                >
                                    <option value="system">🤖 Asignación de Sistema</option>
                                    <option value="manual">👤 Asignación Manual</option>
                                    <option value="reassignment">⚠️ Reasignación (SLA)</option>
                                </select>
                             </div>
                        </div>

                        <div className="bg-white/5 rounded-xl border border-white/5 p-1">
                            {activeMessageType === 'system' && (
                                <>
                                    <MessageEditor 
                                        label="Asignación Automática (Fase 1: Notificación)"
                                        config={config.systemAssignment || { message: "", buttons: [] }}
                                        onChange={(val) => updateConfig('systemAssignment', val)}
                                        variables={['{{lead_id}}', '{{lead_name}}', '{{phone}}', '{{summary}}', '{{response_limit}}']}
                                    />
                                    <div className="h-px bg-white/5 my-1" />
                                    <MessageEditor 
                                        label="Asignación Automática (Fase 2: Acción de Contacto)"
                                        config={config.systemAssignmentAction || { message: "", buttons: [] }}
                                        onChange={(val) => updateConfig('systemAssignmentAction', val)}
                                        variables={['{{lead_name}}', '{{response_limit}}']}
                                    />
                                </>
                            )}

                            {activeMessageType === 'manual' && (
                                <>
                                    <MessageEditor 
                                        label="Asignación Manual (Fase 1: Notificación)"
                                        config={config.manualAssignment || { message: "", buttons: [] }}
                                        onChange={(val) => updateConfig('manualAssignment', val)}
                                        variables={['{{lead_id}}', '{{lead_name}}', '{{phone}}']}
                                    />
                                    <div className="h-px bg-white/5 my-1" />
                                    <MessageEditor 
                                        label="Asignación Manual (Fase 2: Acción de Contacto)"
                                        config={config.manualAssignmentAction || { message: "", buttons: [] }}
                                        onChange={(val) => updateConfig('manualAssignmentAction', val)}
                                        variables={['{{lead_name}}']}
                                    />
                                </>
                            )}

                            {activeMessageType === 'reassignment' && (
                                <>
                                    <MessageEditor 
                                        label="Reasignación (Fase 1: Notificación)"
                                        config={config.reassignment || { message: "", buttons: [] }}
                                        onChange={(val) => updateConfig('reassignment', val)}
                                        variables={['{{lead_id}}', '{{lead_name}}']}
                                    />
                                    <div className="h-px bg-white/5 my-1" />
                                    <MessageEditor 
                                        label="Reasignación (Fase 2: Acción de Contacto)"
                                        config={config.reassignmentAction || { message: "", buttons: [] }}
                                        onChange={(val) => updateConfig('reassignmentAction', val)}
                                        variables={['{{lead_name}}']}
                                    />
                                </>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block mb-4">
                                Instrucciones de Seguimiento (Opcional)
                            </label>
                            <textarea 
                                value={config.followUpInstructions}
                                onChange={(e) => updateConfig('followUpInstructions', e.target.value)}
                                className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                                placeholder="Instrucciones post-asignación..."
                            />
                        </div>
                    </div>
                </ConfigSection>

                {/* 1.5 Respuestas a Comandos */}
                <ConfigSection title="Gestión de Respuestas y Seguimiento" icon={MessageSquare}>
                    <div className="grid md:grid-cols-2 gap-4">
                        <PromptEditor 
                            label="Respuesta al marcar CONTACTADO"
                            value={config.contactedPrompt || ''}
                            onChange={(val) => updateConfig('contactedPrompt', val)}
                            variables={['{{lead_id}}', '{{lead_name}}']}
                        />
                        <PromptEditor 
                            label="Respuesta al marcar SEGUIMIENTO"
                            value={config.followUpPrompt || ''}
                            onChange={(val) => updateConfig('followUpPrompt', val)}
                            variables={['{{lead_id}}', '{{lead_name}}']}
                        />
                        <PromptEditor 
                            label="Respuesta al marcar CITA"
                            value={config.appointmentPrompt || ''}
                            onChange={(val) => updateConfig('appointmentPrompt', val)}
                            variables={['{{lead_id}}', '{{lead_name}}']}
                        />
                        <PromptEditor 
                            label="Respuesta al marcar RECORRIDO"
                            value={config.tourPrompt || ''}
                            onChange={(val) => updateConfig('tourPrompt', val)}
                            variables={['{{lead_id}}', '{{lead_name}}']}
                        />
                        <PromptEditor 
                            label="Respuesta al marcar DESCARTADO"
                            value={config.discardedPrompt || ''}
                            onChange={(val) => updateConfig('discardedPrompt', val)}
                            variables={['{{lead_id}}', '{{lead_name}}']}
                        />
                        <PromptEditor 
                            label="Respuesta al marcar CIERRE"
                            value={config.closedPrompt || ''}
                            onChange={(val) => updateConfig('closedPrompt', val)}
                            variables={['{{lead_id}}', '{{lead_name}}']}
                        />
                    </div>
                </ConfigSection>

                {/* 2. Reglas de SLA */}
                <ConfigSection title="Reglas de Tiempo (SLA)" icon={Clock}>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block">
                                    Tiempo Límite de Respuesta
                                </label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="number" 
                                        value={config.responseTimeLimitMinutes}
                                        onChange={(e) => updateConfig('responseTimeLimitMinutes', parseInt(e.target.value))}
                                        className="w-24 bg-background border border-white/10 rounded-xl p-3 text-center font-bold text-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                    <span className="text-sm font-medium text-muted-foreground">minutos</span>
                                </div>
                            </div>

                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-rose-200">Consecuencia de Incumplimiento</p>
                                    <p className="text-[10px] text-rose-200/60">
                                        Si se excede el tiempo, el lead será reasignado automáticamente y se restarán puntos al asesor.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block">
                                Mensaje de Alerta SLA
                            </label>
                            <textarea 
                                value={config.slaWarningMessage}
                                onChange={(e) => updateConfig('slaWarningMessage', e.target.value)}
                                className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Variables: <code className="text-primary">{`{{lead_id}}`}</code>, <code className="text-primary">{`{{lead_name}}`}</code>
                            </p>
                        </div>
                    </div>
                </ConfigSection>

                {/* 3. Disponibilidad de Asesores */}
                <ConfigSection title="Disponibilidad de Asesores" icon={UserCheck}>
                    <div className="flex flex-col gap-6">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                            <UserCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-emerald-200">Sistema Reactivo</p>
                                <p className="text-[10px] text-emerald-200/60">
                                    El asesor activa su disponibilidad enviando &quot;Disponible&quot; y la desactiva con &quot;No disponible&quot;.
                                    La sesión expira automáticamente en 24 horas.
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block">
                                    Respuesta: &quot;Disponible&quot;
                                </label>
                                <textarea 
                                    value={config.availabilityOnMessage || ""}
                                    onChange={(e) => updateConfig('availabilityOnMessage', e.target.value)}
                                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                                    placeholder="✅ Disponibilidad activada..."
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest block">
                                    Respuesta: &quot;No disponible&quot;
                                </label>
                                <textarea 
                                    value={config.availabilityOffMessage || ""}
                                    onChange={(e) => updateConfig('availabilityOffMessage', e.target.value)}
                                    className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                                    placeholder="⛔ Disponibilidad desactivada..."
                                />
                            </div>
                        </div>
                    </div>
                </ConfigSection>
            </div>
        </div>
    );
}
