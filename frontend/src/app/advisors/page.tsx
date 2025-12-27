"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    Trophy,
    User as UserIcon,
    Plus,
    Trash2,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Advisor {
    id: string | number;
    name: string;
    phone: string;
    score: number;
    status: string;
    created_at: string;
}

export default function AdvisorsPage() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAdvisor, setNewAdvisor] = useState({ name: "", countryCode: "52", phone: "" });
    const [registrationStep, setRegistrationStep] = useState<1 | 2>(1);
    const [otpPin, setOtpPin] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const countryCodes = [
        { code: "52", label: "🇲🇽 +52", name: "México" },
        { code: "1", label: "🇺🇸 +1", name: "USA" },
        { code: "34", label: "🇪🇸 +34", name: "España" },
        { code: "57", label: "🇨🇴 +57", name: "Colombia" },
        { code: "54", label: "🇦🇷 +54", name: "Argentina" },
        { code: "56", label: "🇨🇱 +56", name: "Chile" },
        { code: "51", label: "🇵🇪 +51", name: "Perú" },
    ];

    async function fetchAdvisors() {
        setLoading(true);
        const { data, error } = await supabase
            .from('advisors')
            .select('*')
            .order('score', { ascending: false });

        if (error) console.error('Error fetching advisors:', error);
        else setAdvisors(data || []);
        setLoading(false);
    }

    useEffect(() => {
        fetchAdvisors();

        const channel = supabase
            .channel('public:advisors')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'advisors' }, () => {
                fetchAdvisors();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string | number | null, name: string }>({
        isOpen: false,
        id: null,
        name: ""
    });

    const handleAddAdvisor = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // Clean phone: only digits
        const cleanPhonePart = newAdvisor.phone.replace(/\D/g, "");
        const fullPhone = newAdvisor.countryCode + cleanPhonePart;

        try {
            const response = await fetch(`${apiUrl}/advisors/request-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newAdvisor.name, phone: fullPhone }),
            });

            if (!response.ok) throw new Error("Error al enviar OTP");

            setRegistrationStep(2);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        const cleanPhonePart = newAdvisor.phone.replace(/\D/g, "");
        const fullPhone = newAdvisor.countryCode + cleanPhonePart;

        try {
            const response = await fetch(`${apiUrl}/advisors/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: fullPhone, otp: otpPin }),
            });

            if (!response.ok) throw new Error("Código OTP inválido");

            setIsAddModalOpen(false);
            setRegistrationStep(1);
            setNewAdvisor({ name: "", countryCode: "52", phone: "" });
            setOtpPin("");
            fetchAdvisors();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error al verificar OTP";
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteAdvisor = async () => {
        if (!deleteModal.id) return;

        console.log("LOG: Iniciando proceso de eliminación para ID:", deleteModal.id);

        try {
            console.log("LOG: Llamando a Supabase DELETE...");
            const { error } = await supabase
                .from('advisors')
                .delete()
                .eq('id', deleteModal.id);

            if (error) {
                console.error("LOG: Error de Supabase:", error);
                alert("Error al eliminar: " + error.message);
            } else {
                console.log("LOG: Respuesta de Supabase exitosa");
                setDeleteModal({ isOpen: false, id: null, name: "" });
                fetchAdvisors();
            }
        } catch (err) {
            console.error("LOG: Error inesperado en el catch:", err);
        }
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center">Cargando ranking...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-outfit">Ranking de Asesores</h1>
                    <p className="text-muted-foreground">Rendimiento basado en el sistema de puntuación Mabō OS.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="h-4 w-4" /> Añadir Asesor
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="col-span-2 space-y-4">
                    {advisors.length === 0 ? (
                        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/20">
                            <p className="text-muted-foreground mb-4">No hay asesores registrados aún.</p>
                        </div>
                    ) : (
                        advisors.map((advisor, index) => (
                            <div
                                key={advisor.id}
                                className="flex items-center justify-between p-6 rounded-xl border border-border bg-card/30 glass group hover:border-primary/50 transition-all"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <div className={cn(
                                            "h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg",
                                            index === 0 ? "bg-amber-500/20 text-amber-500" :
                                                index === 1 ? "bg-slate-300/20 text-slate-300" :
                                                    index === 2 ? "bg-orange-600/20 text-orange-600" : "bg-white/5 text-muted-foreground"
                                        )}>
                                            {index === 0 ? <Trophy className="h-6 w-6" /> : index + 1}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg">{advisor.name}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <UserIcon className="h-3 w-3" /> +{advisor.phone}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-2xl font-black tracking-tighter text-primary">
                                            {advisor.score} <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest ml-1">pts</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDeleteModal({ isOpen: true, id: advisor.id, name: advisor.name })}
                                        className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                        title="Eliminar Asesor"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card/30 p-6 glass">
                        <h2 className="text-xl font-bold font-outfit mb-6">Reglas de Puntos</h2>
                        <div className="space-y-4">
                            <RuleItem label="Cierre de Venta" points="+10" color="text-emerald-500" />
                            <RuleItem label="Cita Agendada" points="+5" color="text-emerald-400" />
                            <RuleItem label="Contacto < 15m" points="+2" color="text-emerald-300" />
                            <RuleItem label="SLA Fallido (Sin Intento)" points="-5" color="text-rose-500" />
                            <RuleItem label="SLA Fallido (Con Intento)" points="-2" color="text-rose-400" />
                            <RuleItem label="Reasignación Forzada" points="-10" color="text-rose-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Añadir Asesor */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative">
                        <button
                            onClick={() => {
                                setIsAddModalOpen(false);
                                setRegistrationStep(1);
                                setOtpPin("");
                            }}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/5 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <h2 className="text-2xl font-bold font-outfit mb-2">Añadir Nuevo Asesor</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            {registrationStep === 1
                                ? "Ingresa los datos para enviar el código de verificación."
                                : `Ingresa el PIN enviado a +${newAdvisor.countryCode}${newAdvisor.phone}`}
                        </p>

                        {registrationStep === 1 ? (
                            <form onSubmit={handleAddAdvisor} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                                    <input
                                        required
                                        type="text"
                                        value={newAdvisor.name}
                                        onChange={(e) => setNewAdvisor({ ...newAdvisor, name: e.target.value })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        placeholder="Ej: Mario Bustamante"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">WhatsApp</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={newAdvisor.countryCode}
                                            onChange={(e) => setNewAdvisor({ ...newAdvisor, countryCode: e.target.value })}
                                            className="bg-background border border-border rounded-xl px-2 py-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm font-mono w-28"
                                        >
                                            {countryCodes.map((c) => (
                                                <option key={c.code} value={c.code}>
                                                    {c.label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            required
                                            type="text"
                                            value={newAdvisor.phone}
                                            onChange={(e) => setNewAdvisor({ ...newAdvisor, phone: e.target.value })}
                                            className="flex-1 bg-background border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                            placeholder="Ej: 9842073085"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">Selecciona el código y escribe el número sin el símbolo +.</p>
                                </div>

                                <button
                                    disabled={isProcessing}
                                    type="submit"
                                    className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl mt-4 hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? "Enviando..." : "Enviar PIN de Verificación"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground text-center block">Código PIN (6 dígitos)</label>
                                    <input
                                        required
                                        type="text"
                                        maxLength={6}
                                        value={otpPin}
                                        onChange={(e) => setOtpPin(e.target.value.replace(/\D/g, ""))}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-4 text-center text-3xl font-black tracking-[1em] focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        placeholder="000000"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <button
                                        disabled={isProcessing}
                                        type="submit"
                                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isProcessing ? "Verificando..." : "Verificar y Registrar"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRegistrationStep(1)}
                                        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Volver a editar datos
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 text-center">
                        <div className="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold font-outfit mb-2">¿Eliminar asesor?</h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            Estás a punto de eliminar a <b>{deleteModal.name}</b>. Esta acción borrará también todo su historial de puntos y asignaciones.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
                                className="flex-1 px-4 py-2 rounded-xl border border-border hover:bg-white/5 transition-all text-sm font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteAdvisor}
                                className="flex-1 px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-all text-sm font-bold"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function RuleItem({ label, points, color }: { label: string, points: string, color: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn("font-bold font-mono", color)}>{points}</span>
        </div>
    );
}
