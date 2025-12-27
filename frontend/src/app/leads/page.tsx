"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Search,
    RefreshCw,
    MessageSquare,
    User,
    Calendar,
    ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
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
    assignments?: AdvisorAssignment[];
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-outfit">Base de Leads</h1>
                    <p className="text-muted-foreground">Vista tabular de todos los prospectos registrados.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setLoading(true);
                            fetchLeads();
                        }}
                        className="p-2 rounded-lg bg-secondary border border-border hover:bg-accent transition-colors"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-medium">Lead</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium">Asignación</th>
                                <th className="px-6 py-4 font-medium">Fuente</th>
                                <th className="px-6 py-4 font-medium">Fecha Registro</th>
                                <th className="px-6 py-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        Cargando datos...
                                    </td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        No se encontraron leads.
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{lead.name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{lead.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                                STATUS_COLORS[lead.status] || "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                            )}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.advisor ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                                        <User className="h-3 w-3" />
                                                    </div>
                                                    <span className="font-medium text-foreground">{lead.advisor}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MessageSquare className="h-3 w-3" />
                                                <span>{lead.source || "Web"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>{format(new Date(lead.created_at), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/inbox?chat=${lead.phone}`}
                                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs"
                                            >
                                                Ver Chat
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
