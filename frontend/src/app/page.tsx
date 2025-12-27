"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Activity,
  ArrowUpRight,
  Trophy,
  Calendar,
  Sparkles,
  Zap,
  Target,
  ChevronRight,
  RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Home() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    topAdvisors: [] as any[],
    recentEvents: [] as any[],
    loading: true,
    lastUpdate: new Date()
  });

  const [greeting, setGreeting] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setStats(prev => ({ ...prev, loading: prev.totalLeads === 0 }));
      
      // 1. Total Leads
      const { count: leadCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // 2. Top Advisors
      const { data: topAdvisors } = await supabase
        .from('advisors')
        .select('*')
        .order('score', { ascending: false })
        .limit(3);

      // 3. Recent Events
      const { data: recentEvents } = await supabase
        .from('events')
        .select(`
          *,
          leads(name),
          advisors(name)
        `)
        .order('created_at', { ascending: false })
        .limit(6);

      setStats({
        totalLeads: leadCount || 0,
        topAdvisors: topAdvisors || [],
        recentEvents: (recentEvents || []).map(e => ({
          ...e,
          leadName: e.leads?.name,
          advisorName: e.advisors?.name,
          time: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date(e.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })
        })),
        loading: false,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Buenos días");
    else if (hour < 18) setGreeting("Buenas tardes");
    else setGreeting("Buenas noches");

    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (stats.loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold font-outfit tracking-tight">Iniciando Control Tower</p>
            <p className="text-sm text-muted-foreground mt-1">Sincronizando flujos de trabajo...</p>
          </div>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-8 md:p-12 border border-white/10 shadow-2xl"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Sistema Operativo v2.1</span>
              <span className="h-1 w-1 rounded-full bg-primary/30" />
              <span className="text-[10px] font-bold text-primary/70">LIVE</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tight font-outfit leading-none">
              {greeting},<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40">
                Comandante
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-medium leading-relaxed">
              Mabo OS está operando a máxima capacidad. Hemos procesado <span className="text-white font-bold">{stats.totalLeads} leads</span> con una eficiencia del <span className="text-primary font-bold">98.2%</span>.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={fetchData}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-bold hover:scale-105 transition-all shadow-lg shadow-white/10"
              >
                <RefreshCcw className="h-4 w-4" />
                Actualizar Datos
              </button>
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">Última sync: {format(stats.lastUpdate, 'HH:mm')}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-700" />
            <div className="relative h-64 w-64 rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-2xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <Target className="h-32 w-32 text-primary/20 absolute -right-8 -bottom-8" />
              <div className="flex flex-col items-center gap-2 text-center z-10">
                <Zap className="h-12 w-12 text-primary animate-bounce" />
                <p className="text-3xl font-black font-outfit">ACTIVO</p>
                <p className="text-xs font-bold text-primary tracking-[0.2em]">HIGH PERFORMANCE</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 h-96 w-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 bg-primary/5 rounded-full blur-[100px]" />
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Leads Totales"
          value={stats.totalLeads.toLocaleString()}
          change="+12.5%"
          icon={Users}
          color="blue"
          delay={0.1}
        />
        <StatCard
          title="Tasa de Cierre"
          value="24.5%"
          change="+4.2%"
          icon={TrendingUp}
          color="emerald"
          delay={0.2}
        />
        <StatCard
          title="Cumplimiento SLA"
          value="98.2%"
          change="+0.5%"
          icon={CheckCircle2}
          color="purple"
          delay={0.3}
        />
        <StatCard
          title="Tiempo Respuesta"
          value="12m"
          change="-2m"
          icon={Clock}
          color="orange"
          delay={0.4}
        />
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Activity Feed */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-8 rounded-[2rem] border border-white/5 bg-card/20 p-8 glass-dark overflow-hidden relative"
        >
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Activity className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight font-outfit">Flujo de Operaciones</h2>
                <p className="text-sm text-muted-foreground font-medium">Actividad del sistema en tiempo real</p>
              </div>
            </div>
            <button className="h-10 px-4 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2">
              Ver Historial <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-8 relative z-10">
            {/* Timeline Line */}
            <div className="absolute left-[27px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary via-primary/20 to-transparent" />
            
            <AnimatePresence mode="popLayout">
              {stats.recentEvents.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-6"
                >
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full bg-white/5 animate-ping absolute inset-0" />
                    <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center relative border border-white/10">
                      <Sparkles className="h-10 w-10 opacity-20" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">Sin actividad reciente</p>
                    <p className="text-sm">Esperando señales de la red...</p>
                  </div>
                </motion.div>
              ) : (
                stats.recentEvents.map((event, idx) => (
                  <motion.div 
                    key={`${event.id}-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative pl-16 group"
                  >
                    {/* Dot */}
                    <div className="absolute left-0 top-1 h-14 w-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center z-10 group-hover:border-primary transition-all duration-500 shadow-xl group-hover:shadow-primary/20">
                      <div className="h-3 w-3 rounded-full bg-primary group-hover:scale-150 transition-transform shadow-lg shadow-primary/50" />
                    </div>
                    
                    <div className="flex flex-col gap-2 p-6 rounded-3xl bg-white/0 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-xl text-white tracking-tight">{event.type}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
                            Completado
                          </span>
                        </div>
                        <span className="text-xs font-bold bg-white/5 text-muted-foreground px-3 py-1.5 rounded-xl border border-white/5">
                          {event.time}
                        </span>
                      </div>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        El lead <span className="text-white font-bold">{event.leadName || 'Lead'}</span> ha sido procesado por el equipo de <span className="text-primary font-bold">Ventas</span>.
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-tighter">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span>Responsable: {event.advisorName || 'Sistema'}</span>
                        </div>
                        <div className="h-1 w-1 rounded-full bg-white/20" />
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{event.date}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Top Performers */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-4 space-y-6"
        >
          <div className="rounded-[2rem] border border-white/5 bg-card/20 p-8 glass-dark h-full">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner shadow-amber-500/10">
                  <Trophy className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight font-outfit">Líderes</h2>
                  <p className="text-sm text-muted-foreground font-medium">Top performance mensual</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {stats.topAdvisors.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground font-medium italic">
                  Sin datos de rendimiento.
                </div>
              ) : (
                stats.topAdvisors.map((advisor, i) => (
                  <motion.div 
                    key={advisor.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className={cn(
                      "flex items-center justify-between p-6 rounded-[1.5rem] border transition-all duration-500 group relative overflow-hidden",
                      i === 0 
                        ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 shadow-lg shadow-amber-500/5" 
                        : "bg-white/5 border-white/5 hover:border-primary/20"
                    )}
                  >
                    {i === 0 && (
                      <div className="absolute -right-4 -top-4 h-16 w-16 bg-amber-500/10 blur-2xl rounded-full" />
                    )}
                    
                    <div className="flex items-center gap-5 relative z-10">
                      <div className={cn(
                        "h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl transition-all duration-500 group-hover:rotate-12",
                        i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-black" : 
                        i === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black" : 
                        "bg-gradient-to-br from-amber-700 to-amber-900 text-white"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-black text-xl leading-none tracking-tight">{advisor.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Senior
                          </span>
                          <div className="h-1 w-1 rounded-full bg-white/20" />
                          <div className="flex items-center gap-1 text-emerald-500">
                            <ArrowUpRight className="h-3 w-3" />
                            <span className="text-[10px] font-black">98%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right relative z-10">
                      <p className={cn(
                        "text-3xl font-black tabular-nums font-outfit leading-none",
                        i === 0 ? "text-amber-500" : "text-primary"
                      )}>
                        {advisor.score}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Puntos</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-10 p-6 rounded-[1.5rem] bg-primary/5 border border-primary/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="h-8 w-8" />
              </div>
              <p className="text-sm font-bold text-center text-muted-foreground italic leading-relaxed relative z-10">
                "El éxito es la suma de pequeños esfuerzos repetidos día tras día."
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, change, icon: Icon, color = "blue", delay = 0 }: any) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-purple-500/5",
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-orange-500/5",
  };

  const isPositive = change.startsWith("+");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="group rounded-[2rem] border border-white/5 bg-card/20 p-7 glass-dark transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 relative overflow-hidden"
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className={cn(
          "h-16 w-16 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl", 
          colors[color]
        )}>
          <Icon className="h-8 w-8" />
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black tracking-tight",
          isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
        )}>
          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />}
          {change}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</p>
        <div className="flex items-baseline gap-1 mt-2">
          <p className="text-5xl font-black tracking-tighter font-outfit tabular-nums">{value}</p>
        </div>
      </div>
      
      <div className="mt-6 h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "70%" }}
          transition={{ delay: delay + 0.5, duration: 1.5, ease: "easeOut" }}
          className={cn("h-full rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]", 
            color === 'blue' ? 'bg-blue-500' : 
            color === 'emerald' ? 'bg-emerald-500' : 
            color === 'purple' ? 'bg-purple-500' : 'bg-orange-500'
          )} 
        />
      </div>
    </motion.div>
  );
}

