"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    RefreshCw,
    MessageSquare,
    User,
    Calendar,
    ArrowUpRight,
    Phone,
    Clock,
    Zap,
    Sparkles,
    LayoutGrid,
    List as ListIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
    "NUEVO": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "PRECALIFICADO": "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "ASIGNADO": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "CONTACTADO": "bg-teal-500/10 text-teal-500 border-teal-500/20",
    "SEGUIMIENTO": "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "CITA": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "CIERRE": "bg-green-600/10 text-green-600 border-green-600/20",
    "PERDIDO": "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

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
    avatar_url?: string;
    assignments?: AdvisorAssignment[];
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Detectar si es móvil para cambiar la vista por defecto
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 1024) {
                setViewMode('grid');
            }
        };
        
        const timeoutId = setTimeout(checkMobile, 0);
        
        window.addEventListener('resize', checkMobile);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    const fetchLeads = useCallback(async () => {
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
                };
            });
            setLeads(processed);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // Use a timeout to avoid synchronous setState warning during mount
        const timeoutId = setTimeout(() => {
            fetchLeads();
        }, 0);

        // Realtime subscription
        const channel = supabase
            .channel('public:leads_table')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
                fetchLeads();
            })
            .subscribe();

        return () => {
            clearTimeout(timeoutId);
            supabase.removeChannel(channel);
        };
    }, [fetchLeads]);

    const filteredLeads = leads.filter(lead =>
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm)
    );

    const getInitials = (name?: string) => {
        if (!name || name === 'Prospecto WhatsApp') return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-6 flex flex-col min-h-screen pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Gestión de Prospectos</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight font-outfit">Base de Leads</h1>
                    <p className="text-muted-foreground font-medium">
                        Administra y califica a tus prospectos en tiempo real.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 md:flex-none min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            className="w-full pl-10 pr-4 py-2.5 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                viewMode === 'list' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ListIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setLoading(true);
                            fetchLeads();
                        }}
                        className="p-2.5 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 hover:bg-accent transition-all shadow-sm group active:scale-95"
                    >
                        <RefreshCw className={cn("h-4 w-4 transition-transform duration-500", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
                {loading && leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="relative">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                            <Zap className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Sincronizando base de datos...</p>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-[2rem] bg-card/30">
                        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                            <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="font-bold text-foreground">No se encontraron leads</p>
                        <p className="text-sm text-muted-foreground mt-1">Intenta con otro término de búsqueda</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {viewMode === 'list' ? (
                            <motion.div
                                key="list-view"
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="border border-border/50 rounded-[2rem] bg-card/30 backdrop-blur-xl overflow-hidden shadow-xl"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                                            <tr>
                                                <th className="px-8 py-5 font-bold tracking-wider">Prospecto</th>
                                                <th className="px-8 py-5 font-bold tracking-wider">Estatus</th>
                                                <th className="px-8 py-5 font-bold tracking-wider">Asignación</th>
                                                <th className="px-8 py-5 font-bold tracking-wider">Origen</th>
                                                <th className="px-8 py-5 font-bold tracking-wider">Registro</th>
                                                <th className="px-8 py-5 font-bold tracking-wider text-right">Detalle</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {filteredLeads.map((lead) => (
                                                <motion.tr 
                                                    key={lead.id} 
                                                    variants={itemVariants}
                                                    className="group hover:bg-primary/5 transition-colors"
                                                >
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shadow-inner overflow-hidden">
                                                                {lead.avatar_url ? (
                                                                    <Image 
                                                                        src={lead.avatar_url} 
                                                                        alt={lead.name}
                                                                        width={40}
                                                                        height={40}
                                                                        className="object-cover w-full h-full"
                                                                    />
                                                                ) : (
                                                                    getInitials(lead.name)
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-foreground group-hover:text-primary transition-colors">{lead.name}</span>
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    {lead.phone}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase border shadow-sm",
                                                            STATUS_COLORS[lead.status] || "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                                        )}>
                                                            {lead.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        {lead.advisor ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shadow-sm">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <span className="font-bold text-foreground/80">{lead.advisor}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-muted-foreground/50 italic">
                                                                <Clock className="h-3 w-3" />
                                                                <span className="text-xs font-medium">Sin asignar</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 w-fit border border-border/50">
                                                            <MessageSquare className="h-3 w-3 text-primary/70" />
                                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">{lead.source || "Web"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-muted-foreground font-medium">
                                                        {format(new Date(lead.created_at), "dd MMM, HH:mm", { locale: es })}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <Link
                                                            href={`/inbox?chat=${lead.phone}`}
                                                            className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-90"
                                                        >
                                                            <ArrowUpRight className="h-5 w-5" />
                                                        </Link>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="grid-view"
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            >
                                {filteredLeads.map((lead) => (
                                    <motion.div
                                        key={lead.id}
                                        variants={itemVariants}
                                        whileHover={{ y: -5 }}
                                        className="group relative overflow-hidden rounded-[2rem] bg-card/30 backdrop-blur-xl border border-border/50 p-6 shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl text-primary font-black shadow-inner overflow-hidden">
                                                {lead.avatar_url ? (
                                                    <Image 
                                                        src={lead.avatar_url} 
                                                        alt={lead.name}
                                                        width={56}
                                                        height={56}
                                                        className="object-cover w-full h-full"
                                                    />
                                                ) : (
                                                    getInitials(lead.name)
                                                )}
                                            </div>
                                            <span className={cn(
                                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm",
                                                STATUS_COLORS[lead.status] || "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                            )}>
                                                {lead.status}
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-xl font-black font-outfit text-foreground group-hover:text-primary transition-colors line-clamp-1">{lead.name}</h3>
                                                <p className="text-muted-foreground font-bold flex items-center gap-1.5 mt-1">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {lead.phone}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Asesor</p>
                                                    <p className="text-xs font-bold truncate text-foreground/80">
                                                        {lead.advisor || "Sin asignar"}
                                                    </p>
                                                </div>
                                                <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Origen</p>
                                                    <p className="text-xs font-bold truncate text-foreground/80">
                                                        {lead.source || "Web"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-border/30">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="h-4 w-4" />
                                                    <span className="text-xs font-bold">
                                                        {format(new Date(lead.created_at), "dd MMM, yyyy", { locale: es })}
                                                    </span>
                                                </div>
                                                <Link
                                                    href={`/inbox?chat=${lead.phone}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Chat
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
