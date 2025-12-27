"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    MoreHorizontal,
    MessageSquare,
    Clock,
    User as UserIcon,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvisorAssignment {
    advisor_id: number;
    ended_at: string | null;
    advisors: {
        name: string;
    } | null;
}

interface Lead {
    id: number;
    name: string;
    phone: string;
    status: string;
    created_at: string;
    source?: string;
    advisor?: string;
    assignments?: AdvisorAssignment[];
    time?: string;
    risk?: 'risk' | 'expired' | null;
}

const COLUMNS = [
    { id: "NUEVO", title: "Nuevos", color: "bg-blue-500/10 border-blue-500/20 text-blue-500" },
    { id: "PRECALIFICADO", title: "Precalificados", color: "bg-purple-500/10 border-purple-500/20 text-purple-500" },
    { id: "ASIGNADO", title: "Asignados", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
    { id: "CONTACTADO", title: "Contactados", color: "bg-teal-500/10 border-teal-500/20 text-teal-500" },
    { id: "SEGUIMIENTO", title: "Seguimiento", color: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
    { id: "CITA", title: "Cita Agendada", color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500" },
    { id: "CIERRE", title: "Cerrados/Ganados", color: "bg-green-600/10 border-green-600/20 text-green-600" },
    { id: "PERDIDO", title: "Perdidos/No Resp.", color: "bg-slate-500/10 border-slate-500/20 text-slate-500" },
];

export default function PipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    useEffect(() => {
        async function fetchLeads() {
            setLoading(true);
            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    assignments(
                        advisor_id,
                        ended_at,
                        advisors(name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching leads:', error);
            } else {
                // Process leads to extract the active advisor name
                const processed: Lead[] = (data || []).map(lead => {
                    const assignments = lead.assignments as unknown as AdvisorAssignment[] | undefined;
                    const activeAssignment = assignments?.find(a => !a.ended_at);
                    return {
                        ...lead,
                        advisor: activeAssignment?.advisors?.name,
                        time: new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                });
                setLeads(processed);
            }
            setLoading(false);
        }

        fetchLeads();

        // Optional: Realtime subscription
        const channel = supabase
            .channel('public:leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
                fetchLeads();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return <div className="flex h-full items-center justify-center">Cargando pipeline...</div>;
    }



    // ... (rest of fetchLeads)

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] relative">
            {/* ... Header ... */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-outfit">Pipeline de Ventas</h1>
                    <p className="text-muted-foreground">Gestión de leads y control de SLA.</p>
                </div>
                {/* ... Filters ... */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar lead..."
                            className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-6 min-w-max h-full">
                    {COLUMNS.map((col) => (
                        <div key={col.id} className="w-80 flex flex-col bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                            <div className={cn("px-4 py-3 border-b flex items-center justify-between", col.color)}>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm tracking-wider uppercase">{col.title}</span>
                                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                                        {leads.filter(l => l.status === col.id).length}
                                    </span>
                                </div>
                                <MoreHorizontal className="h-4 w-4 opacity-50" />
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {leads.filter(l => l.status === col.id).map((lead) => (
                                    <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Slide Over Detail View */}
            {selectedLead && (
                <div className="absolute inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setSelectedLead(null)}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-md bg-card border-l border-border h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedLead.name}</h2>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="font-mono">{selectedLead.phone}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold">
                                        {selectedLead.status}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLead(null)}
                                className="p-2 hover:bg-accent rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <a
                                href={`/inbox?chat=${selectedLead.phone}`}
                                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Ir al Chat
                            </a>
                            <button className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:bg-secondary/80 transition-all border border-border">
                                <UserIcon className="h-4 w-4" />
                                Reasignar
                            </button>
                        </div>

                        {/* Details */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Información</h3>
                                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Fuente:</span>
                                        <span className="font-medium">{selectedLead.source}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Creado:</span>
                                        <span className="font-medium">{new Date(selectedLead.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Asesor Actual:</span>
                                        <span className="font-medium text-primary">{selectedLead.advisor || 'Sin asignar'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Placeholder for timeline/notes */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notas Recientes</h3>
                                <div className="text-sm text-muted-foreground italic text-center p-8 border border-dashed border-border rounded-xl">
                                    No hay notas registradas aún.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
    const isRisk = lead.risk === "risk";
    const isExpired = lead.risk === "expired";

    return (
        <div
            onClick={onClick}
            className={cn(
                "p-4 rounded-lg bg-card border border-border transition-all hover:border-primary/50 group cursor-pointer hover:shadow-lg hover:shadow-primary/5",
                isRisk && "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
                isExpired && "border-rose-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            )}>
            {/* ... Content remains mostly same but verify ... */}
            <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{lead.name}</h3>
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">#{lead.id}</span>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{lead.time}</span>
                    {isRisk && <span className="text-amber-500 font-bold ml-auto uppercase text-[10px] animate-pulse">! Inmediato</span>}
                    {isExpired && <span className="text-rose-500 font-bold ml-auto uppercase text-[10px]">! Vencido</span>}
                </div>

                {lead.advisor && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <UserIcon className="h-3 w-3" />
                        <span className="font-medium text-foreground/80">{lead.advisor}</span>
                    </div>
                )}

                {!lead.advisor && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>{lead.source || "Web"}</span>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Ver Detalle</button>
                <div className="flex -space-x-1">
                    <div className="h-4 w-4 rounded-full bg-slate-800 border border-border" />
                    <div className="h-4 w-4 rounded-full bg-slate-700 border border-border" />
                </div>
            </div>
        </div>
    );
}
