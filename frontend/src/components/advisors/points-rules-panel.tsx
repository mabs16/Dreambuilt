"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

function RuleItem({ label, points, color }: { label: string, points: string, color: string }) {
    return (
        <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-muted-foreground font-medium">{label}</span>
            <span className={cn("font-bold font-mono", color)}>{points}</span>
        </div>
    );
}

export default function PointsRulesPanel() {
    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b border-white/5 mb-6">
                <div>
                    <h2 className="text-2xl font-bold font-outfit text-white">Reglas de Puntos</h2>
                    <p className="text-muted-foreground">Sistema de gamificación y penalizaciones para el equipo.</p>
                </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg font-outfit text-white">Tabla de Puntuación</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <RuleItem label="Cierre de Venta" points="+200" color="text-emerald-500" />
                        <RuleItem label="Cita Agendada" points="+25" color="text-emerald-400" />
                        <RuleItem label="Recorrido" points="+50" color="text-emerald-400" />
                        <RuleItem label="Nota de Calidad" points="+2" color="text-emerald-300/80" />
                        
                        <div className="col-span-full h-px bg-white/5 my-2" />
                        
                        <RuleItem label="Resp. Flash (< 5 min)" points="+2" color="text-emerald-300" />
                        <RuleItem label="Resp. Normal (5-10 min)" points="+1" color="text-emerald-200/60" />
                        
                        <div className="col-span-full h-px bg-white/5 my-2" />
                        
                        <RuleItem label="Rechazo Rápido (< 5 min)" points="0" color="text-emerald-200/40" />
                        <RuleItem label="Rechazo Lento (5-10 min)" points="-2" color="text-rose-300" />
                        
                        <div className="col-span-full h-px bg-white/5 my-2" />

                        <RuleItem label="SLA Fallido" points="-30" color="text-rose-500" />
                        <RuleItem label="Reasignación Forzada" points="-10" color="text-rose-600" />
                        <RuleItem label="Abandono (72h sin gestión)" points="-20" color="text-rose-700 font-black" />
                    </div>
                </div>
            </div>
        </div>
    );
}
