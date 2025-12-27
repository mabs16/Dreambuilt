"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
    MoreHorizontal,
    MessageSquare,
    Clock,
    User as UserIcon,
    Search,
    Plus,
    Filter,
    ArrowRight,
    X,
    ChevronRight,
    AlertCircle,
    Phone
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
    { id: "NUEVO", title: "Nuevos", color: "from-blue-500/20 to-blue-500/5", textColor: "text-blue-400" },
    { id: "PRECALIFICADO", title: "Precalificados", color: "from-purple-500/20 to-purple-500/5", textColor: "text-purple-400" },
    { id: "ASIGNADO", title: "Asignados", color: "from-emerald-500/20 to-emerald-500/5", textColor: "text-emerald-400" },
    { id: "CONTACTADO", title: "Contactados", color: "from-teal-500/20 to-teal-500/5", textColor: "text-teal-400" },
    { id: "SEGUIMIENTO", title: "Seguimiento", color: "from-amber-500/20 to-amber-500/5", textColor: "text-amber-400" },
    { id: "CITA", title: "Cita Agendada", color: "from-indigo-500/20 to-indigo-500/5", textColor: "text-indigo-400" },
    { id: "CIERRE", title: "Cerrados/Ganados", color: "from-green-500/20 to-green-500/5", textColor: "text-green-400" },
    { id: "PERDIDO", title: "Perdidos", color: "from-slate-500/20 to-slate-500/5", textColor: "text-slate-400" },
];

export default function PipelinePage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchLeads = useCallback(async () => {
        setLoading(leads.length === 0);
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
    }, [leads.length]);

    useEffect(() => {
        fetchLeads();

        const channel = supabase
            .channel('public:leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
                fetchLeads();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchLeads]);

    const filteredLeads = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone.includes(searchQuery)
    );

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold font-outfit tracking-tight text-white">Cargando Pipeline</p>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">Sincronizando estados de venta...</p>
                    </div>
                </div>
            </div>
        );
    }

    const timeline = [
        { id: 1, title: 'Cambio de estado', description: 'El lead pasó de NUEVO a PRECALIFICADO', date: 'Hace 2 horas', icon: ArrowRight },
        { id: 2, title: 'Mensaje enviado', description: 'Se envió mensaje de bienvenida por WhatsApp', date: 'Hace 3 horas', icon: MessageSquare },
        { id: 3, title: 'Asignación automática', description: 'Asignado al asesor Carlos Méndez', date: 'Hace 5 horas', icon: UserIcon },
    ];

    return (
        <div className="space-y-8 h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500/80">Sistema de Gestión Realtime</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight font-outfit text-white">Pipeline de Ventas</h1>
                    <p className="text-sm md:text-base text-muted-foreground font-medium">Gestión avanzada de embudo y control de SLAs corporativos.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative group flex-1 sm:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar lead..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-[250px] lg:w-[300px] pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all backdrop-blur-md"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex-1 sm:flex-none p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center">
                            <Filter className="h-5 w-5" />
                        </button>
                        <button className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black hover:scale-105 transition-all shadow-lg shadow-primary/20 whitespace-nowrap">
                            <Plus className="h-5 w-5" />
                            <span>Nuevo Lead</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-6 -mx-1 px-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="flex gap-6 min-w-max h-full">
                    {COLUMNS.map((col, idx) => (
                        <motion.div 
                            key={col.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="w-[300px] md:w-[340px] flex flex-col bg-white/2 rounded-[2.5rem] border border-white/5 overflow-hidden group/column"
                        >
                            <div className={cn(
                                "px-7 py-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r",
                                col.color
                            )}>
                                <div className="flex items-center gap-3">
                                    <span className={cn("font-black text-[11px] tracking-[0.2em] uppercase", col.textColor)}>
                                        {col.title}
                                    </span>
                                    <span className="text-[10px] font-black bg-white/10 px-2.5 py-1 rounded-lg border border-white/5 backdrop-blur-sm">
                                        {filteredLeads.filter(l => l.status === col.id).length}
                                    </span>
                                </div>
                                <button className="p-2 rounded-xl hover:bg-white/10 transition-colors opacity-40 hover:opacity-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                                <AnimatePresence mode="popLayout">
                                    {filteredLeads.filter(l => l.status === col.id).map((lead) => (
                                        <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                                    ))}
                                </AnimatePresence>
                                
                                {filteredLeads.filter(l => l.status === col.id).length === 0 && (
                                    <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/20 border-2 border-dashed border-white/5 rounded-[2rem] group-hover/column:border-white/10 transition-all duration-500">
                                        <div className="p-3 rounded-full bg-white/2 mb-2">
                                            <Plus className="h-5 w-5 opacity-20" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Sin leads</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {selectedLead && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
                            onClick={() => setSelectedLead(null)}
                        />

                        <motion.div 
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 z-[101] w-full sm:max-w-xl bg-[#080808] border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col"
                        >
                            <div className="p-8 md:p-10 border-b border-white/5 bg-gradient-to-br from-primary/5 via-transparent to-transparent relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12">
                                    <UserIcon className="h-48 w-48" />
                                </div>
                                
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-5">
                                            <div className="h-20 w-20 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-2xl shadow-primary/10">
                                                <UserIcon className="h-10 w-10" />
                                            </div>
                                            <div>
                                                <h2 className="text-3xl md:text-4xl font-black font-outfit text-white tracking-tighter">{selectedLead.name}</h2>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                    <p className="text-muted-foreground font-mono font-bold tracking-widest text-sm">{selectedLead.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-4 py-2 rounded-2xl bg-primary/10 text-primary text-[10px] uppercase font-black tracking-[0.2em] border border-primary/20">
                                                {selectedLead.status}
                                            </span>
                                            <span className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/60">
                                                ID: {selectedLead.id}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLead(null)}
                                        className="p-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] border border-white/10 transition-all text-white/50 hover:text-white"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12 scrollbar-hide">
                                <div className="grid grid-cols-2 gap-5">
                                    <a
                                        href={`/inbox?chat=${selectedLead.phone}`}
                                        className="flex flex-col items-center justify-center gap-4 bg-white text-black py-8 rounded-[2.5rem] font-black hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-white/10 group"
                                    >
                                        <div className="p-4 rounded-2xl bg-black/5 group-hover:bg-black/10 transition-colors">
                                            <MessageSquare className="h-7 w-7" />
                                        </div>
                                        <span className="text-sm tracking-tight">Conversar</span>
                                    </a>
                                    <button className="flex flex-col items-center justify-center gap-4 bg-white/2 border border-white/10 py-8 rounded-[2.5rem] font-black hover:bg-white/5 active:scale-95 transition-all group">
                                        <div className="p-4 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors text-primary">
                                            <UserIcon className="h-7 w-7" />
                                        </div>
                                        <span className="text-sm tracking-tight">Reasignar</span>
                                    </button>
                                </div>

                                <div className="space-y-10">
                                    <section className="space-y-5">
                                        <h3 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.3em] flex items-center gap-3">
                                            <div className="h-px w-8 bg-white/10" />
                                            Detalles del Perfil
                                        </h3>
                                        <div className="grid gap-5 bg-white/2 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
                                            <InfoRow label="Fuente de Captación" value={selectedLead.source || "Directo"} />
                                            <InfoRow label="Fecha de Registro" value={new Date(selectedLead.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} />
                                            <InfoRow label="Responsable" value={selectedLead.advisor || 'Sistema Automático'} highlight />
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <div className="h-px w-8 bg-white/10" />
                                                Línea de Tiempo
                                            </h3>
                                        </div>
                                        
                                        <div className="space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                                            {timeline.map((item, idx) => (
                                                <motion.div 
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * idx }}
                                                    className="relative pl-14 group"
                                                >
                                                    <div className="absolute left-0 top-0 h-12 w-12 rounded-2xl bg-white/2 border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-500 z-10 backdrop-blur-md">
                                                        <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <div className="space-y-1 py-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-black text-white group-hover:text-primary transition-colors">{item.title}</p>
                                                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{item.date}</span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground/60 font-medium leading-relaxed">{item.description}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className="p-8 md:p-10 border-t border-white/5 bg-white/2 backdrop-blur-md">
                                <button className="w-full py-5 rounded-[1.8rem] bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-500 text-xs font-black uppercase tracking-widest transition-all">
                                    Archivar Lead permanentemente
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "p-6 rounded-[2rem] bg-gradient-to-br from-white/5 to-transparent border border-white/5 transition-all cursor-pointer relative overflow-hidden group/card shadow-2xl hover:border-white/10",
                lead.risk === "risk" && "border-amber-500/30 shadow-amber-500/5 bg-amber-500/5",
                lead.risk === "expired" && "border-rose-500/30 shadow-rose-500/5 bg-rose-500/5"
            )}>
            
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover/card:from-primary/10 group-hover/card:to-transparent transition-all duration-700" />
            <div className="absolute top-0 right-10 h-1 w-8 bg-primary/20 rounded-full group-hover/card:bg-primary/40 transition-all" />

            <div className="relative z-10 space-y-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                        <h3 className="font-black text-base text-white group-hover/card:text-primary transition-colors tracking-tight leading-tight">
                            {lead.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60">
                            <div className="p-1 rounded-md bg-white/5">
                                <Phone className="h-3 w-3" />
                            </div>
                            <span className="font-mono tracking-[0.1em]">{lead.phone}</span>
                        </div>
                    </div>
                    {lead.risk && (
                        <div className={cn(
                            "p-2 rounded-xl animate-pulse shadow-lg",
                            lead.risk === "risk" ? "bg-amber-500/20 text-amber-500 border border-amber-500/20" : "bg-rose-500/20 text-rose-500 border border-rose-500/20"
                        )}>
                            <AlertCircle className="h-4 w-4" />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/card:border-primary/40 transition-all shadow-inner">
                            <UserIcon className="h-4 w-4 text-muted-foreground group-hover/card:text-primary transition-colors" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Asignado</span>
                            <span className="text-[10px] font-black text-muted-foreground group-hover/card:text-white transition-colors truncate max-w-[90px]">
                                {lead.advisor || 'SISTEMA'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest text-right">Registro</span>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/80">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{lead.time}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function InfoRow({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-widest">{label}</span>
            <span className={cn(
                "text-sm font-black tracking-tight",
                highlight ? "text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20" : "text-white/80"
            )}>
                {value}
            </span>
        </div>
    );
}
