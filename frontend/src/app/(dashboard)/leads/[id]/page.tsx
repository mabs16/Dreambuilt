"use client";

import { use } from "react";
import {
    ArrowLeft,
    Phone,
    MessageSquare,
    Calendar,
    User as UserIcon,
    ShieldCheck,
    Clock,
    ExternalLink,
    History,
    AlertCircle,
    LucideIcon
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LEAD_DATA = {
    id: "1254",
    name: "Juan Sebastián Pérez",
    phone: "+57 321 000 0000",
    source: "Facebook Ads - Campaña Navidad",
    status: "ASIGNADO",
    advisor: "Carlos Rodríguez",
    email: "j.s.perez@example.com",
    created_at: "24 Dic 2025, 12:00 PM",
    sla_status: "expired",
    timeline: [
        { id: 1, type: "STATUS_CHANGE", from: "PRECALIFICADO", to: "ASIGNADO", time: "12:15 PM", icon: ShieldCheck, color: "text-emerald-500", desc: "Lead asignado automáticamente por el motor." },
        { id: 2, type: "SLA_FAILED", time: "12:30 PM", icon: Clock, color: "text-rose-500", desc: "SLA de 15m fallido. Penalización aplicada (-5 pts)." },
        { id: 3, type: "INTENTO_CONTACTO", advisor: "Carlos R.", time: "12:35 PM", icon: MessageSquare, color: "text-blue-500", desc: "El asesor reportó un intento de contacto vía WhatsApp." },
        { id: 4, type: "STATUS_CHANGE", from: "ASIGNADO", to: "CONTACTADO", time: "12:40 PM", icon: History, color: "text-teal-500", desc: "Lead marcado como contactado exitosamente." },
    ]
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link
                    href="/pipeline"
                    className="p-2 rounded-full bg-white/5 border border-border hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight font-outfit">{LEAD_DATA.name}</h1>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary text-primary-foreground tracking-widest">
                            #{id || LEAD_DATA.id}
                        </span>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                        <Calendar className="h-3.5 w-3.5" /> Ingresó el {LEAD_DATA.created_at}
                    </p>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-all">
                        <Phone className="h-4 w-4" />
                        Llamada Control
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-border rounded-lg text-sm font-bold hover:bg-white/10 transition-all">
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                        Forzar Reasignación
                    </button>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Info Column */}
                <div className="space-y-6">
                    <section className="p-6 rounded-xl border border-border bg-card/30 glass space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-3">Información del Lead</h2>

                        <InfoItem icon={Phone} label="Teléfono" value={LEAD_DATA.phone} isLink />
                        <InfoItem icon={MessageSquare} label="Origen" value={LEAD_DATA.source} />
                        <InfoItem icon={UserIcon} label="Asesor Asignado" value={LEAD_DATA.advisor} />

                        <div className="pt-4">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Estado Actual</span>
                            <div className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border",
                                LEAD_DATA.status === "ASIGNADO" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            )}>
                                {LEAD_DATA.status}
                            </div>
                        </div>
                    </section>

                    <section className="p-6 rounded-xl border border-border bg-amber-500/5 glass border-amber-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-500">Estado de SLA</h2>
                            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                        </div>
                        <p className="text-sm text-amber-500/80 mb-4">Este lead excedió el tiempo límite de contacto inicial por 15 minutos.</p>
                        <div className="h-2 w-full bg-amber-500/20 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-[100%]" />
                        </div>
                    </section>
                </div>

                {/* Timeline Column */}
                <div className="lg:col-span-2 p-8 rounded-xl border border-border bg-card/10 glass min-h-[600px]">
                    <h2 className="text-xl font-bold font-outfit mb-8 flex items-center gap-3">
                        <History className="h-5 w-5 text-muted-foreground" />
                        Línea de Tiempo del Lead
                    </h2>

                    <div className="relative space-y-12">
                        <div className="timeline-line" />

                        {LEAD_DATA.timeline.map((event) => (
                            <div key={event.id} className="relative flex gap-6 animate-in slide-in-from-left duration-700">
                                <div className={cn(
                                    "h-6 w-6 rounded-full bg-background border-2 z-10 flex items-center justify-center shrink-0",
                                    event.type === "SLA_FAILED" ? "border-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "border-border"
                                )}>
                                    <event.icon className={cn("h-3 w-3", event.color)} />
                                </div>

                                <div className="flex-1 -mt-0.5">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{event.time}</span>
                                        <span className={cn("text-sm font-bold", event.color)}>
                                            {event.type.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/70 leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5">
                                        {event.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface InfoItemProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    isLink?: boolean;
}

function InfoItem({ icon: Icon, label, value, isLink }: InfoItemProps) {
    return (
        <div className="flex items-center justify-between py-1 group">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{value}</span>
                {isLink && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
        </div>
    );
}
