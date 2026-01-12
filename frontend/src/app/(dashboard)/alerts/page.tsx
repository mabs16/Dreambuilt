"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    AlertCircle,
    Clock,
    RefreshCcw,
    CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
    id: string | number;
    type: string;
    severity: 'critical' | 'high' | 'medium';
    lead?: string;
    advisor?: string;
    time: string;
    desc: string;
    created_at: string;
    payload?: {
        message?: string;
    };
    leads?: { name: string };
    advisors?: { name: string };
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAlerts() {
            setLoading(true);
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    leads(name),
                    advisors(name)
                `)
                .or('type.eq.SLA_EXPIRED,type.eq.REASSIGNED,type.eq.FROZEN,type.eq.INVALID_OWNERSHIP_ATTEMPT,type.eq.SLA_FAILED')
                .order('created_at', { ascending: false });

            if (error) console.error('Error fetching alerts:', error);
            else {
                const processed: Alert[] = (data || []).map((a: unknown) => {
                    const alert = a as Alert;
                    return {
                        ...alert,
                        lead: alert.leads?.name,
                        advisor: alert.advisors?.name,
                        time: new Date(alert.created_at).toLocaleString(),
                        severity: alert.type === 'FROZEN' ? 'critical' : (alert.type === 'SLA_FAILED' ? 'high' : 'medium'),
                        desc: alert.payload?.message || `Evento de sistema: ${alert.type}`
                    };
                });
                setAlerts(processed);
            }
            setLoading(false);
        }

        fetchAlerts();
    }, []);

    if (loading) return <div className="p-8">Cargando alertas...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-outfit text-rose-500">Centro de Alertas</h1>
                    <p className="text-muted-foreground">Incidentes críticos y fallos de SLA en tiempo real.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 bg-white/5 border border-border rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
                        Marcar todo como leído
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {alerts.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl">
                        <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                        <p>No hay alertas críticas en este momento.</p>
                        <p className="text-xs">Todo funciona según lo esperado.</p>
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={cn(
                                "p-6 rounded-xl border bg-card/30 glass flex gap-6 items-start transition-all hover:translate-x-1",
                                alert.severity === "critical" ? "border-rose-500/50" :
                                    alert.severity === "high" ? "border-amber-500/50" : "border-border"
                            )}
                        >
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                alert.type === "SLA_EXPIRED" || alert.type === "SLA_FAILED" ? "bg-amber-500/20 text-amber-500" :
                                    alert.type === "REASSIGNED" ? "bg-blue-500/20 text-blue-500" :
                                        "bg-rose-500/20 text-rose-500"
                            )}>
                                {alert.type === "SLA_EXPIRED" || alert.type === "SLA_FAILED" ? <Clock className="h-5 w-5" /> :
                                    alert.type === "REASSIGNED" ? <RefreshCcw className="h-5 w-5" /> :
                                        <AlertCircle className="h-5 w-5" />}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-bold text-lg flex items-center gap-2 font-outfit">
                                        {alert.type === "SLA_EXPIRED" || alert.type === "SLA_FAILED" ? "SLA Vencido" :
                                            alert.type === "REASSIGNED" ? "Reasignación Automática" :
                                                alert.type === "FROZEN" ? "Lead Congelado" : "Alerta de Sistema"}
                                        {alert.severity === "critical" && <span className="text-[10px] font-black uppercase bg-rose-500 text-white px-2 py-0.5 rounded animate-pulse">Crítico</span>}
                                    </h3>
                                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                                </div>
                                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{alert.desc}</p>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lead:</span>
                                        <span className="text-sm font-medium">{alert.lead || 'Sin ID'}</span>
                                    </div>
                                    {alert.advisor && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Asesor:</span>
                                            <span className="text-sm font-medium">{alert.advisor}</span>
                                        </div>
                                    )}
                                    <div className="ml-auto flex gap-2">
                                        <button className="text-xs font-bold uppercase tracking-widest bg-white/5 border border-border px-3 py-1 rounded hover:bg-white/10 transition-all">Detalle</button>
                                        <button className="text-xs font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-3 py-1 rounded hover:bg-emerald-500/30 transition-all flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Resolver
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
