"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Sparkles, Loader2, TrendingUp, AlertTriangle, Upload, Send, Calendar as CalendarIcon, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function MarketingPage() {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    
    // Date Filters
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    // Chat State
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([
        { role: 'ai', content: 'Hola, soy tu asistente de marketing. Pregúntame sobre tus campañas, costos o rendimiento.' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // File inputs refs
    const campaignsInputRef = useRef<HTMLInputElement>(null);
    const adsetsInputRef = useRef<HTMLInputElement>(null);
    const adsInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<{
        campaigns: File | null;
        adsets: File | null;
        ads: File | null;
    }>({
        campaigns: null,
        adsets: null,
        ads: null,
    });
    const [syncResults, setSyncResults] = useState<{
        campaigns: boolean;
        adsets: boolean;
        ads: boolean;
        errors: string[];
    } | null>(null);
    const [analysis, setAnalysis] = useState<{
        summary: string;
        recommendations: Array<{ title: string; description: string; impact: string }>;
        alert?: string;
        error?: string;
    } | null>(null);

    const [summaryMetrics, setSummaryMetrics] = useState({
        totalSpend: 0,
        totalLeads: 0,
        costPerLead: 0,
        avgCtr: 0,
        totalImpressions: 0,
        totalClicks: 0,
        cpc: 0,
        cpm: 0
    });

    const fetchSummary = async (start?: string, end?: string) => {
        try {
            const params = new URLSearchParams();
            if (start) params.append('startDate', start);
            if (end) params.append('endDate', end);

            const response = await api.get(`/marketing/summary?${params.toString()}`);
            if (response.data) {
                setSummaryMetrics(response.data);
            }
        } catch (error) {
            console.error("Error fetching summary:", error);
        }
    };

    useEffect(() => {
        fetchSummary(dateRange.start, dateRange.end);
    }, [dateRange]);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMessage = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatInput('');
        setIsChatting(true);

        try {
            const response = await api.post('/marketing/chat', {
                question: userMessage,
                startDate: dateRange.start,
                endDate: dateRange.end
            });
            
            setChatMessages(prev => [...prev, { role: 'ai', content: response.data.answer }]);
        } catch (error) {
            console.error("Chat error:", error);
            setChatMessages(prev => [...prev, { role: 'ai', content: "Lo siento, hubo un error al procesar tu mensaje." }]);
        } finally {
            setIsChatting(false);
        }
    };

    const handleFileChange = (type: 'campaigns' | 'adsets' | 'ads', event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFiles(prev => ({
                ...prev,
                [type]: event.target.files![0]
            }));
        }
    };

    const handleUploadAndSync = async () => {
        if (!files.campaigns || !files.adsets || !files.ads) {
            toast({
                title: "Faltan Archivos",
                description: "Por favor selecciona los 3 archivos requeridos.",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        setSyncResults(null);

        const formData = new FormData();
        formData.append('campaigns', files.campaigns);
        formData.append('adsets', files.adsets);
        formData.append('ads', files.ads);

        try {
            const response = await api.post('/marketing/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setSyncResults(response.data.results);
                toast({
                    title: "Carga y Sincronización Completada",
                    description: "Archivos subidos y datos procesados correctamente.",
                });
                // Refresh summary metrics
                fetchSummary();
                
                // Clear inputs
                setFiles({ campaigns: null, adsets: null, ads: null });
                if (campaignsInputRef.current) campaignsInputRef.current.value = '';
                if (adsetsInputRef.current) adsetsInputRef.current.value = '';
                if (adsInputRef.current) adsInputRef.current.value = '';
            } else {
                toast({
                    title: "Error en Procesamiento",
                    description: response.data.error || "Hubo un problema al procesar los archivos.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast({
                title: "Error de Conexión",
                description: "No se pudo subir los archivos.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setAnalysis(null);
        try {
            const response = await api.get('/marketing/analyze');
            if (response.data.error) {
                toast({
                    title: "Error en Análisis",
                    description: response.data.error,
                    variant: "destructive",
                });
            } else {
                setAnalysis(response.data);
                toast({
                    title: "Análisis Completado",
                    description: "Se han generado nuevas recomendaciones.",
                });
            }
        } catch (error) {
            console.error("Analysis error:", error);
            toast({
                title: "Error de Conexión",
                description: "No se pudo generar el análisis.",
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Meta Analist</h1>
                    <p className="text-muted-foreground mt-2">
                        Análisis de rendimiento de campañas publicitarias.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                    <div className="flex items-center gap-2 mr-2 bg-card border rounded-md px-3 py-1.5 shadow-sm">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <input 
                            type="date" 
                            className="text-sm bg-transparent outline-none w-[110px]"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-muted-foreground">-</span>
                        <input 
                            type="date" 
                            className="text-sm bg-transparent outline-none w-[110px]"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    
                    <Button 
                        onClick={() => setShowUpload(!showUpload)} 
                        variant="outline"
                        className="gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        {showUpload ? 'Ocultar Carga' : 'Importar Datos'}
                    </Button>
                    <Button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {isAnalyzing ? 'Analizando...' : 'Generar Análisis IA'}
                    </Button>
                </div>
            </div>

            {/* Upload Section */}
            {showUpload && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Cargar Datos de Meta
                    </CardTitle>
                    <CardDescription>
                        Sube los reportes de Excel exportados desde Meta Ads Manager.
                        Necesitas los 3 archivos: Campañas, Conjuntos de Anuncios y Anuncios.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reporte de Campañas</label>
                            <input 
                                type="file" 
                                accept=".xlsx"
                                ref={campaignsInputRef}
                                onChange={(e) => handleFileChange('campaigns', e)}
                                className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-violet-50 file:text-violet-700
                                    hover:file:bg-violet-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reporte de Conjuntos</label>
                            <input 
                                type="file" 
                                accept=".xlsx"
                                ref={adsetsInputRef}
                                onChange={(e) => handleFileChange('adsets', e)}
                                className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-violet-50 file:text-violet-700
                                    hover:file:bg-violet-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reporte de Anuncios</label>
                            <input 
                                type="file" 
                                accept=".xlsx"
                                ref={adsInputRef}
                                onChange={(e) => handleFileChange('ads', e)}
                                className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-violet-50 file:text-violet-700
                                    hover:file:bg-violet-100"
                            />
                        </div>
                    </div>
                    <Button 
                        onClick={handleUploadAndSync} 
                        disabled={isUploading} 
                        className="w-full sm:w-auto"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Subiendo y Procesando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Subir y Sincronizar
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
            )}

            {/* Sync Results Status */}
            {syncResults && (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                        Estado de Archivos
                    </CardTitle>
                    <CardDescription>
                        Archivos procesados correctamente. Los datos se han almacenado en la base de datos local.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatusItem 
                            label="Campañas" 
                            status={syncResults ? (syncResults.campaigns ? 'success' : 'error') : 'idle'} 
                        />
                        <StatusItem 
                            label="Conjuntos de Anuncios" 
                            status={syncResults ? (syncResults.adsets ? 'success' : 'error') : 'idle'} 
                        />
                        <StatusItem 
                            label="Anuncios" 
                            status={syncResults ? (syncResults.ads ? 'success' : 'error') : 'idle'} 
                        />
                    </div>
                    {syncResults && syncResults.errors.length > 0 && (
                        <div className="mt-4 p-3 bg-rose-500/10 text-rose-600 rounded-lg text-sm">
                            <p className="font-medium flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Errores detectados:
                            </p>
                            <ul className="list-disc list-inside mt-1 ml-1">
                                {syncResults.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
            )}

            {/* Dashboard Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Gasto Total" 
                    value={`$${summaryMetrics.totalSpend.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                />
                <KPICard 
                    title="Leads Totales" 
                    value={summaryMetrics.totalLeads.toLocaleString('es-MX')} 
                />
                <KPICard 
                    title="Costo por Lead" 
                    value={`$${summaryMetrics.costPerLead.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                />
                <KPICard 
                    title="CTR Promedio" 
                    value={`${summaryMetrics.avgCtr.toFixed(2)}%`} 
                />
                <KPICard 
                    title="Impresiones Totales" 
                    value={summaryMetrics.totalImpressions.toLocaleString('es-MX')} 
                />
                <KPICard 
                    title="Clics Totales" 
                    value={summaryMetrics.totalClicks.toLocaleString('es-MX')} 
                />
                <KPICard 
                    title="CPC Promedio" 
                    value={`$${summaryMetrics.cpc.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                />
                <KPICard 
                    title="CPM Promedio" 
                    value={`$${summaryMetrics.cpm.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                />
            </div>

            {/* Analysis Results */}
            {analysis ? (
                <div className="space-y-6">
                    {/* Summary */}
                    <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100 dark:from-purple-950/20 dark:to-indigo-950/20 dark:border-purple-900">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                                <Sparkles className="h-5 w-5" />
                                Resumen Ejecutivo IA
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg leading-relaxed">{analysis.summary}</p>
                        </CardContent>
                    </Card>

                    {/* Alerts if any */}
                    {analysis.alert && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200">
                            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-semibold">Atención Requerida</h4>
                                <p>{analysis.alert}</p>
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    <div>
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            Recomendaciones Estratégicas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {analysis.recommendations.map((rec, i) => (
                                <Card key={i} className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                rec.impact === 'Alto' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                                                rec.impact === 'Medio' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                Impacto {rec.impact}
                                            </span>
                                        </div>
                                        <CardTitle className="text-base">{rec.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground flex-grow">
                                        {rec.description}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-muted/50 rounded-xl p-12 text-center border-2 border-dashed flex flex-col items-center justify-center gap-4">
                    <div className="bg-background p-4 rounded-full shadow-sm">
                        <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="max-w-md">
                        <h3 className="text-lg font-semibold mb-2">Análisis Inteligente</h3>
                        <p className="text-muted-foreground">
                            Sincroniza tus datos y genera un análisis potenciado por IA para obtener insights accionables sobre tus campañas.
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
                        {isAnalyzing ? 'Analizando...' : 'Generar Análisis Ahora'}
                    </Button>
                </div>
            )}
            {/* AI Chat Assistant */}
            <Card className="h-[600px] flex flex-col border-2 border-purple-100 dark:border-purple-900/50 shadow-lg">
                <CardHeader className="bg-purple-50/50 dark:bg-purple-900/10">
                    <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                        <MessageSquare className="h-5 w-5" />
                        Asistente de Marketing IA
                    </CardTitle>
                    <CardDescription>
                        Consulta detalles específicos sobre tus campañas o pide consejos estratégicos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4 min-h-0 p-4">
                    <div 
                        ref={chatScrollRef}
                        className="flex-1 overflow-y-auto space-y-4 pr-2"
                    >
                        {chatMessages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div 
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-purple-600 text-white rounded-tr-none' 
                                            : 'bg-white dark:bg-slate-800 border rounded-tl-none'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isChatting && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border shadow-sm rounded-2xl rounded-tl-none px-4 py-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <form onSubmit={handleChatSubmit} className="flex gap-2 pt-2 border-t">
                        <input 
                            className="flex-1 px-4 py-2 rounded-full border bg-background focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            placeholder="Ej: ¿Cuál es la campaña con mejor rendimiento este mes?"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                        />
                        <Button type="submit" size="icon" className="rounded-full bg-purple-600 hover:bg-purple-700" disabled={isChatting || !chatInput.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function StatusItem({ label, status }: { label: string, status: 'idle' | 'success' | 'error' }) {
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
            <span className="font-medium">{label}</span>
            {status === 'idle' && <span className="text-muted-foreground text-sm">-</span>}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-rose-500" />}
        </div>
    );
}

function KPICard({ title, value }: { title: string, value: string }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}
