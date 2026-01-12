"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
    Trophy,
    User as UserIcon,
    Plus,
    Trash2,
    X,
    Users,
    Settings2,
    LayoutGrid,
    List as ListIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdvisorConfigPanel from "@/components/advisors/advisor-config-panel";

interface Advisor {
    id: string | number;
    name: string;
    phone: string;
    score: number;
    status: string;
    availability_started_at: string | null;
    availability_expires_at: string | null;
    created_at: string;
}

export default function AdvisorsPage() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [activeTab, setActiveTab] = useState<'directory' | 'config'>('directory');
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAdvisor, setNewAdvisor] = useState({ name: "", countryCode: "52", phone: "" });
    const [registrationStep, setRegistrationStep] = useState<1 | 2>(1);
    const [otpPin, setOtpPin] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Detectar si es móvil para cambiar la vista por defecto
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 1024) {
                setViewMode('grid');
            } else {
                setViewMode('list');
            }
        };
        
        // Check inicial
        checkMobile();
        
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const countryCodes = [
        { code: "52", label: "🇲🇽 +52", name: "México" },
        { code: "1", label: "🇺🇸 +1", name: "USA" },
        { code: "34", label: "🇪🇸 +34", name: "España" },
        { code: "57", label: "🇨🇴 +57", name: "Colombia" },
        { code: "54", label: "🇦🇷 +54", name: "Argentina" },
        { code: "56", label: "🇨🇱 +56", name: "Chile" },
        { code: "51", label: "🇵🇪 +51", name: "Perú" },
    ];

    const fetchAdvisors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/api/advisors`);
            if (res.ok) {
                const data = await res.json();
                setAdvisors(data);
            }
        } catch (error) {
            console.error('Error fetching advisors:', error);
        }
        setLoading(false);
    }, [apiUrl]);

    useEffect(() => {
        if (activeTab === 'directory') {
            fetchAdvisors();
        }

        const channel = supabase
            .channel('public:advisors')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'advisors' }, () => {
                if (activeTab === 'directory') fetchAdvisors();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTab, fetchAdvisors]);

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
            const response = await fetch(`${apiUrl}/api/advisors/request-otp`, {
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
            const response = await fetch(`${apiUrl}/api/advisors/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: fullPhone, otp: otpPin, name: newAdvisor.name }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al verificar OTP");
            }

            alert("Asesor registrado exitosamente");
            setIsAddModalOpen(false);
            setRegistrationStep(1);
            setNewAdvisor({ name: "", countryCode: "52", phone: "" });
            setOtpPin("");
            fetchAdvisors();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteAdvisor = async () => {
        if (!deleteModal.id) return;
        setIsProcessing(true);
        try {
            const response = await fetch(`${apiUrl}/api/advisors/${deleteModal.id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Error al eliminar asesor");

            setDeleteModal({ isOpen: false, id: null, name: "" });
            fetchAdvisors();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading && activeTab === 'directory') {
        return <div className="flex h-full items-center justify-center">Cargando ranking...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-outfit">Gestión de Equipo</h1>
                    <p className="text-muted-foreground">Administra tus asesores y sus reglas de operación.</p>
                </div>
                
                <div className="flex p-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                            activeTab === 'directory' 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <Users className="h-4 w-4" />
                        Directorio
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                            activeTab === 'config' 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <Settings2 className="h-4 w-4" />
                        Configuración Operativa
                    </button>
                </div>

                {activeTab === 'directory' && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-sm h-10">
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all h-8 w-8 flex items-center justify-center",
                                    viewMode === 'list' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                                title="Vista de Lista"
                            >
                                <ListIcon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all h-8 w-8 flex items-center justify-center",
                                    viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                                title="Vista de Tarjetas"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 h-10"
                        >
                            <Plus className="h-4 w-4" /> Añadir Asesor
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'config' ? (
                <AdvisorConfigPanel />
            ) : (
                <div className={cn(
                    viewMode === 'list' 
                        ? "space-y-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0" // Scroll horizontal en móvil
                        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                )}>
                    {advisors.length === 0 ? (
                        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/20 col-span-full">
                            <p className="text-muted-foreground mb-4">No hay asesores registrados aún.</p>
                        </div>
                    ) : (
                        advisors.map((advisor, index) => {
                            const isAvailable = advisor.status === 'available';
                            const expiresAt = advisor.availability_expires_at ? new Date(advisor.availability_expires_at) : null;
                            const isExpired = expiresAt && expiresAt < new Date();
                            
                            if (viewMode === 'list') {
                                return (
                                    <div
                                        key={advisor.id}
                                        className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-8 p-6 rounded-xl border border-border bg-card/30 glass group hover:border-primary/50 transition-all min-w-[800px]"
                                    >
                                        {/* Ranking Avatar */}
                                        <div className="relative">
                                            <div className={cn(
                                                "h-14 w-14 rounded-full flex items-center justify-center font-bold text-lg relative",
                                                index === 0 ? "bg-amber-500/20 text-amber-500" :
                                                    index === 1 ? "bg-slate-300/20 text-slate-300" :
                                                        index === 2 ? "bg-orange-600/20 text-orange-600" : "bg-white/5 text-muted-foreground"
                                            )}>
                                                {index === 0 ? <Trophy className="h-6 w-6" /> : index + 1}
                                                
                                                {/* Status Indicator Dot */}
                                                <div className={cn(
                                                    "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0a0a0a]",
                                                    isAvailable && !isExpired ? "bg-emerald-500 animate-pulse" : "bg-rose-500/50"
                                                )} />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <h3 className="font-bold text-lg text-white">{advisor.name}</h3>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                                <UserIcon className="h-3.5 w-3.5" />
                                                <span>+{advisor.phone}</span>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="min-w-[120px]">
                                            {isAvailable && !isExpired ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Disponible
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-muted-foreground text-[11px] font-black uppercase tracking-wider border border-white/10">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                                    No disponible
                                                </span>
                                            )}
                                        </div>

                                        {/* Expiration */}
                                        <div className="min-w-[180px]">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                                                {isAvailable && !isExpired ? "Expira sesión" : "Última sesión"}
                                            </p>
                                            {isAvailable && expiresAt && !isExpired ? (
                                                <div className="text-sm font-medium text-emerald-500/90">
                                                    {expiresAt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })} • {expiresAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            ) : (
                                                <div className="text-sm font-medium text-muted-foreground/50">
                                                    -
                                                </div>
                                            )}
                                        </div>

                                        {/* Score */}
                                        <div className="text-right px-4 border-l border-white/5">
                                            <span className={cn(
                                                "text-2xl font-black font-outfit block leading-none",
                                                index === 0 ? "text-amber-500" : "text-primary"
                                            )}>
                                                {advisor.score}
                                            </span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PTS</span>
                                        </div>

                                        {/* Actions */}
                                        <button
                                            onClick={() => setDeleteModal({ isOpen: true, id: advisor.id, name: advisor.name })}
                                            className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Eliminar Asesor"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                );
                            } else {
                                // Card View (Grid)
                                return (
                                    <div
                                        key={advisor.id}
                                        className="flex flex-col gap-4 p-5 rounded-xl border border-border bg-card/30 glass group hover:border-primary/50 transition-all relative overflow-hidden"
                                    >
                                        {/* Top Section: Avatar & Score */}
                                        <div className="flex items-start justify-between">
                                            <div className="relative">
                                                <div className={cn(
                                                    "h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg relative",
                                                    index === 0 ? "bg-amber-500/20 text-amber-500" :
                                                        index === 1 ? "bg-slate-300/20 text-slate-300" :
                                                            index === 2 ? "bg-orange-600/20 text-orange-600" : "bg-white/5 text-muted-foreground"
                                                )}>
                                                    {index === 0 ? <Trophy className="h-5 w-5" /> : index + 1}
                                                </div>
                                                {/* Status Dot */}
                                                <div className={cn(
                                                    "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0a]",
                                                    isAvailable && !isExpired ? "bg-emerald-500 animate-pulse" : "bg-rose-500/50"
                                                )} />
                                            </div>

                                            <div className="text-right">
                                                <span className={cn(
                                                    "text-2xl font-black font-outfit block leading-none",
                                                    index === 0 ? "text-amber-500" : "text-primary"
                                                )}>
                                                    {advisor.score}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PTS</span>
                                            </div>
                                        </div>

                                        {/* Info Section */}
                                        <div>
                                            <h3 className="font-bold text-lg text-white truncate">{advisor.name}</h3>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                                <UserIcon className="h-3.5 w-3.5" />
                                                <span>+{advisor.phone}</span>
                                            </div>
                                        </div>

                                        {/* Status & Expiration */}
                                        <div className="space-y-3 pt-3 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Estado</span>
                                                {isAvailable && !isExpired ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Disp.
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 text-muted-foreground text-[10px] font-black uppercase tracking-wider border border-white/10">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                                                        No Disp.
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {isAvailable && !isExpired ? "Expira sesión" : "Última sesión"}
                                                </span>
                                                {isAvailable && expiresAt && !isExpired ? (
                                                    <div className="text-sm font-medium text-emerald-500/90 truncate">
                                                        {expiresAt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })} • {expiresAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm font-medium text-muted-foreground/50">
                                                        -
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <button
                                            onClick={() => setDeleteModal({ isOpen: true, id: advisor.id, name: advisor.name })}
                                            className="absolute top-4 right-1/2 translate-x-1/2 -translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 p-2 text-white bg-rose-500/80 hover:bg-rose-500 rounded-full shadow-lg backdrop-blur-sm transition-all duration-300"
                                            title="Eliminar Asesor"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            )}

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

